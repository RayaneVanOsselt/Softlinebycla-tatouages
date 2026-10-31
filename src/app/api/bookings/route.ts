import { after } from "next/server";
import sharp from "sharp";
import { BookingError, createBookingRequest } from "@/lib/booking/service";
import { json } from "@/lib/http";
import { processJobs } from "@/lib/jobs/processor";
import { logger } from "@/lib/logger";
import { clientIp, isSameOrigin, looksLikeBot, rateLimit } from "@/lib/security/request";
import { hmToMinute } from "@/lib/time";
import { ATTACHMENT_LIMITS, bookingRequestSchema, fieldErrors, sniffImageType } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return json({ code: "FORBIDDEN" }, 403);
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`booking:${ip}`, 6, 15 * 60))) return json({ code: "RATE_LIMITED" }, 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ code: "INVALID" }, 400);
  }
  if (looksLikeBot({ honeypot: form.get("website"), startedAt: form.get("startedAt") }, 4)) return json({ code: "SPAM" }, 400);

  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = bookingRequestSchema.safeParse(fields);
  if (!parsed.success) return json({ code: "VALIDATION", fieldErrors: fieldErrors(parsed.error) }, 400);
  const input = parsed.data;
  if (!(await rateLimit(`booking-email:${input.email.toLowerCase()}`, 4, 60 * 60))) return json({ code: "RATE_LIMITED" }, 429);

  // Images de référence : type vérifié par signature binaire, ré-encodées (métadonnées supprimées), stockage privé
  const files = form.getAll("references").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);
  if (files.length > ATTACHMENT_LIMITS.maxFiles) return json({ code: "VALIDATION", fieldErrors: { references: "file_count" } }, 400);
  if (files.reduce((n, f) => n + f.size, 0) > ATTACHMENT_LIMITS.maxBytesTotal) return json({ code: "VALIDATION", fieldErrors: { references: "file_size" } }, 400);
  const attachments = [];
  for (const [i, f] of files.entries()) {
    if (f.size > ATTACHMENT_LIMITS.maxBytesEach) return json({ code: "VALIDATION", fieldErrors: { references: "file_size" } }, 400);
    const buf = Buffer.from(await f.arrayBuffer());
    if (!sniffImageType(buf)) return json({ code: "VALIDATION", fieldErrors: { references: "file_type" } }, 400);
    try {
      const { data, info } = await sharp(buf, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      attachments.push({ filename: `reference-${i + 1}.jpg`, mimeType: "image/jpeg", data, width: info.width, height: info.height });
    } catch {
      return json({ code: "VALIDATION", fieldErrors: { references: "file_type" } }, 400);
    }
  }

  try {
    const booking = await createBookingRequest({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      locale: input.locale,
      date: input.date,
      startMinute: hmToMinute(input.start),
      durationMinutes: input.durationMinutes,
      projectDescription: input.projectDescription,
      placement: input.placement,
      approximateSize: input.approximateSize,
      style: input.style,
      comment: input.comment,
      attachments,
    });
    // E-mails et synchronisations après la réponse : la demande est déjà enregistrée, une panne externe ne la perd pas.
    after(() => processJobs({ bookingId: booking.id }).catch((error) => logger.error("jobs.after_failed", { error })));
    return json({ reference: booking.reference }, 201);
  } catch (error) {
    if (error instanceof BookingError) {
      const status = error.code === "INVALID" ? 400 : 409;
      return json({ code: error.code }, status);
    }
    logger.error("booking.create_failed", { error });
    return json({ code: "ERROR" }, 500);
  }
}
