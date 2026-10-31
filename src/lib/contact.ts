import { getDb } from "./db";
import { contactMessages } from "./db/schema";
import { enqueue } from "./jobs/queue";
import { emails } from "./email/templates";
import { adminEmails, siteUrl } from "./config";
import { getSetting } from "./settings";
import type { ContactPayload } from "./validation";

/** Enregistre le message (source de vérité) et met en file la notification + l'accusé de réception. */
export async function createContactMessage(input: Omit<ContactPayload, "consent">) {
  const db = await getDb();
  const contact = await getSetting("contact", db);
  const to = contact.contactEmail || contact.bookingNotificationEmail || adminEmails()[0];
  return db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(contactMessages)
      .values({ firstName: input.firstName, lastName: input.lastName, email: input.email.toLowerCase(), subject: input.subject, message: input.message, locale: input.locale })
      .returning();
    if (to) {
      await enqueue(tx, {
        type: "email",
        dedupeKey: `email:contact:${msg!.id}:admin`,
        mode: "once",
        payload: { email: emails.adminContact(input, `${siteUrl()}/admin/messages`, to) },
      });
    }
    if (contact.contactAutoReply) {
      await enqueue(tx, {
        type: "email",
        dedupeKey: `email:contact:${msg!.id}:ack`,
        mode: "once",
        payload: { email: emails.contactAck({ locale: input.locale, firstName: input.firstName, email: input.email, subject: input.subject, message: input.message }) },
      });
    }
    return msg!;
  });
}
