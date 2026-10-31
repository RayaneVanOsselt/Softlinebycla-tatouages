import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createContactMessage } from "@/lib/contact";
import { contactMessages, jobs } from "@/lib/db/schema";
import { drainJobs } from "@/lib/jobs/processor";
import { setEmailSenderForTesting } from "@/lib/email/transport";
import { saveSetting } from "@/lib/settings";
import { contactSchema } from "@/lib/validation";
import { captureEmails, setupDb } from "./helpers";

beforeEach(async () => {
  process.env.ADMIN_EMAILS = "artist@example.com";
});
afterEach(() => setEmailSenderForTesting(undefined));

describe("formulaire de contact", () => {
  it("valide côté serveur", () => {
    const r = contactSchema.safeParse({ firstName: "", lastName: "X", email: "nope", locale: "fr", subject: "S", message: "court", consent: "false" });
    expect(r.success).toBe(false);
  });

  it("enregistre le message puis l'envoie à l'artiste avec reply-to client", async () => {
    const db = await setupDb();
    await saveSetting("contact", { contactEmail: "pro@example.com", bookingNotificationEmail: "", contactAutoReply: true }, db);
    const sent = captureEmails();
    const msg = await createContactMessage({ firstName: "Ana", lastName: "B", email: "ana@example.com", locale: "en", subject: "Question", message: "Bonjour, une question sur un projet." });
    const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, msg.id));
    expect(row?.status).toBe("NEW");
    await drainJobs();
    const toArtist = sent.find((e) => e.to === "pro@example.com");
    expect(toArtist?.replyTo).toBe("ana@example.com");
    const ack = sent.find((e) => e.to === "ana@example.com");
    expect(ack?.subject).toMatch(/received your message/);
    const done = await db.select().from(jobs);
    expect(done.every((j) => j.status === "DONE")).toBe(true);
  });
});
