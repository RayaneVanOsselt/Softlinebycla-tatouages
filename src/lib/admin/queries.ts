import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { adminEmails, blobEnabled, cronSecret, googleConfig, smtpConfig } from "../config";
import { getDb } from "../db";
import { availabilitySlots, bookings, contactMessages, jobs } from "../db/schema";
import { getSetting } from "../settings";
import { addDays, todayKey } from "../time";

export async function getCounts() {
  const db = await getDb();
  const [byStatus, unread, syncErrors] = await Promise.all([
    db.select({ status: bookings.status, n: count() }).from(bookings).groupBy(bookings.status),
    db.select({ n: count() }).from(contactMessages).where(eq(contactMessages.status, "NEW")),
    db.select({ n: count() }).from(jobs).where(inArray(jobs.status, ["FAILED"])),
  ]);
  const s = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>;
  return {
    pending: s.PENDING ?? 0,
    proposed: s.RESCHEDULE_PROPOSED ?? 0,
    confirmed: s.CONFIRMED ?? 0,
    declined: s.DECLINED ?? 0,
    unread: unread[0]?.n ?? 0,
    syncErrors: syncErrors[0]?.n ?? 0,
  };
}

export async function getUpcoming(limit = 8) {
  const db = await getDb();
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, "CONFIRMED"), gte(bookings.endAt, new Date())))
    .orderBy(asc(bookings.startAt))
    .limit(limit);
}

export async function getPending() {
  const db = await getDb();
  return db.select().from(bookings).where(inArray(bookings.status, ["PENDING", "RESCHEDULE_PROPOSED"])).orderBy(asc(bookings.startAt)).limit(30);
}

export async function getRecentFailures(limit = 5) {
  const db = await getDb();
  return db.select().from(jobs).where(eq(jobs.status, "FAILED")).orderBy(desc(jobs.updatedAt)).limit(limit);
}

export interface SetupItem {
  key: string;
  label: string;
  done: boolean;
  help: string;
  required: boolean;
}

/** Check-list de mise en production affichée sur le tableau de bord. */
export async function getSetupStatus(): Promise<SetupItem[]> {
  const db = await getDb();
  const [contact, legal, social] = await Promise.all([getSetting("contact"), getSetting("legal"), getSetting("social")]);
  const today = todayKey();
  const [openSoon] = await db
    .select({ n: count() })
    .from(availabilitySlots)
    .where(and(gte(availabilitySlots.date, today), sql`${availabilitySlots.date} <= ${addDays(today, 45)}`));
  const g = googleConfig();
  return [
    { key: "db", label: "Base de données PostgreSQL (Neon)", done: Boolean(process.env.DATABASE_URL), required: true, help: "Vercel → Storage → Neon → Connect (ajoute DATABASE_URL)." },
    { key: "auth", label: "Secret de sécurité (AUTH_SECRET)", done: Boolean(process.env.AUTH_SECRET), required: true, help: "Variable d'environnement : une longue chaîne aléatoire." },
    { key: "admins", label: "Adresse(s) administrateur", done: adminEmails().length > 0, required: true, help: "Variable ADMIN_EMAILS." },
    { key: "smtp", label: "Envoi d'e-mails (Gmail SMTP)", done: Boolean(smtpConfig()), required: true, help: "SMTP_USER + SMTP_PASSWORD (mot de passe d'application Gmail)." },
    { key: "notify", label: "Adresse qui reçoit les demandes", done: Boolean(contact.bookingNotificationEmail || contact.contactEmail), required: true, help: "Paramètres → Contact." },
    { key: "availability", label: "Disponibilités ouvertes (45 prochains jours)", done: (openSoon?.n ?? 0) > 0, required: true, help: "Agenda → cliquez sur des jours et ouvrez des heures." },
    { key: "calendar", label: "Google Agenda connecté", done: Boolean(g?.calendarId), required: false, help: "GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID." },
    { key: "sheets", label: "Google Sheets connecté", done: Boolean(g?.sheetsId), required: false, help: "GOOGLE_SHEETS_ID + partage du tableur avec le compte de service." },
    { key: "blob", label: "Stockage des nouveaux médias (Vercel Blob)", done: blobEnabled(), required: false, help: "Vercel → Storage → Blob → Connect (ajoute BLOB_READ_WRITE_TOKEN)." },
    { key: "cron", label: "Tâche planifiée sécurisée (CRON_SECRET)", done: Boolean(cronSecret()), required: false, help: "Variable CRON_SECRET (relances, expirations, purge RGPD)." },
    { key: "legal", label: "Mentions légales complétées", done: Boolean(legal.businessName && legal.enterpriseNumber), required: false, help: "Paramètres → Mentions légales (nom, numéro BCE…)." },
    { key: "social", label: "Réseaux sociaux", done: Object.values(social).some(Boolean), required: false, help: "Paramètres → Réseaux sociaux (Instagram, TikTok…)." },
  ];
}
