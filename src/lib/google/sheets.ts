import { googleConfig } from "../config";
import type { Booking } from "../db/schema";
import { STATUS_LABELS_FR } from "../booking/status";
import { formatDuration, minuteToHm, utcToZoned } from "../time";
import { GoogleApiError, GoogleNotConfiguredError, SCOPES, googleFetch } from "./client";

const API = "https://sheets.googleapis.com/v4/spreadsheets";

export const SHEET_HEADERS = [
  "ID réservation",
  "Date de création",
  "Prénom",
  "Nom",
  "E-mail",
  "Date demandée",
  "Début",
  "Fin",
  "Durée",
  "Projet",
  "Emplacement",
  "Taille",
  "Statut",
  "Référence Calendar",
  "Notes",
] as const;

const LAST_COL = "O";

export function sheetsConfigured() {
  return Boolean(googleConfig()?.sheetsId);
}

export function bookingToRow(b: Booking): string[] {
  const created = utcToZoned(b.createdAt);
  const start = utcToZoned(b.startAt);
  const end = utcToZoned(b.endAt);
  const minutes = b.finalDurationMinutes ?? b.estimatedDurationMinutes;
  return [
    b.reference,
    `${created.date} ${minuteToHm(created.minute)}`,
    b.firstName,
    b.lastName,
    b.email,
    start.date,
    minuteToHm(start.minute),
    minuteToHm(end.minute),
    formatDuration(minutes, "fr"),
    b.projectDescription,
    b.placement ?? "",
    b.approximateSize ?? "",
    STATUS_LABELS_FR[b.status],
    b.calendarEventId ?? "",
    b.adminNotes ?? "",
  ];
}

function cfgOrThrow() {
  const cfg = googleConfig();
  if (!cfg?.sheetsId) throw new GoogleNotConfiguredError("Google Sheets");
  return cfg as typeof cfg & { sheetsId: string };
}

const range = (tab: string, a1: string) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${a1}`);

async function ensureSheet(sheetsId: string, tab: string) {
  const meta = await googleFetch<{ sheets?: Array<{ properties?: { title?: string } }> }>(`${API}/${sheetsId}?fields=sheets.properties.title`, {
    scopes: [SCOPES.sheets],
  });
  const exists = meta?.sheets?.some((s) => s.properties?.title === tab);
  if (!exists) {
    await googleFetch(`${API}/${sheetsId}:batchUpdate`, {
      method: "POST",
      scopes: [SCOPES.sheets],
      body: { requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] },
    });
  }
  const header = await googleFetch<{ values?: string[][] }>(`${API}/${sheetsId}/values/${range(tab, `A1:${LAST_COL}1`)}`, { scopes: [SCOPES.sheets] });
  const current = header?.values?.[0] ?? [];
  if (SHEET_HEADERS.some((h, i) => current[i] !== h)) {
    await googleFetch(`${API}/${sheetsId}/values/${range(tab, `A1:${LAST_COL}1`)}?valueInputOption=RAW`, {
      method: "PUT",
      scopes: [SCOPES.sheets],
      body: { values: [SHEET_HEADERS] },
    });
  }
}

/** Insère ou met à jour la ligne de la réservation (recherche par ID réservation → jamais de doublon). */
export async function upsertBookingRow(booking: Booking) {
  const cfg = cfgOrThrow();
  await ensureSheet(cfg.sheetsId, cfg.sheetsTab);
  const col = await googleFetch<{ values?: string[][] }>(`${API}/${cfg.sheetsId}/values/${range(cfg.sheetsTab, "A:A")}?majorDimension=COLUMNS`, {
    scopes: [SCOPES.sheets],
  });
  const ids = col?.values?.[0] ?? [];
  const index = ids.indexOf(booking.reference);
  const row = bookingToRow(booking);
  // valueInputOption=RAW : le texte saisi par un client n'est jamais interprété comme une formule.
  if (index >= 1) {
    const n = index + 1;
    await googleFetch(`${API}/${cfg.sheetsId}/values/${range(cfg.sheetsTab, `A${n}:${LAST_COL}${n}`)}?valueInputOption=RAW`, {
      method: "PUT",
      scopes: [SCOPES.sheets],
      body: { values: [row] },
    });
    return { action: "updated" as const, row: n };
  }
  await googleFetch(`${API}/${cfg.sheetsId}/values/${range(cfg.sheetsTab, `A:${LAST_COL}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    scopes: [SCOPES.sheets],
    body: { values: [row] },
  });
  return { action: "appended" as const };
}

/** Procédure de resynchronisation complète : réécrit toutes les lignes depuis la base (source de vérité). */
export async function rebuildSheet(all: Booking[]) {
  const cfg = cfgOrThrow();
  await ensureSheet(cfg.sheetsId, cfg.sheetsTab);
  await googleFetch(`${API}/${cfg.sheetsId}/values/${range(cfg.sheetsTab, `A2:${LAST_COL}`)}:clear`, { method: "POST", scopes: [SCOPES.sheets], body: {} });
  if (all.length === 0) return { rows: 0 };
  const rows = all.map(bookingToRow);
  await googleFetch(`${API}/${cfg.sheetsId}/values/${range(cfg.sheetsTab, `A2:${LAST_COL}${rows.length + 1}`)}?valueInputOption=RAW`, {
    method: "PUT",
    scopes: [SCOPES.sheets],
    body: { values: rows },
  });
  return { rows: rows.length };
}

export { GoogleApiError };
