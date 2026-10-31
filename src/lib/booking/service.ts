/**
 * Service de réservation — la base PostgreSQL est la source de vérité.
 * Toute modification se fait dans une transaction ; les effets externes (e-mails, Google Agenda,
 * Google Sheets) sont mis en file d'attente dans la même transaction puis exécutés de façon
 * idempotente avec reprise automatique (voir lib/jobs).
 */
import crypto from "node:crypto";
import { and, asc, eq, gt, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { adminEmails, bookingConfig, siteUrl } from "../config";
import { getDb, pgErrorCode, type Executor, type Tx } from "../db";
import {
  availabilitySlots,
  blockedPeriods,
  bookingAttachments,
  bookingEvents,
  bookings,
  BLOCKING_STATUSES,
  type Booking,
  type BookingStatus,
  type Locale,
} from "../db/schema";
import { emails, type BookingEmailData } from "../email/templates";
import type { OutgoingEmail } from "../email/transport";
import { buildIcs } from "../email/ics";
import { calendarConfigured, listBusyIntervals } from "../google/calendar";
import { enqueue, enqueueBookingSync } from "../jobs/queue";
import { logger } from "../logger";
import { getSetting } from "../settings";
import { addDays, daysInMonth, utcToZoned, zonedToUtc, type DateKey } from "../time";
import { localizedPath } from "@/i18n/paths";
import { checkInterval, computeDays, overlaps, type Blocker, type DayView, type Interval, type SlotRejection } from "./slots";
import { assertTransition, TransitionError } from "./status";

export type BookingErrorCode =
  | "SLOT_UNAVAILABLE"
  | "SLOT_HELD"
  | "OUTSIDE_RANGE"
  | "TOO_SOON"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "EXPIRED"
  | "INVALID";

export class BookingError extends Error {
  constructor(
    public readonly code: BookingErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "BookingError";
  }
}

const rejectionToCode: Record<SlotRejection, BookingErrorCode> = {
  outside_range: "OUTSIDE_RANGE",
  not_open: "SLOT_UNAVAILABLE",
  too_soon: "TOO_SOON",
  outside_window: "OUTSIDE_RANGE",
  conflict: "SLOT_UNAVAILABLE",
  held: "SLOT_HELD",
};

/* ───────────────────────── Google Agenda (occupations) ───────────────────────── */

const busyCache = new Map<string, { at: number; intervals: Interval[] }>();
const BUSY_TTL_MS = 60_000;

/**
 * Occupations Google Agenda. En cas d'indisponibilité de Google, on ne bloque pas le site :
 * checked=false est enregistré sur la demande et signalé à l'artiste (qui valide de toute façon manuellement).
 */
export async function getGoogleBusy(from: Date, to: Date, opts: { fresh?: boolean } = {}): Promise<{ intervals: Interval[]; checked: boolean }> {
  if (!calendarConfigured()) return { intervals: [], checked: false };
  const key = `${from.toISOString()}|${to.toISOString()}`;
  const cached = busyCache.get(key);
  if (!opts.fresh && cached && Date.now() - cached.at < BUSY_TTL_MS) return { intervals: cached.intervals, checked: true };
  try {
    const intervals = await listBusyIntervals(from, to);
    busyCache.set(key, { at: Date.now(), intervals });
    if (busyCache.size > 50) busyCache.delete(busyCache.keys().next().value!);
    return { intervals, checked: true };
  } catch (error) {
    logger.warn("google.busy.failed", { error });
    if (cached) return { intervals: cached.intervals, checked: true };
    return { intervals: [], checked: false };
  }
}

export function clearBusyCache() {
  busyCache.clear();
}

/* ───────────────────────────── Lecture des disponibilités ───────────────────────────── */

async function loadOpen(db: Executor, from: DateKey, to: DateKey) {
  const rows = await db
    .select({ date: availabilitySlots.date, startMinute: availabilitySlots.startMinute })
    .from(availabilitySlots)
    .where(and(gte(availabilitySlots.date, from), lte(availabilitySlots.date, to)));
  const map = new Map<DateKey, Set<number>>();
  for (const r of rows) {
    if (!map.has(r.date)) map.set(r.date, new Set());
    map.get(r.date)!.add(r.startMinute);
  }
  return map;
}

async function loadBlockers(db: Executor, from: Date, to: Date, now: Date, excludeBookingId?: string): Promise<Blocker[]> {
  const rows = await db
    .select({ id: bookings.id, startAt: bookings.startAt, endAt: bookings.endAt, status: bookings.status, holdExpiresAt: bookings.holdExpiresAt })
    .from(bookings)
    .where(and(inArray(bookings.status, [...BLOCKING_STATUSES]), lt(bookings.startAt, to), gt(bookings.endAt, from), excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined));
  const blockers: Blocker[] = [];
  for (const r of rows) {
    const expired = r.status !== "CONFIRMED" && r.holdExpiresAt && r.holdExpiresAt.getTime() <= now.getTime();
    if (expired) continue;
    blockers.push({ start: r.startAt.getTime(), end: r.endAt.getTime(), kind: r.status === "CONFIRMED" ? "busy" : "held" });
  }
  const periods = await db
    .select({ startAt: blockedPeriods.startAt, endAt: blockedPeriods.endAt })
    .from(blockedPeriods)
    .where(and(lt(blockedPeriods.startAt, to), gt(blockedPeriods.endAt, from)));
  for (const p of periods) blockers.push({ start: p.startAt.getTime(), end: p.endAt.getTime(), kind: "busy" });
  return blockers;
}

export interface MonthAvailability {
  month: string;
  durationMinutes: number;
  maxDurationMinutes: number;
  days: DayView[];
  calendarChecked: boolean;
}

export async function getMonthAvailability(month: string, durationMinutes: number, now = new Date()): Promise<MonthAvailability> {
  const db = await getDb();
  const cfg = await getSetting("booking", db);
  const maxDurationMinutes = cfg.maxDurationHours * 60;
  const duration = Math.min(Math.max(bookingConfig.slotMinutes, durationMinutes), maxDurationMinutes);
  const dates = daysInMonth(month);
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const from = zonedToUtc(first, 0);
  const to = zonedToUtc(addDays(last, 1), 0);

  const [open, blockers, google] = await Promise.all([loadOpen(db, first, last), loadBlockers(db, from, to, now), getGoogleBusy(from, to)]);
  const all: Blocker[] = [...blockers, ...google.intervals.map((i) => ({ ...i, kind: "busy" as const }))];
  const days = computeDays(dates, open, all, {
    durationMinutes: duration,
    now,
    minNoticeMinutes: cfg.minNoticeHours * 60,
    maxAdvanceDays: cfg.maxAdvanceDays,
  });
  return { month, durationMinutes: duration, maxDurationMinutes, days, calendarChecked: google.checked || !calendarConfigured() };
}

/* ───────────────────────────── Utilitaires ───────────────────────────── */

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateReference() {
  const bytes = crypto.randomBytes(6);
  return `SLC-${Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("")}`;
}

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function durationOf(b: Pick<Booking, "finalDurationMinutes" | "estimatedDurationMinutes">) {
  return b.finalDurationMinutes ?? b.estimatedDurationMinutes;
}

export function toEmailData(b: Booking): BookingEmailData {
  return {
    reference: b.reference,
    firstName: b.firstName,
    lastName: b.lastName,
    email: b.email,
    locale: b.locale,
    startAt: b.startAt,
    endAt: b.endAt,
    durationMinutes: Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60_000),
    projectDescription: b.projectDescription,
    placement: b.placement,
    approximateSize: b.approximateSize,
    style: b.style,
    comment: b.comment,
  };
}

