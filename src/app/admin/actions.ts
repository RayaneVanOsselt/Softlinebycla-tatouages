"use server";

/**
 * Actions serveur de l'administration. Chaque action vérifie la session (requireAdmin) :
 * aucune n'est accessible sans être connectée. Les Server Actions Next.js vérifient aussi l'origine (CSRF).
 */
import { and, asc, eq, gte, inArray, lte, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { consumeLoginToken, requestLoginLink, requireAdmin, signOut } from "@/lib/auth/session";
import {
  acceptBooking,
  BookingError,
  cancelBooking,
  clearBusyCache,
  completeBooking,
  declineBooking,
  proposeReschedule,
  updateAdminNotes,
} from "@/lib/booking/service";
import { adminEmails, bookingConfig, googleConfig } from "@/lib/config";
import { getDb } from "@/lib/db";
import {
  availabilitySlots,
  blockedPeriods,
  bookingAttachments,
  bookings,
  categories,
  contactMessages,
  jobs,
  media,
  projects,
  type Localized,
} from "@/lib/db/schema";
import { emails } from "@/lib/email/templates";
import { sendEmail, verifySmtp } from "@/lib/email/transport";
import { listBusyIntervals } from "@/lib/google/calendar";
import { rebuildSheet } from "@/lib/google/sheets";
import { enqueueBookingSync } from "@/lib/jobs/queue";
import { drainJobs, processJobs, retryJobs } from "@/lib/jobs/processor";
import { logger } from "@/lib/logger";
import { runMaintenance } from "@/lib/maintenance";
import { clientIp, rateLimit } from "@/lib/security/request";
import { saveSetting, type SettingKey } from "@/lib/settings";
import { addDays, daysInMonth, hmToMinute, isDateKey, slotStartMinutes, zonedToUtc } from "@/lib/time";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const fail = (error: unknown): ActionResult => {
  if (error instanceof BookingError) return { ok: false, error: error.message !== error.code ? error.message : bookingErrorFr[error.code] ?? error.code };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" · ") };
  logger.error("admin.action_failed", { error });
  return { ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
};

const bookingErrorFr: Record<string, string> = {
  CONFLICT: "Conflit avec une autre réservation, une période bloquée ou Google Agenda.",
  OUTSIDE_RANGE: "Hors de la plage horaire autorisée.",
  INVALID_TRANSITION: "Action impossible dans l'état actuel de la réservation.",
  NOT_FOUND: "Réservation introuvable.",
  TOO_SOON: "Ce créneau est déjà passé.",
  INVALID: "Valeur invalide.",
};

const revalidatePublic = () => revalidatePath("/", "layout");

/* ───────────────────────────── Connexion ───────────────────────────── */

export async function requestLoginAction(_prev: unknown, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const h = await headers();
  if (!(await rateLimit(`admin-login:${clientIp(h)}`, 5, 15 * 60))) return { status: "rate-limited" as const };
  if (!z.email().safeParse(email).success) return { status: "invalid" as const };
  if (adminEmails().length === 0) return { status: "no-admin" as const };
  const res = await requestLoginLink(email);
  return res;
}

export async function verifyLoginAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  const ok = token ? await consumeLoginToken(token) : false;
  redirect(ok ? "/admin" : "/admin/connexion?erreur=lien");
}

export async function signOutAction() {
  await signOut();
  redirect("/admin/connexion");
}

/* ───────────────────────────── Réservations ───────────────────────────── */

const afterSync = (bookingId: string) => after(() => processJobs({ bookingId }).catch((error) => logger.error("jobs.after_failed", { error })));

export async function acceptBookingAction(id: string, input: { durationMinutes: number; message?: string }): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    await acceptBooking(id, { durationMinutes: input.durationMinutes, message: input.message, actor: s.email });
    afterSync(id);
    revalidatePath(`/admin/reservations/${id}`);
    return { ok: true, message: "Rendez-vous confirmé. E-mail de confirmation mis en envoi (état visible dans « E-mails & synchronisation »)." };
  } catch (e) {
    return fail(e);
  }
}

export async function declineBookingAction(id: string, input: { message?: string }): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    await declineBooking(id, { message: input.message, actor: s.email });
    afterSync(id);
    revalidatePath(`/admin/reservations/${id}`);
    return { ok: true, message: "Demande refusée, créneau libéré. E-mail au client mis en envoi." };
  } catch (e) {
    return fail(e);
  }
}

