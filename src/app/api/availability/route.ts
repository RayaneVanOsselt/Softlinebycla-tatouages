import { getMonthAvailability } from "@/lib/booking/service";
import { json } from "@/lib/http";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/security/request";
import { isMonthKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Disponibilités publiques d'un mois : uniquement des états de créneaux, jamais d'information sur les réservations. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const duration = Number(url.searchParams.get("duration") ?? 60);
  if (!isMonthKey(month) || !Number.isFinite(duration)) return json({ code: "INVALID" }, 400);
  if (!(await rateLimit(`availability:${clientIp(req.headers)}`, 120, 60))) return json({ code: "RATE_LIMITED" }, 429);
  try {
    const data = await getMonthAvailability(month, Math.round(duration / 60) * 60);
    return json(data);
  } catch (error) {
    logger.error("availability.failed", { error });
    return json({ code: "ERROR" }, 500);
  }
}
