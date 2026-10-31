/**
 * Exécution des tâches en file (e-mails, Google Agenda, Google Sheets).
 * - Réclamation atomique (FOR UPDATE SKIP LOCKED) : deux exécutions parallèles ne traitent jamais la même tâche.
 * - Reprise avec délai exponentiel ; après N échecs la tâche passe en FAILED (visible et relançable dans l'admin).
 * - Service non configuré → SKIPPED avec explication (jamais présenté comme « envoyé »).
 */
import { and, eq, inArray, lte, or, sql, asc } from "drizzle-orm";
import { getDb, type Database } from "../db";
import { bookings, jobs, type Job } from "../db/schema";
import { EmailNotConfiguredError, sendEmail, type OutgoingEmail } from "../email/transport";
import { GoogleNotConfiguredError } from "../google/client";
import { syncBookingEvent } from "../google/calendar";
import { upsertBookingRow } from "../google/sheets";
import { logger } from "../logger";

class SkipJob extends Error {}

const LEASE_MS = 2 * 60_000;

function backoffMs(attempts: number) {
  // 1 min, 2, 4, 8, 16, 32, 64 min… plafonné à 6 h
  return Math.min(6 * 3_600_000, 60_000 * 2 ** Math.max(0, attempts - 1));
}

async function handle(db: Database, job: Job): Promise<string | void> {
  switch (job.type) {
    case "email": {
      const email = (job.payload as { email?: OutgoingEmail }).email;
      if (!email?.to) throw new SkipJob("E-mail sans destinataire");
      try {
        const res = await sendEmail(email);
        return `Envoyé (${res.messageId})`;
      } catch (error) {
        if (error instanceof EmailNotConfiguredError) {
          if (process.env.NODE_ENV !== "production") {
            logger.info("email.dev_preview", { subject: email.subject, text: email.text.slice(0, 1500) });
          }
          throw new SkipJob("Non envoyé : SMTP non configuré");
        }
        throw error;
      }
    }
    case "calendar.sync":
    case "sheets.sync": {
      if (!job.bookingId) throw new SkipJob("Tâche sans réservation");
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, job.bookingId)).limit(1);
      if (!booking) throw new SkipJob("Réservation supprimée");
      try {
        if (job.type === "calendar.sync") {
          const res = await syncBookingEvent(booking);
          if ((res.action === "created" || res.action === "updated") && res.eventId !== booking.calendarEventId) {
            await db.update(bookings).set({ calendarEventId: res.eventId }).where(eq(bookings.id, booking.id));
            // Le nouvel identifiant d'événement doit aussi apparaître dans Sheets
            await db
              .update(jobs)
              .set({ status: "PENDING", runAt: new Date(), attempts: 0, updatedAt: new Date() })
              .where(and(eq(jobs.dedupeKey, `sheets:${booking.id}`), inArray(jobs.status, ["DONE", "FAILED", "SKIPPED"])));
          }
          return `Google Agenda : ${res.action}`;
        }
        const res = await upsertBookingRow(booking);
        return `Google Sheets : ${res.action}`;
      } catch (error) {
        if (error instanceof GoogleNotConfiguredError) throw new SkipJob(`Non synchronisé : ${error.message}`);
        throw error;
      }
    }
    default:
      throw new SkipJob(`Type de tâche inconnu : ${job.type}`);
  }
}

export interface ProcessResult {
  processed: number;
  done: number;
  failed: number;
  skipped: number;
}

export async function processJobs(opts: { limit?: number; bookingId?: string } = {}): Promise<ProcessResult> {
  const db = await getDb();
  const now = new Date();
  const limit = opts.limit ?? 20;

  const claimable = db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        or(and(eq(jobs.status, "PENDING"), lte(jobs.runAt, now)), and(eq(jobs.status, "RUNNING"), lte(jobs.lockedUntil, now))),
        opts.bookingId ? eq(jobs.bookingId, opts.bookingId) : undefined,
      ),
    )
    .orderBy(asc(jobs.runAt))
    .limit(limit)
    .for("update", { skipLocked: true });

  const claimed = await db
    .update(jobs)
    .set({ status: "RUNNING", lockedUntil: new Date(now.getTime() + LEASE_MS), attempts: sql`${jobs.attempts} + 1`, updatedAt: now })
    .where(inArray(jobs.id, claimable))
    .returning();

  const result: ProcessResult = { processed: claimed.length, done: 0, failed: 0, skipped: 0 };
  // Ordre stable : e-mails d'abord (le client est prévenu au plus vite), puis synchronisations.
  claimed.sort((a, b) => (a.type === "email" ? 0 : 1) - (b.type === "email" ? 0 : 1) || a.createdAt.getTime() - b.createdAt.getTime());

  for (const job of claimed) {
    try {
      const note = await handle(db, job);
      result.done++;
      await db
        .update(jobs)
        .set({ status: "DONE", lastError: note ?? null, lockedUntil: null, completedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(jobs.id, job.id), eq(jobs.status, "RUNNING")));
    } catch (error) {
      if (error instanceof SkipJob) {
        result.skipped++;
        await db
          .update(jobs)
          .set({ status: "SKIPPED", lastError: error.message, lockedUntil: null, updatedAt: new Date() })
          .where(and(eq(jobs.id, job.id), eq(jobs.status, "RUNNING")));
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      const final = job.attempts >= job.maxAttempts;
      result.failed++;
      logger.error("job.failed", { jobId: job.id, type: job.type, attempts: job.attempts, error });
      await db
        .update(jobs)
        .set({
          status: final ? "FAILED" : "PENDING",
          lastError: message.slice(0, 500),
          lockedUntil: null,
          runAt: new Date(Date.now() + backoffMs(job.attempts)),
          updatedAt: new Date(),
        })
        .where(and(eq(jobs.id, job.id), eq(jobs.status, "RUNNING")));
    }
  }
  return result;
}

/** Relance manuelle (admin) des tâches en échec ou ignorées. */
export async function retryJobs(filter: { ids?: string[]; statuses?: Array<"FAILED" | "SKIPPED"> } = {}) {
  const db = await getDb();
  const statuses = filter.statuses ?? ["FAILED", "SKIPPED"];
  await db
    .update(jobs)
    .set({ status: "PENDING", attempts: 0, runAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(and(inArray(jobs.status, statuses), filter.ids?.length ? inArray(jobs.id, filter.ids) : undefined));
}

/** Traite la file en boucle jusqu'à épuisement (borné). */
export async function drainJobs(maxRounds = 5) {
  const total: ProcessResult = { processed: 0, done: 0, failed: 0, skipped: 0 };
  for (let i = 0; i < maxRounds; i++) {
    const r = await processJobs();
    total.processed += r.processed;
    total.done += r.done;
    total.failed += r.failed;
    total.skipped += r.skipped;
    if (r.processed === 0) break;
  }
  return total;
}