export async function proposeBookingAction(id: string, input: { date: string; start: string; durationMinutes: number; message?: string }): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    if (!isDateKey(input.date)) throw new BookingError("INVALID", "Date invalide.");
    await proposeReschedule(id, { date: input.date, startMinute: hmToMinute(input.start), durationMinutes: input.durationMinutes, message: input.message, actor: s.email });
    afterSync(id);
    revalidatePath(`/admin/reservations/${id}`);
    return { ok: true, message: "Proposition mise en envoi. Le rendez-vous ne sera confirmé que si le client l'accepte." };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelBookingAction(id: string, input: { message?: string; notify: boolean }): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    await cancelBooking(id, { message: input.message, notify: input.notify, actor: s.email });
    afterSync(id);
    revalidatePath(`/admin/reservations/${id}`);
    return { ok: true, message: input.notify ? "Réservation annulée. E-mail au client mis en envoi." : "Réservation annulée (client non prévenu)." };
  } catch (e) {
    return fail(e);
  }
}

export async function completeBookingAction(id: string): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    await completeBooking(id, { actor: s.email });
    afterSync(id);
    revalidatePath(`/admin/reservations/${id}`);
    return { ok: true, message: "Rendez-vous marqué comme terminé." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveNotesAction(id: string, notes: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await updateAdminNotes(id, notes.slice(0, 5000));
    afterSync(id);
    revalidatePath(`/admin/reservations/${id}`);
    return { ok: true, message: "Note enregistrée." };
  } catch (e) {
    return fail(e);
  }
}

export async function resyncBookingAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await enqueueBookingSync(db, id);
  await retryJobs({ ids: (await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.bookingId, id))).map((j) => j.id) });
  const r = await processJobs({ bookingId: id });
  revalidatePath(`/admin/reservations/${id}`);
  return { ok: true, message: `Synchronisation relancée (${r.done} réussie(s), ${r.failed} échec(s), ${r.skipped} non configurée(s)).` };
}

export async function deleteAttachmentAction(id: string, bookingId: string): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(bookingAttachments).where(eq(bookingAttachments.id, id));
  revalidatePath(`/admin/reservations/${bookingId}`);
  return { ok: true, message: "Image supprimée." };
}

/* ───────────────────────────── Disponibilités ───────────────────────────── */

export interface AdminDay {
  date: string;
  open: number[];
  bookings: Array<{ id: string; start: string; end: string; status: string; name: string }>;
  blocked: Array<{ id: string; start: string; end: string; reason: string | null }>;
}

export async function getAdminMonthAction(month: string): Promise<{ days: AdminDay[]; slots: number[] }> {
  await requireAdmin();
  const db = await getDb();
  const dates = daysInMonth(month);
  const from = zonedToUtc(dates[0]!, 0);
  const to = zonedToUtc(addDays(dates[dates.length - 1]!, 1), 0);
  const [open, bks, blocks] = await Promise.all([
    db.select().from(availabilitySlots).where(and(gte(availabilitySlots.date, dates[0]!), lte(availabilitySlots.date, dates[dates.length - 1]!))),
    db
      .select({ id: bookings.id, startAt: bookings.startAt, endAt: bookings.endAt, status: bookings.status, firstName: bookings.firstName, lastName: bookings.lastName })
      .from(bookings)
      .where(and(inArray(bookings.status, ["PENDING", "RESCHEDULE_PROPOSED", "CONFIRMED", "COMPLETED"]), sql`${bookings.startAt} < ${to.toISOString()}`, sql`${bookings.endAt} > ${from.toISOString()}`))
      .orderBy(asc(bookings.startAt)),
    db.select().from(blockedPeriods).where(and(sql`${blockedPeriods.startAt} < ${to.toISOString()}`, sql`${blockedPeriods.endAt} > ${from.toISOString()}`)),
  ]);
  const fmt = (d: Date) => new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: bookingConfig.timezone }).format(d);
  const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: bookingConfig.timezone }).format(d);
  const days: AdminDay[] = dates.map((date) => {
    const dayStart = zonedToUtc(date, 0).getTime();
    const dayEnd = zonedToUtc(addDays(date, 1), 0).getTime();
    return {
      date,
      open: open.filter((o) => o.date === date).map((o) => o.startMinute).sort((a, b) => a - b),
      bookings: bks
        .filter((b) => dayOf(b.startAt) === date)
        .map((b) => ({ id: b.id, start: fmt(b.startAt), end: fmt(b.endAt), status: b.status, name: `${b.firstName} ${b.lastName.charAt(0)}.` })),
      blocked: blocks
        .filter((p) => p.startAt.getTime() < dayEnd && p.endAt.getTime() > dayStart)
        .map((p) => ({ id: p.id, start: p.startAt.toISOString(), end: p.endAt.toISOString(), reason: p.reason })),
    };
  });
  return { days, slots: slotStartMinutes() };
}

