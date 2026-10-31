/**
 * Client Google minimal (compte de service, JWT signé RS256 avec le module crypto de Node).
 * Aucune dépendance lourde : uniquement les API REST officielles Calendar v3 et Sheets v4.
 */
import crypto from "node:crypto";
import { googleConfig } from "../config";

export const SCOPES = {
  calendarEvents: "https://www.googleapis.com/auth/calendar.events",
  freebusy: "https://www.googleapis.com/auth/calendar.freebusy",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
} as const;

export class GoogleNotConfiguredError extends Error {
  constructor(what: string) {
    super(`${what} n'est pas configuré`);
    this.name = "GoogleNotConfiguredError";
  }
}

export class GoogleApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

async function getAccessToken(scopes: string[]): Promise<string> {
  const cfg = googleConfig();
  if (!cfg) throw new GoogleNotConfiguredError("Le compte de service Google");
  const cacheKey = `${cfg.clientEmail}|${scopes.sort().join(" ")}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: cfg.clientEmail, scope: scopes.join(" "), aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 }),
  );
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), cfg.privateKey).toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new GoogleApiError(res.status, `Authentification Google refusée : ${json.error_description ?? json.error ?? res.statusText}`);
  }
  tokenCache.set(cacheKey, { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 });
  return json.access_token;
}

export async function googleFetch<T>(
  url: string,
  init: { method?: string; body?: unknown; scopes: string[]; timeoutMs?: number; allow404?: boolean },
): Promise<T | null> {
  const token = await getAccessToken(init.scopes);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(init.timeoutMs ?? 10_000),
  });
  if ((res.status === 404 || res.status === 410) && init.allow404) return null;
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 300);
    try {
      message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? message;
    } catch {}
    throw new GoogleApiError(res.status, `Google API ${res.status} : ${message}`);
  }
  return text ? (JSON.parse(text) as T) : null;
}
