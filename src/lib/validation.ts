import { z } from "zod";
import { isDateKey } from "./time";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: "too_long" })
    .optional()
    .transform((v) => (v ? v : undefined));

const name = z.string().trim().min(1, { message: "required" }).max(80, { message: "too_long" });
const email = z.string().trim().min(1, { message: "required" }).max(200, { message: "too_long" }).pipe(z.email({ message: "invalid_email" }));
const locale = z.enum(["fr", "nl", "en"]);

export const bookingRequestSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  locale,
  date: z.string().refine(isDateKey, { message: "invalid_date" }),
  start: z.string().regex(/^\d{2}:\d{2}$/, { message: "invalid_time" }),
  durationMinutes: z.coerce.number().int().min(60, { message: "invalid_duration" }).max(540, { message: "invalid_duration" }),
  projectDescription: z.string().trim().min(20, { message: "too_short" }).max(3000, { message: "too_long" }),
  placement: optionalText(120),
  approximateSize: optionalText(60),
  style: optionalText(120),
  comment: optionalText(2000),
  consent: z.literal("true", { message: "consent_required" }),
});
export type BookingRequestPayload = z.infer<typeof bookingRequestSchema>;

export const contactSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  locale,
  subject: z.string().trim().min(2, { message: "required" }).max(150, { message: "too_long" }),
  message: z.string().trim().min(10, { message: "too_short" }).max(5000, { message: "too_long" }),
  consent: z.literal("true", { message: "consent_required" }),
});
export type ContactPayload = z.infer<typeof contactSchema>;

/** Erreurs de validation → { champ: code } traduisible côté interface. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (out[key]) continue;
    out[key] = /^[a-z_]+$/.test(issue.message) ? issue.message : "invalid";
  }
  return out;
}

/* ───────────── Fichiers de référence (images privées) ───────────── */

export const ATTACHMENT_LIMITS = { maxFiles: 3, maxBytesEach: 1.5 * 1024 * 1024, maxBytesTotal: 4.2 * 1024 * 1024 };

export function sniffImageType(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