export const adminBookingUrl = (id: string) => `${siteUrl()}/admin/reservations/${id}`;

export async function adminNotificationEmail(db: Executor) {
  const contact = await getSetting("contact", db);
  return contact.bookingNotificationEmail || contact.contactEmail || adminEmails()[0] || undefined;
}

async function queueEmail(tx: Executor, dedupeKey: string, email: OutgoingEmail, bookingId?: string) {
  await enqueue(tx, { type: "email", dedupeKey, bookingId, mode: "once", payload: { email } });
}

async function addEvent(
  tx: Executor,
  b: Pick<Booking, "id">,
  e: { action: string; from?: BookingStatus | null; to?: BookingStatus | null; actor: "client" | "admin" | "system"; note?: string | null; data?: Record<string, unknown> },
) {
  const [row] = await tx
    .insert(bookingEvents)
    .values({ bookingId: b.id, action: e.action, fromStatus: e.from ?? null, toStatus: e.to ?? null, actor: e.actor, note: e.note ?? null, data: e.data ?? null })
    .returning({ id: bookingEvents.id });
  return row!.id;
}

function icsFor(b: Booking, cancelled = false) {
  return buildIcs({
    uid: `${b.id}@softlineby.cla`,
    start: b.startAt,
    end: b.endAt,
    summary: `SOFTLINEBY.CLA — ${b.locale === "nl" ? "tatoeage" : b.locale === "en" ? "tattoo" : "tatouage"}`,
    description: `${b.reference}`,
    sequence: b.version,
    cancelled,
  });
}

