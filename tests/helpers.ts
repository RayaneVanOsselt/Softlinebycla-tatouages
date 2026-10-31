import { createPgliteDb, setDbOverride, type Database } from "@/lib/db";
import { setEmailSenderForTesting, type OutgoingEmail } from "@/lib/email/transport";
import { availabilitySlots } from "@/lib/db/schema";

export async function setupDb() {
  const db = await createPgliteDb();
  setDbOverride(db);
  return db;
}

export function captureEmails() {
  const sent: OutgoingEmail[] = [];
  setEmailSenderForTesting(async (e) => {
    sent.push(e);
    return { messageId: `test-${sent.length}` };
  });
  return sent;
}

export async function openDay(db: Database, date: string, hours = [11, 12, 13, 14, 15, 16, 17, 18, 19]) {
  await db.insert(availabilitySlots).values(hours.map((h) => ({ date, startMinute: h * 60 }))).onConflictDoNothing();
}

export const baseRequest = {
  firstName: "Léa",
  lastName: "Martin",
  email: "lea@example.com",
  locale: "fr" as const,
  projectDescription: "Une petite branche de lys en fine line sur l'avant-bras.",
};
