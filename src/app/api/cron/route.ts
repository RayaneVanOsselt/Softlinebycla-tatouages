import { cronSecret } from "@/lib/config";
import { json } from "@/lib/http";
import { logger } from "@/lib/logger";
import { runMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tâche planifiée (Vercel Cron, 1×/jour) : expirations, relances e-mails/Google, purge RGPD. */
export async function GET(req: Request) {
  const secret = cronSecret();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ code: "UNAUTHORIZED" }, 401);
  try {
    return json(await runMaintenance());
  } catch (error) {
    logger.error("cron.failed", { error });
    return json({ code: "ERROR" }, 500);
  }
}