/** Expire les demandes dont le délai est dépassé, libère leurs créneaux et prévient les clients. */
export async function sweepExpired(tx: Executor, now = new Date()) {
  const due = await tx
    .select()
    .from(bookings)
    .where(and(inArray(bookings.status, ["PENDING", "RESCHEDULE_PROPOSED"]), lte(bookings.holdExpiresAt, now)))
    .for("update", { skipLocked: true });
  for (const b of due) {
    const [updated] = await tx
      .update(bookings)
      .set({ status: "EXPIRED", responseTokenHash: null, updatedAt: now, version: sql`${bookings.version} + 1` })
      .where(and(eq(bookings.id, b.id), eq(bookings.status, b.status)))
      .returning();
    if (!updated) continue;
    const eventId = await addEvent(tx, b, { action: "expired", from: b.status, to: "EXPIRED", actor: "system" });
    await queueEmail(tx, `email:${b.id}:expired:${eventId}`, emails.expired(toEmailData(updated)), b.id);
    await enqueueBookingSync(tx, b.id);
  }
  return due.length;
}

async function runTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = await getDb();
  try {
    return await db.transaction(fn);
  } catch (error) {
    if (error instanceof BookingError) throw error;
    if (error instanceof TransitionError) throw new BookingError("INVALID_TRANSITION", error.message);
    const code = pgErrorCode(error);
    if (code === "23P01") throw new BookingError("CONFLICT", "Ce créneau chevauche une autre réservation.");
    if (code === "40001" || code === "40P01") throw new BookingError("CONFLICT", "Conflit d'écriture simultanée, réessayez.");
    throw error;
  }
}

/* ───────────────────────────── Demande client ───────────────────────────── */

export interface BookingRequestInput {
  firstName: string;
  lastName: string;
  email: string;
  locale: Locale;
  date: DateKey;
  startMinute: number;
  durationMinutes: number;
  projectDescription: string;
  placement?: string;
  approximateSize?: string;
  style?: string;
  comment?: string;
  attachments?: Array<{ filename: string; mimeType: string; data: Buffer; width?: number; height?: number }>;
}

