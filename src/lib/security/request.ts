import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { authSecret, siteUrl } from "../config";
import { getDb } from "../db";
import { rateLimits } from "../db/schema";

type HeaderBag = { get(name: string): string | null };

/** Adresse IP du client (Vercel renseigne x-forwarded-for). Jamais stockée en clair. */
export function clientIp(headers: HeaderBag) {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function hashIdentifier(value: string) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("hex").slice(0, 32);
}

/**
 * Limitation de fréquence en base (fenêtre fixe) : fonctionne même avec plusieurs instances serverless.
 * Retourne true si la requête est autorisée.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const k = `${key.split(":")[0]}:${hashIdentifier(key)}`;
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key: k, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} < now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} < now() then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return (row?.count ?? 1) <= max;
}

/** Protection CSRF des routes API : l'en-tête Origin doit correspondre au site. */
export function isSameOrigin(headers: HeaderBag) {
  const origin = headers.get("origin");
  if (!origin) return false;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true;
    return o.origin === new URL(siteUrl()).origin;
  } catch {
    return false;
  }
}

/**
 * Anti-robots sans service tiers : champ piège invisible (« website ») + délai minimum de remplissage.
 * `startedAt` est horodaté côté client à l'ouverture du formulaire.
 */
export function looksLikeBot(input: { honeypot?: unknown; startedAt?: unknown }, minSeconds = 3) {
  if (typeof input.honeypot === "string" && input.honeypot.trim() !== "") return true;
  const started = Number(input.startedAt);
  if (!Number.isFinite(started) || started <= 0) return true;
  const elapsed = (Date.now() - started) / 1000;
  return elapsed < minSeconds || elapsed > 60 * 60 * 24;
}
