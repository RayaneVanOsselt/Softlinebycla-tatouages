import { after } from "next/server";
import { z } from "zod";
import { BookingError, respondToProposal } from "@/lib/booking/service";
import { json } from "@/lib/http";
import { processJobs } from "@/lib/jobs/processor";
import { logger } from "@/lib/logger";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security/request";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(20).max(100), choice: z.enum(["accept", "decline"]) });

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return json({ code: "FORBIDDEN" }, 403);
  if (!(await rateLimit(`respond:${clientIp(req.headers)}`, 20, 15 * 60))) return json({ code: "RATE_LIMITED" }, 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ code: "INVALID" }, 400);
  try {
    const b = await respondToProposal(parsed.data.token, parsed.data.choice);
    after(() => processJobs({ bookingId: b.id }).catch((error) => logger.error("jobs.after_failed", { error })));
    return json({ status: b.status });
  } catch (error) {
    if (error instanceof BookingError) return json({ code: error.code }, error.code === "NOT_FOUND" ? 404 : 409);
    logger.error("booking.respond_failed", { error });
    return json({ code: "ERROR" }, 500);
  }
}
