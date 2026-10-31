import { sql } from "drizzle-orm";
import type { Executor } from "../db";
import { jobs, type JobType } from "../db/schema";

export interface EnqueueInput {
  type: JobType;
  dedupeKey: string;
  bookingId?: string | null;
  payload?: Record<string, unknown>;
  /**
   * once : n'insère jamais deux fois la même clé (e-mails → pas de doublon d'envoi).
   * replace : remet la tâche à exécuter (synchronisations idempotentes « aligner sur l'état actuel »).
   */
  mode: "once" | "replace";
  runAt?: Date;
}

export async function enqueue(db: Executor, input: EnqueueInput) {
  const now = new Date();
  const values = {
    type: input.type,
    dedupeKey: input.dedupeKey,
    bookingId: input.bookingId ?? null,
    payload: input.payload ?? {},
    status: "PENDING" as const,
    runAt: input.runAt ?? now,
  };
  if (input.mode === "once") {
    await db.insert(jobs).values(values).onConflictDoNothing({ target: jobs.dedupeKey });
  } else {
    await db
      .insert(jobs)
      .values(values)
      .onConflictDoUpdate({
        target: jobs.dedupeKey,
        set: {
          status: "PENDING",
          payload: values.payload,
          attempts: 0,
          runAt: values.runAt,
          lastError: null,
          completedAt: null,
          updatedAt: sql`now()`,
        },
      });
  }
}

export async function enqueueBookingSync(db: Executor, bookingId: string) {
  await enqueue(db, { type: "calendar.sync", dedupeKey: `calendar:${bookingId}`, bookingId, mode: "replace" });
  await enqueue(db, { type: "sheets.sync", dedupeKey: `sheets:${bookingId}`, bookingId, mode: "replace" });
}