const availabilitySchema = z.object({
  dates: z.array(z.string().refine(isDateKey)).min(1).max(120),
  minutes: z.array(z.number().int()).max(48),
  mode: z.enum(["replace", "add", "remove"]),
});

/** Ouvre / ferme des créneaux sur un ou plusieurs jours (aucune règle hebdomadaire imposée). */
export async function setAvailabilityAction(input: z.infer<typeof availabilitySchema>): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    const { dates, minutes, mode } = availabilitySchema.parse(input);
    const allowed = new Set(slotStartMinutes());
    const valid = minutes.filter((m) => allowed.has(m));
    const db = await getDb();
    await db.transaction(async (tx) => {
      if (mode === "replace") await tx.delete(availabilitySlots).where(inArray(availabilitySlots.date, dates));
      if (mode === "remove") {
        if (valid.length) await tx.delete(availabilitySlots).where(and(inArray(availabilitySlots.date, dates), inArray(availabilitySlots.startMinute, valid)));
        return;
      }
      const rows = dates.flatMap((date) => valid.map((startMinute) => ({ date, startMinute, updatedBy: s.email })));
      if (rows.length) await tx.insert(availabilitySlots).values(rows).onConflictDoNothing();
    });
    clearBusyCache();
    return { ok: true, message: `${dates.length} jour(s) mis à jour.` };
  } catch (e) {
    return fail(e);
  }
}

const blockSchema = z.object({
  startDate: z.string().refine(isDateKey),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endDate: z.string().refine(isDateKey),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(200).optional(),
});

export async function addBlockedPeriodAction(input: z.infer<typeof blockSchema>): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    const v = blockSchema.parse(input);
    const start = zonedToUtc(v.startDate, hmToMinute(v.startTime));
    const end = zonedToUtc(v.endDate, hmToMinute(v.endTime));
    if (end <= start) return { ok: false, error: "La fin doit être après le début." };
    const db = await getDb();
    await db.insert(blockedPeriods).values({ startAt: start, endAt: end, reason: v.reason?.trim() || null, createdBy: s.email });
    return { ok: true, message: "Période bloquée ajoutée." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBlockedPeriodAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(blockedPeriods).where(eq(blockedPeriods.id, id));
  return { ok: true, message: "Période supprimée." };
}

/* ───────────────────────────── Portfolio ───────────────────────────── */

const localized = z.object({ fr: z.string().max(4000).default(""), nl: z.string().max(4000).default(""), en: z.string().max(4000).default("") });
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const projectSchema = z.object({
  slug: z.string().max(80).default(""),
  title: localized.refine((v) => v.fr.trim().length > 0, { message: "Titre français obligatoire" }),
  description: localized,
  categoryId: z.string().uuid().nullable(),
  year: z.number().int().min(1990).max(2100).nullable(),
  featured: z.boolean(),
  published: z.boolean(),
});

export async function saveProjectAction(id: string | null, input: z.infer<typeof projectSchema>): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  try {
    const v = projectSchema.parse(input);
    const slug = slugify(v.slug || v.title.fr) || `projet-${Date.now()}`;
    const db = await getDb();
    const values = { slug, title: v.title as Localized, description: v.description as Localized, categoryId: v.categoryId, year: v.year, featured: v.featured, published: v.published, updatedAt: new Date() };
    let projectId = id;
    if (id) {
      await db.update(projects).set(values).where(eq(projects.id, id));
    } else {
      const [{ value }] = (await db.select({ value: max(projects.sortOrder) }).from(projects)) as [{ value: number | null }];
      const [row] = await db.insert(projects).values({ ...values, sortOrder: (value ?? 0) + 1 }).returning({ id: projects.id });
      projectId = row!.id;
    }
    revalidatePublic();
    revalidatePath("/admin/portfolio");
    return { ok: true, message: "Projet enregistré.", id: projectId! };
  } catch (e) {
    if (String((e as { cause?: { code?: string } })?.cause?.code ?? (e as { code?: string }).code) === "23505") return { ok: false, error: "Cette adresse (slug) est déjà utilisée par un autre projet." };
    return fail(e);
  }
}

export async function toggleProjectAction(id: string, field: "featured" | "published", value: boolean): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.update(projects).set({ [field]: value, updatedAt: new Date() }).where(eq(projects.id, id));
  revalidatePublic();
  revalidatePath("/admin/portfolio");
  return { ok: true };
}