export async function createBookingRequest(input: BookingRequestInput, now = new Date()): Promise<Booking> {
  const db = await getDb();
  const cfg = await getSetting("booking", db);
  if (input.durationMinutes > cfg.maxDurationHours * 60) throw new BookingError("OUTSIDE_RANGE", "Durée trop longue.");

  const start = zonedToUtc(input.date, input.startMinute);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const dayFrom = zonedToUtc(input.date, 0);
  const dayTo = zonedToUtc(addDays(input.date, 1), 0);
  const google = await getGoogleBusy(dayFrom, dayTo, { fresh: true });
  const notifyTo = await adminNotificationEmail(db);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await runTx(async (tx) => {
        await sweepExpired(tx, now);

        const open = (await loadOpen(tx, input.date, input.date)).get(input.date) ?? new Set<number>();
        const blockers = await loadBlockers(tx, dayFrom, dayTo, now);
        const all: Blocker[] = [...blockers, ...google.intervals.map((i) => ({ ...i, kind: "busy" as const }))];
        const rejection = checkInterval(input.date, input.startMinute, open, all, {
          durationMinutes: input.durationMinutes,
          now,
          minNoticeMinutes: cfg.minNoticeHours * 60,
          maxAdvanceDays: cfg.maxAdvanceDays,
        });
        if (rejection) throw new BookingError(rejectionToCode[rejection]);

        const [booking] = await tx
          .insert(bookings)
          .values({
            reference: generateReference(),
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email.toLowerCase(),
            locale: input.locale,
            projectDescription: input.projectDescription,
            placement: input.placement || null,
            approximateSize: input.approximateSize || null,
            style: input.style || null,
            comment: input.comment || null,
            estimatedDurationMinutes: input.durationMinutes,
            startAt: start,
            endAt: end,
            requestedStartAt: start,
            requestedEndAt: end,
            status: "PENDING",
            holdExpiresAt: new Date(now.getTime() + cfg.pendingHoldHours * 3_600_000),
            calendarChecked: google.checked,
            consentAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        const b = booking!;

        if (input.attachments?.length) {
          await tx.insert(bookingAttachments).values(
            input.attachments.map((a) => ({
              bookingId: b.id,
              filename: a.filename,
              mimeType: a.mimeType,
              sizeBytes: a.data.length,
              width: a.width ?? null,
              height: a.height ?? null,
              data: a.data,
            })),
          );
        }

        await addEvent(tx, b, { action: "created", to: "PENDING", actor: "client", data: { calendarChecked: google.checked, attachments: input.attachments?.length ?? 0 } });
        await queueEmail(tx, `email:${b.id}:received`, emails.requestReceived(toEmailData(b), cfg.pendingHoldHours), b.id);
        if (notifyTo) {
          await queueEmail(
            tx,
            `email:${b.id}:admin-new`,
            emails.adminNewRequest(
              { ...toEmailData(b), attachments: input.attachments?.length ?? 0, calendarChecked: google.checked || !calendarConfigured() },
              adminBookingUrl(b.id),
              notifyTo,
            ),
            b.id,
          );
        } else {
          logger.warn("booking.admin_email_missing", { bookingId: b.id });
        }
        await enqueueBookingSync(tx, b.id);
        return b;
      });
    } catch (error) {
      // Collision (très improbable) sur la référence : on réessaie avec une nouvelle référence.
      if (pgErrorCode(error) === "23505" && attempt < 2) continue;
      if (error instanceof BookingError && error.code === "CONFLICT") throw new BookingError("SLOT_UNAVAILABLE");
      throw error;
    }
  }
  throw new BookingError("CONFLICT");
}

/* ───────────────────────────── Décisions de l'artiste ───────────────────────────── */

async function lockBooking(tx: Tx, id: string) {
  const [b] = await tx.select().from(bookings).where(eq(bookings.id, id)).for("update");
  if (!b) throw new BookingError("NOT_FOUND");
  return b;
}

