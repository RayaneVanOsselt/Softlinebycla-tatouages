/**
 * Tâches de maintenance (lancées par la tâche planifiée quotidienne et depuis l'administration) :
 * expiration des demandes, rendez-vous passés → terminés, purge RGPD, nettoyage technique.
 */
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { adminLoginTokens, adminSessions, bookingAttachments, bookingEvents, bookings, contactMessages, jobs, rateLimits } from "./db/schema";
import { sweepExpired } from "./booking/service";
import { enqueueBookingSync } from "./jobs/queue";
import { drainJobs } from "./jobs/processor";
import { logger } from "./logger";
import { getSetting } from "./settings";

export async function runMaintenance(now = new Date()) {
  const db = await getDb();
  const cfg = await getSetting("booking", db);
  const report: Record<string, number | object> = {};

  report.expired = await db.transaction((tx) => sweepExpired(tx, now));

  // Rendez-vous confirmés passés depuis plus de 24 h → terminés
  report.completed = await db.transaction(async (tx) => {
    const done = await tx
      .update(bookings)
      .set({ status: "COMPLETED", updatedAt: now, version: sql`${bookings.version} + 1` })
      .where(and(eq(bookings.status, "CONFIRMED"), lt(bookings.endAt, new Date(now.getTime() - 86_400_000))))
      .returning({ id: bookings.id });
    for (const b of done) {
      await tx.insert(bookingEvents).values({ bookingId: b.id, action: "completed", fromStatus: "CONFIRMED", toStatus: "COMPLETED", actor: "system" });
      await enqueueBookingSync(tx, b.id);
    }
    return done.length;
  });

  // Images de référence : suppression après le délai de conservation (rendez-vous passé ou demande close)
  const attachmentCutoff = new Date(now.getTime() - cfg.attachmentRetentionDays * 86_400_000);
  const closed = db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      or(
        lt(bookings.endAt, attachmentCutoff),
        and(inArray(bookings.status, ["DECLINED", "CANCELLED", "EXPIRED"]), lt(bookings.updatedAt, attachmentCutoff)),
      ),
    );
  const purged = await db.delete(bookingAttachments).where(inArray(bookingAttachments.bookingId, closed)).returning({ id: bookingAttachments.id });
  report.attachmentsDeleted = purged.length;

  // Anonymisation des anciennes demandes et suppression des anciens messages
  const dataCutoff = new Date(now.getTime());
  dataCutoff.setMonth(dataCutoff.getMonth() - cfg.dataRetentionMonths);
  const anonymized = await db
    .update(bookings)
    .set({
      firstName: "—",
      lastName: "—",
      email: sql`'anonymise+' || ${bookings.id} || '@invalid'`,
      projectDescription: "[anonymisé]",
      placement: null,
      approximateSize: null,
      style: null,
      comment: null,
      adminNotes: null,
      clientMessage: null,
      anonymizedAt: now,
    })
    .where(and(isNull(bookings.anonymizedAt), lt(bookings.endAt, dataCutoff), inArray(bookings.status, ["COMPLETED", "DECLINED", "CANCELLED", "EXPIRED"])))
    .returning({ id: bookings.id });
  report.bookingsAnonymized = anonymized.length;
  for (const b of anonymized) await enqueueBookingSync(db, b.id);
  const removedMessages = await db.delete(contactMessages).where(lt(contactMessages.createdAt, dataCutoff)).returning({ id: contactMessages.id });
  report.messagesDeleted = removedMessages.length;

  // Nettoyage technique
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date(now.getTime() - 86_400_000)));
  await db.delete(adminLoginTokens).where(lt(adminLoginTokens.expiresAt, now));
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
  // Les e-mails envoyés contiennent des données personnelles : on vide leur contenu après 30 jours (la trace reste).
  await db
    .update(jobs)
    .set({ payload: sql`jsonb_build_object('email', jsonb_build_object('to', '[purgé]', 'subject', ${jobs.payload}->'email'->>'subject'))` })
    .where(and(eq(jobs.type, "email"), inArray(jobs.status, ["DONE", "SKIPPED", "FAILED"]), lt(jobs.updatedAt, new Date(now.getTime() - 30 * 86_400_000)), sql`${jobs.payload}->'email'->>'to' <> '[purgé]'`));

  report.jobs = await drainJobs(10);
  logger.info("maintenance.done", report);
  return report;
}
