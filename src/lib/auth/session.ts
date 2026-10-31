/**
 * Authentification administrateur par lien magique envoyé par e-mail (aucun mot de passe à retenir).
 * - Seules les adresses listées dans ADMIN_EMAILS peuvent se connecter.
 * - Jeton de connexion : 15 min, usage unique, stocké haché.
 * - Session : cookie HttpOnly + Secure + SameSite=Lax, jeton aléatoire stocké haché, 30 jours.
 */
import crypto from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminEmails, authSecret, siteUrl } from "../config";
import { getDb } from "../db";
import { adminLoginTokens, adminSessions } from "../db/schema";
import { emails } from "../email/templates";
import { EmailNotConfiguredError, sendEmail } from "../email/transport";
import { logger } from "../logger";

export const SESSION_COOKIE = "slc_admin";
const SESSION_DAYS = 30;
const LOGIN_TOKEN_MINUTES = 15;

const hash = (token: string) => crypto.createHmac("sha256", authSecret()).update(token).digest("hex");

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.trim().toLowerCase());
}

export type LoginRequestResult = { status: "sent" } | { status: "dev-link"; link: string } | { status: "email-not-configured" };

/** Envoie un lien de connexion si l'adresse est autorisée. La réponse ne révèle jamais si l'adresse existe. */
export async function requestLoginLink(emailRaw: string): Promise<LoginRequestResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!isAdminEmail(email)) return { status: "sent" };
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  await db.insert(adminLoginTokens).values({ tokenHash: hash(token), email, expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000) });
  const link = `${siteUrl()}/admin/connexion/verifier?token=${encodeURIComponent(token)}`;
  try {
    await sendEmail(emails.adminLogin(link, email));
    return { status: "sent" };
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      if (process.env.NODE_ENV !== "production") {
        logger.info("auth.dev_login_link", { note: "SMTP non configuré : lien affiché uniquement en développement" });
        console.log(`\n🔑  Lien de connexion admin (développement) : ${link}\n`);
        return { status: "dev-link", link };
      }
      return { status: "email-not-configured" };
    }
    logger.error("auth.login_email_failed", { error });
    throw error;
  }
}

/** Consomme le jeton (usage unique) et ouvre une session. */
export async function consumeLoginToken(token: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(adminLoginTokens)
    .set({ usedAt: now })
    .where(and(eq(adminLoginTokens.tokenHash, hash(token)), isNull(adminLoginTokens.usedAt), gt(adminLoginTokens.expiresAt, now)))
    .returning();
  if (!row || !isAdminEmail(row.email)) return false;

  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.insert(adminSessions).values({ tokenHash: hash(sessionToken), email: row.email, expiresAt });
  await db.delete(adminLoginTokens).where(lt(adminLoginTokens.expiresAt, now));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

export interface AdminSession {
  email: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [s] = await db
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, hash(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  // L'adresse doit toujours figurer dans ADMIN_EMAILS (retrait immédiat possible).
  if (!s || !isAdminEmail(s.email)) return null;
  if (Date.now() - s.lastSeenAt.getTime() > 3_600_000) {
    await db.update(adminSessions).set({ lastSeenAt: new Date() }).where(eq(adminSessions.id, s.id));
  }
  return { email: s.email };
}

/** À appeler en tête de chaque page, action ou route d'administration. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) redirect("/admin/connexion");
  return s;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hash(token)));
  }
  jar.delete(SESSION_COOKIE);
}