/** Vérifie qu'une plage choisie par l'artiste reste dans 11:00–20:00 et ne heurte ni période bloquée ni Google Agenda. */
async function assertAdminRangeFree(tx: Tx, bookingId: string, start: Date, end: Date, now: Date) {
  const s = utcToZoned(start);
  const e = utcToZoned(end);
  const endMinute = e.date === s.date ? e.minute : e.minute + 24 * 60;
  if (s.minute < bookingConfig.dayStartMinute || endMinute > bookingConfig.dayEndMinute || e.date !== s.date) {
    throw new BookingError("OUTSIDE_RANGE", "Le rendez-vous doit se situer entre l'heure de début et de fin autorisées.");
  }
  const blockers = await loadBlockers(tx, start, end, now, bookingId);
  if (blockers.some((b) => overlaps({ start: start.getTime(), end: end.getTime() }, b))) {
    throw new BookingError("CONFLICT", "Cette plage chevauche une autre réservation ou une période bloquée.");
  }
  const google = await getGoogleBusy(zonedToUtc(s.date, 0), zonedToUtc(addDays(s.date, 1), 0), { fresh: true });
  if (google.intervals.some((i) => overlaps({ start: start.getTime(), end: end.getTime() }, i))) {
    throw new BookingError("CONFLICT", "Cette plage est occupée dans votre Google Agenda.");
  }
}

export async function acceptBooking(id: string, opts: { durationMinutes?: number; message?: string; actor?: string } = {}, now = new Date()) {
  return runTx(async (tx) => {
    const b = await lockBooking(tx, id);
    if (b.status !== "PENDING") throw new BookingError("INVALID_TRANSITION", "Seule une demande en attente peut être acceptée.");
    assertTransition(b.status, "CONFIRMED");
    const duration = opts.durationMinutes ?? durationOf(b);
    if (duration % bookingConfig.slotMinutes !== 0 || duration <= 0) throw new BookingError("INVALID", "Durée invalide.");
    const end = new Date(b.startAt.getTime() + duration * 60_000);
    if (end.getTime() !== b.endAt.getTime()) await assertAdminRangeFree(tx, b.id, b.startAt, end, now);

    const [u] = await tx
      .update(bookings)
      .set({
        status: "CONFIRMED",
        endAt: end,
        finalDurationMinutes: duration,
        holdExpiresAt: null,
        decidedAt: now,
        clientMessage: opts.message?.trim() || null,
        updatedAt: now,
        version: sql`${bookings.version} + 1`,
      })
      .where(eq(bookings.id, id))
      .returning();
    const updated = u!;
    const eventId = await addEvent(tx, b, {
      action: "accepted",
      from: b.status,
      to: "CONFIRMED",
      actor: "admin",
      note: opts.message,
      data: duration !== durationOf(b) ? { durationMinutes: duration, previousDurationMinutes: durationOf(b), by: opts.actor } : { by: opts.actor },
    });
    await queueEmail(tx, `email:${id}:confirmed:${eventId}`, emails.confirmed(toEmailData(updated), icsFor(updated), opts.message), id);
    await enqueueBookingSync(tx, id);
    return updated;
  });
}

export async function declineBooking(id: string, opts: { message?: string; actor?: string } = {}, now = new Date()) {
  return runTx(async (tx) => {
    const b = await lockBooking(tx, id);
    if (b.status !== "PENDING") throw new BookingError("INVALID_TRANSITION", "Seule une demande en attente peut être refusée.");
    const [u] = await tx
      .update(bookings)
      .set({ status: "DECLINED", holdExpiresAt: null, decidedAt: now, clientMessage: opts.message?.trim() || null, updatedAt: now, version: sql`${bookings.version} + 1` })
      .where(eq(bookings.id, id))
      .returning();
    const eventId = await addEvent(tx, b, { action: "declined", from: b.status, to: "DECLINED", actor: "admin", note: opts.message, data: { by: opts.actor } });
    await queueEmail(tx, `email:${id}:declined:${eventId}`, emails.declined(toEmailData(u!), opts.message), id);
    await enqueueBookingSync(tx, id);
    return u!;
  });
}

