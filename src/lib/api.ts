/**
 * Client du moteur de réservation (Google Apps Script, voir dossier apps-script/).
 * Les requêtes POST sont envoyées en text/plain (requête « simple ») : pas de pré-vérification CORS,
 * ce qui est indispensable avec Google Apps Script.
 */
import { bookingApiUrl } from "./config";

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; code: string; fieldErrors?: Record<string, string> };

export const apiConfigured = () => Boolean(bookingApiUrl());

async function call<T>(method: "GET" | "POST", params: Record<string, string>, body?: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  const base = bookingApiUrl();
  if (!base) return { ok: false, code: "NOT_CONFIGURED" };
  const url = `${base}${base.includes("?") ? "&" : "?"}${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, {
      method,
      signal,
      redirect: "follow",
      cache: "no-store",
      ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" } } : {}),
    });
    if (!res.ok) return { ok: false, code: "NETWORK" };
    return (await res.json()) as ApiResult<T>;
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { ok: false, code: "NETWORK" };
  }
}

export interface SlotView {
  startMinute: number;
  start: string;
  end: string;
  status: "available" | "held" | "unavailable";
}
export interface DayView {
  date: string;
  state: "available" | "held" | "full" | "closed";
  slots: SlotView[];
}
export interface MonthData {
  month: string;
  today: string;
  maxDate: string;
  durationMinutes: number;
  maxDurationMinutes: number;
  days: DayView[];
}

export const api = {
  availability: (month: string, duration: number, signal?: AbortSignal) => call<MonthData>("GET", { action: "availability", month, duration: String(duration) }, undefined, signal),
  book: (payload: Record<string, unknown>) => call<{ reference: string }>("POST", { action: "book" }, { action: "book", ...payload }),
  contact: (payload: Record<string, unknown>) => call<Record<string, never>>("POST", { action: "contact" }, { action: "contact", ...payload }),
  proposal: (token: string) =>
    call<{ firstName: string; locale: string; start: string; end: string; reference: string; message: string | null; holdUntil: string | null }>("GET", { action: "proposal", token }),
  respond: (token: string, choice: "accept" | "decline") => call<{ status: string }>("POST", { action: "respond" }, { action: "respond", token, choice }),
};
