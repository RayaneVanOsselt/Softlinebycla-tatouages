import { after } from "next/server";
import { createContactMessage } from "@/lib/contact";
import { json } from "@/lib/http";
import { processJobs } from "@/lib/jobs/processor";
import { logger } from "@/lib/logger";
import { clientIp, isSameOrigin, looksLikeBot, rateLimit } from "@/lib/security/request";
import { contactSchema, fieldErrors } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return json({ code: "FORBIDDEN" }, 403);
  if (!(await rateLimit(`contact:${clientIp(req.headers)}`, 5, 15 * 60))) return json({ code: "RATE_LIMITED" }, 429);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ code: "INVALID" }, 400);
  }
  if (looksLikeBot({ honeypot: form.get("website"), startedAt: form.get("startedAt") }, 3)) return json({ code: "SPAM" }, 400);
  const parsed = contactSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return json({ code: "VALIDATION", fieldErrors: fieldErrors(parsed.error) }, 400);
  try {
    // Le succès n'est renvoyé qu'une fois le message réellement enregistré en base.
    await createContactMessage(parsed.data);
    after(() => processJobs({ limit: 5 }).catch((error) => logger.error("jobs.after_failed", { error })));
    return json({ ok: true }, 201);
  } catch (error) {
    logger.error("contact.failed", { error });
    return json({ code: "ERROR" }, 500);
  }
}