export async function proposeReschedule(
  id: string,
  opts: { date: DateKey; startMinute: number; durationMinutes: number; message?: string; actor?: string },
  now = new Date(),
): Promise<{ booking: Booking; token: string }> {
  return runTx(async (tx) => {
    const b = await lockBooking(tx, id);
    assertTransition(b.status, "RESCHEDULE_PROPOSED");
    if (opts.durationMinutes % bookingConfig.slotMinutes !== 0 || opts.durationMinutes <= 0) throw new BookingError("INVALID", "Durée invalide.");
    const start = zonedToUtc(opts.date, opts.startMinute);
    const end = new Date(start.getTime() + opts.durationMinutes * 60_000);
    if (start.getTime() <= now.getTime()) throw new BookingError("TOO_SOON", "Le créneau proposé est déjà passé.");
    await assertAdminRangeFree(tx, b.id, start, end, now);

    const cfg = await getSetting("booking", tx);
    const token = crypto.randomBytes(32).toString("base64url");
    const [u] = await tx
      .update(bookings)
      .set({
        status: "RESCHEDULE_PROPOSED",
        startAt: start,
        endAt: end,
        finalDurationMinutes: opts.durationMinutes,
        holdExpiresAt: new Date(now.getTime() + cfg.proposalHoldHours * 3_600_000),
        responseTokenHash: hashToken(token),
        clientMessage: opts.message?.trim() || null,
        decidedAt: now,
        updatedAt: now,
        version: sql`${bookings.version} + 1`,
      })
      .where(eq(bookings.id, id))
      .returning();
    const updated = u!;
    const eventId = await addEvent(tx, b, {
      action: "reschedule_proposed",
      from: b.status,
      to: "RESCHEDULE_PROPOSED",
      actor: "admin",
      note: opts.message,
      data: { previousStart: b.startAt.toISOString(), previousEnd: b.endAt.toISOString(), start: start.toISOString(), end: end.toISOString(), by: opts.actor },
    });
    const url = `${siteUrl()}${localizedPath("/booking/response", updated.locale)}?token=${encodeURIComponent(token)}`;
    await queueEmail(tx, `email:${id}:proposal:${eventId}`, emails.proposal(toEmailData(updated), url, cfg.proposalHoldHours, opts.message), id);
    await enqueueBookingSync(tx, id);
    return { booking: updated, token };
  });
}

export async function cancelBooking(id: string, opts: { message?: string; notify?: boolean; actor?: string } = {}, now = new Date()) {
  return runTx(async (tx) => {
    const b = await lockBooking(tx, id);
    assertTransition(b.status, "CANCELLED");
    const [u] = await tx
      .update(bookings)
      .set({ status: "CANCELLED", holdExpiresAt: null, responseTokenHash: null, clientMessage: opts.message?.trim() || null, updatedAt: now, version: sql`${bookings.version} + 1` })
      .where(eq(bookings.id, id))
      .returning();
    const eventId = await addEvent(tx, b, { action: "cancelled", from: b.status, to: "CANCELLED", actor: "admin", note: opts.message, data: { notified: opts.notify !== false, by: opts.actor } });
    if (opts.notify !== false) await queueEmail(tx, `email:${id}:cancelled:${eventId}`, emails.cancelled(toEmailData(u!), { message: opts.message }), id);
    await enqueueBookingSync(tx, id);
    return u!;
  });
}

export async function completeBooking(id: string, opts: { actor?: string } = {}, now = new Date()) {
  return runTx(async (tx) => {
    const b = await lockBooking(tx, id);
    assertTransition(b.status, "COMPLETED");
    const [u] = await tx.update(bookings).set({ status: "COMPLETED", updatedAt: now, version: sql`${bookings.version} + 1` }).where(eq(bookings.id, id)).returning();
    await addEvent(tx, b, { action: "completed", from: b.status, to: "COMPLETED", actor: "admin", data: { by: opts.actor } });
    await enqueueBookingSync(tx, id);
    return u!;
  });
}