export async function reorderProjectsAction(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(projects).set({ sortOrder: i }).where(eq(projects.id, id));
  });
  revalidatePublic();
  revalidatePath("/admin/portfolio");
  return { ok: true, message: "Ordre enregistré." };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  const files = await db.select({ key: media.storageKey }).from(media).where(eq(media.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
  await deleteBlobs(files.map((f) => f.key).filter((k): k is string => Boolean(k)));
  revalidatePublic();
  revalidatePath("/admin/portfolio");
  return { ok: true, message: "Projet supprimé." };
}

async function deleteBlobs(urls: string[]) {
  if (!urls.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(urls);
  } catch (error) {
    logger.warn("blob.delete_failed", { error });
  }
}

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().max(1000).refine((u) => u.startsWith("/uploads/") || u.startsWith("/portfolio/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(u), "URL de média non autorisée"),
  posterUrl: z.string().max(1000).nullable(),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  blurDataUrl: z.string().max(4000).nullable(),
});

export async function addMediaAction(projectId: string, input: z.infer<typeof mediaSchema>): Promise<ActionResult> {
  await requireAdmin();
  try {
    const v = mediaSchema.parse(input);
    const db = await getDb();
    const [{ value }] = (await db.select({ value: max(media.sortOrder) }).from(media).where(eq(media.projectId, projectId))) as [{ value: number | null }];
    await db.insert(media).values({ projectId, ...v, storageKey: v.url.startsWith("https://") ? v.url : null, sortOrder: (value ?? -1) + 1 });
    await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
    revalidatePublic();
    revalidatePath(`/admin/portfolio/${projectId}`);
    return { ok: true, message: "Média ajouté." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMediaAction(id: string, input: { alt: { fr: string; nl: string; en: string }; focalX: number; focalY: number }): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const [row] = await db
    .update(media)
    .set({ alt: { fr: input.alt.fr.slice(0, 300), nl: input.alt.nl.slice(0, 300), en: input.alt.en.slice(0, 300) }, focalX: clamp(input.focalX), focalY: clamp(input.focalY) })
    .where(eq(media.id, id))
    .returning({ projectId: media.projectId });
  revalidatePublic();
  if (row?.projectId) revalidatePath(`/admin/portfolio/${row.projectId}`);
  return { ok: true, message: "Média mis à jour." };
}

export async function reorderMediaAction(projectId: string, ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(media).set({ sortOrder: i }).where(and(eq(media.id, id), eq(media.projectId, projectId)));
  });
  revalidatePublic();
  revalidatePath(`/admin/portfolio/${projectId}`);
  return { ok: true };
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(media).where(eq(media.id, id)).returning();
  if (row?.storageKey) await deleteBlobs([row.storageKey]);
  revalidatePublic();
  if (row?.projectId) revalidatePath(`/admin/portfolio/${row.projectId}`);
  return { ok: true, message: "Média supprimé." };
}

export async function saveCategoryAction(id: string | null, input: { slug?: string; name: { fr: string; nl: string; en: string } }): Promise<ActionResult> {
  await requireAdmin();
  try {
    const name = localized.parse(input.name);
    if (!name.fr.trim()) return { ok: false, error: "Nom français obligatoire." };
    const db = await getDb();
    if (id) await db.update(categories).set({ name }).where(eq(categories.id, id));
    else {
      const [{ value }] = (await db.select({ value: max(categories.sortOrder) }).from(categories)) as [{ value: number | null }];
      await db.insert(categories).values({ slug: slugify(input.slug || name.fr), name, sortOrder: (value ?? 0) + 1 });
    }
    revalidatePublic();
    revalidatePath("/admin/portfolio");
    return { ok: true, message: "Catégorie enregistrée." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePublic();
  revalidatePath("/admin/portfolio");
  return { ok: true, message: "Catégorie supprimée (les projets concernés n'ont plus de catégorie)." };
}

/* ───────────────────────────── Messages ───────────────────────────── */

export async function setMessageStatusAction(id: string, status: "NEW" | "READ" | "ARCHIVED"): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id));
  revalidatePath("/admin/messages");
  return { ok: true };
}

/* ───────────────────────────── Paramètres ───────────────────────────── */

export async function saveSettingAction(key: SettingKey, value: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    await saveSetting(key, value);
    revalidatePublic();
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Paramètres enregistrés." };
  } catch (e) {
    return fail(e);
  }
}