export async function updateAdminNotes(id: string, notes: string) {
  return runTx(async (tx) => {
    const b = await lockBooking(tx, id);
    const [u] = await tx.update(bookings).set({ adminNotes: notes.trim() || null, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    if ((b.adminNotes ?? "") !== notes.trim()) await addEvent(tx, b, { action: "notes_updated", actor: "admin" });
    await enqueue(tx, { type: "sheets.sync", dedupeKey: `sheets:${id}`, bookingId: id, mode: "replace" });
    return u!;
  });
}

/* ───────────────────────────── Réponse du client à une proposition ───────────────────────────── */

export async function getProposalByToken(token: string, now = new Date()) {
  const db = await getDb();
  const [b] = await db.select().from(bookings).where(eq(bookings.responseTokenHash, hashToken(token))).limit(1);
  if (!b) return null;
  const expired = b.status !== "RESCHEDULE_PROPOSED" || !b.holdExpiresAt || b.holdExpiresAt.getTime() <= now.getTime();
  // Seules les informations utiles à la décision sont renvoyées (aucune donnée d'un autre client).
  return {
    firstName: b.firstName,
    locale: b.locale,
    startAt: b.startAt,
    endAt: b.endAt,
    reference: b.reference,
    message: b.clientMessage,
    expired,
    holdExpiresAt: b.holdExpiresAt,
  };
}

export async function respondToProposal(token: string, choice: "accept" | "decline", now = new Date()) {
  const db = await getDb();
  const notifyTo = await adminNotificationEmail(db);
  return runTx(async (tx) => {
    const [found] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.responseTokenHash, hashToken(token))).limit(1);
    if (!found) throw new BookingError("NOT_FOUND");
    const b = await lockBooking(tx, found.id);
    if (b.status !== "RESCHEDULE_PROPOSED") throw new BookingError("INVALID_TRANSITION");
    if (!b.holdExpiresAt || b.holdExpiresAt.getTime() <= now.getTime()) {
      await sweepExpired(tx, now);
      throw new BookingError("EXPIRED");
    }
    const to: BookingStatus = choice === "accept" ? "CONFIRMED" : "CANCELLED";
    assertTransition(b.status, to);
    const [u] = await tx
      .update(bookings)
      .set({ status: to, holdExpiresAt: null, responseTokenHash: null, updatedAt: now, version: sql`${bookings.version} + 1` })
      .where(eq(bookings.id, b.id))
      .returning();
    const updated = u!;
    const eventId = await addEvent(tx, b, { action: choice === "accept" ? "proposal_accepted" : "proposal_declined", from: b.status, to, actor: "client" });
    if (choice === "accept") {
      await queueEmail(tx, `email:${b.id}:confirmed:${eventId}`, emails.confirmed(toEmailData(updated), icsFor(updated)), b.id);
    } else {
      await queueEmail(tx, `email:${b.id}:cancelled:${eventId}`, emails.cancelled(toEmailData(updated), { byClient: true }), b.id);
    }
    if (notifyTo) {
      await queueEmail(tx, `email:${b.id}:admin-answer:${eventId}`, emails.adminProposalAnswer(toEmailData(updated), choice === "accept", adminBookingUrl(b.id), notifyTo), b.id);
    }
    await enqueueBookingSync(tx, b.id);
    return updated;
  });
}

/* ───────────────────────────── Lecture administration ───────────────────────────── */

export async function listBookingsForRange(from: Date, to: Date) {
  const db = await getDb();
  return db
    .select()
    .from(bookings)
    .where(and(lt(bookings.startAt, to), gt(bookings.endAt, from), inArray(bookings.status, ["PENDING", "RESCHEDULE_PROPOSED", "CONFIRMED", "COMPLETED"])))
    .orderBy(asc(bookings.startAt));
}

export { durationOf };