/** RGPD : suppression / anonymisation de toutes les données d'une personne. */
export async function eraseClientDataAction(emailRaw: string): Promise<ActionResult> {
  await requireAdmin();
  const email = emailRaw.trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { ok: false, error: "Adresse e-mail invalide." };
  const db = await getDb();
  const list = await db.select({ id: bookings.id, status: bookings.status }).from(bookings).where(eq(bookings.email, email));
  const active = list.filter((b) => ["PENDING", "RESCHEDULE_PROPOSED", "CONFIRMED"].includes(b.status));
  if (active.length) return { ok: false, error: `${active.length} réservation(s) active(s) : annulez-les d'abord.` };
  await db.transaction(async (tx) => {
    for (const b of list) {
      await tx.delete(bookingAttachments).where(eq(bookingAttachments.bookingId, b.id));
      await tx
        .update(bookings)
        .set({ firstName: "—", lastName: "—", email: `anonymise+${b.id}@invalid`, projectDescription: "[effacé à la demande]", placement: null, approximateSize: null, style: null, comment: null, adminNotes: null, clientMessage: null, anonymizedAt: new Date() })
        .where(eq(bookings.id, b.id));
      await enqueueBookingSync(tx, b.id);
    }
    await tx.delete(contactMessages).where(eq(contactMessages.email, email));
  });
  after(() => drainJobs().catch(() => {}));
  return { ok: true, message: `Données effacées : ${list.length} réservation(s) anonymisée(s), messages supprimés.` };
}

/* ───────────────────────────── Synchronisation & tests ───────────────────────────── */

export async function retryJobsAction(ids?: string[]): Promise<ActionResult> {
  await requireAdmin();
  await retryJobs({ ids });
  const r = await drainJobs();
  revalidatePath("/admin/synchronisation");
  return { ok: true, message: `${r.done} tâche(s) réussie(s), ${r.failed} échec(s), ${r.skipped} non configurée(s).` };
}

export async function resyncAllCalendarAction(): Promise<ActionResult> {
  await requireAdmin();
  const db = await getDb();
  const list = await db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.status, ["PENDING", "RESCHEDULE_PROPOSED", "CONFIRMED"]));
  for (const b of list) await enqueueBookingSync(db, b.id);
  const r = await drainJobs(10);
  revalidatePath("/admin/synchronisation");
  return { ok: true, message: `${list.length} réservation(s) resynchronisée(s) — ${r.done} OK, ${r.failed} échec(s), ${r.skipped} non configurée(s).` };
}

export async function rebuildSheetAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const db = await getDb();
    const all = await db.select().from(bookings).orderBy(asc(bookings.createdAt));
    const r = await rebuildSheet(all);
    return { ok: true, message: `Google Sheets reconstruit : ${r.rows} ligne(s), sans doublon.` };
  } catch (e) {
    return fail(e);
  }
}

export async function testEmailAction(): Promise<ActionResult> {
  const s = await requireAdmin();
  try {
    await verifySmtp();
    await sendEmail({
      to: s.email,
      subject: "Test d'envoi — SOFTLINEBY.CLA",
      text: "Si vous lisez ceci, l'envoi d'e-mails fonctionne.",
      html: emails.adminLogin("#", s.email).html.replace("Lien de connexion", "Test réussi").replace("Me connecter", "OK"),
    });
    return { ok: true, message: `E-mail de test envoyé à ${s.email}. Vérifiez votre boîte de réception (et les spams).` };
  } catch (e) {
    return fail(e);
  }
}

export async function testGoogleAction(): Promise<ActionResult> {
  await requireAdmin();
  const parts: string[] = [];
  try {
    const now = new Date();
    const busy = await listBusyIntervals(now, new Date(now.getTime() + 30 * 86_400_000));
    parts.push(`Google Agenda OK (${busy.length} occupation(s) sur 30 jours)`);
  } catch (e) {
    parts.push(`Google Agenda : ${(e as Error).message}`);
  }
  try {
    if (!googleConfig()?.sheetsId) throw new Error("GOOGLE_SHEETS_ID n'est pas configuré");
    const all = await (await getDb()).select().from(bookings).orderBy(asc(bookings.createdAt));
    const r = await rebuildSheet(all);
    parts.push(`Google Sheets OK (${r.rows} ligne(s))`);
  } catch (e) {
    parts.push(`Google Sheets : ${(e as Error).message}`);
  }
  const ok = parts.every((p) => p.includes("OK"));
  return ok ? { ok: true, message: parts.join(" · ") } : { ok: false, error: parts.join(" · ") };
}

export async function runMaintenanceAction(): Promise<ActionResult> {
  await requireAdmin();
  const r = await runMaintenance();
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Maintenance effectuée : ${JSON.stringify(r)}` };
}
