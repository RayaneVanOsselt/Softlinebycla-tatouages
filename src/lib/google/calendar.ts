import { bookingConfig, googleConfig, siteUrl } from "../config";
import type { Booking } from "../db/schema";
import type { Interval } from "../booking/slots";
import { formatDuration, zonedToUtc } from "../time";
import { GoogleNotConfiguredError, SCOPES, googleFetch } from "./client";

const API = "https://www.googleapis.com/calendar/v3";

export function calendarConfigured() {
  const cfg = googleConfig();
  return Boolean(cfg?.calendarId);
}

/** Identifiant d'événement déterministe (base32hex) : relie la réservation à son événement, rend la création idempotente. */
export function eventIdForBooking(bookingId: string) {
  return `slc${bookingId.replace(/-/g, "").toLowerCase()}`;
}

interface GEvent {
  id: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

/**
 * Plages occupées dans l'agenda connecté (hors événements créés par ce site,
 * dont la base de données est la source de vérité) + agendas « occupé » supplémentaires.
 */
export async function listBusyIntervals(timeMin: Date, timeMax: Date): Promise<Interval[]> {
  const cfg = googleConfig();
  if (!cfg?.calendarId) throw new GoogleNotConfiguredError("Google Agenda");
  const busy: Interval[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      maxResults: "2500",
      fields: "nextPageToken,items(id,status,transparency,start,end,extendedProperties)",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleFetch<{ items?: GEvent[]; nextPageToken?: string }>(
      `${API}/calendars/${encodeURIComponent(cfg.calendarId)}/events?${params}`,
      { scopes: [SCOPES.calendarEvents], timeoutMs: 6000 },
    );
    for (const ev of data?.items ?? []) {
      if (ev.status === "cancelled" || ev.transparency === "transparent") continue;
      if (ev.extendedProperties?.private?.slcBookingId) continue;
      // Les événements « journée entière » sont exprimés en date locale : on les convertit dans le fuseau du studio.
      const s = ev.start?.dateTime ? new Date(ev.start.dateTime) : ev.start?.date ? zonedMidnight(ev.start.date) : undefined;
      const e = ev.end?.dateTime ? new Date(ev.end.dateTime) : ev.end?.date ? zonedMidnight(ev.end.date) : undefined;
      if (!s || !e) continue;
      busy.push({ start: s.getTime(), end: e.getTime() });
    }
    pageToken = data?.nextPageToken;
  } while (pageToken);

  if (cfg.extraBusyCalendarIds.length) {
    const fb = await googleFetch<{ calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }> }>(`${API}/freeBusy`, {
      method: "POST",
      scopes: [SCOPES.freebusy],
      timeoutMs: 6000,
      body: { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), timeZone: bookingConfig.timezone, items: cfg.extraBusyCalendarIds.map((id) => ({ id })) },
    });
    for (const cal of Object.values(fb?.calendars ?? {})) {
      for (const b of cal.busy ?? []) busy.push({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() });
    }
  }
  return busy;
}

function zonedMidnight(dateKey: string) {
  return zonedToUtc(dateKey, 0);
}

/** Aligne l'événement Google sur l'état actuel de la réservation (idempotent). */
export async function syncBookingEvent(booking: Booking): Promise<{ action: "created" | "updated" | "deleted" | "none"; eventId: string | null }> {
  const cfg = googleConfig();
  if (!cfg?.calendarId) throw new GoogleNotConfiguredError("Google Agenda");
  const calendar = encodeURIComponent(cfg.calendarId);
  const eventId = booking.calendarEventId ?? eventIdForBooking(booking.id);
  const url = `${API}/calendars/${calendar}/events/${eventId}`;

  const terminal = ["DECLINED", "CANCELLED", "EXPIRED"].includes(booking.status);
  const existing = await googleFetch<GEvent>(url, { scopes: [SCOPES.calendarEvents], allow404: true });

  if (terminal) {
    if (existing && existing.status !== "cancelled") {
      await googleFetch(`${url}?sendUpdates=none`, { method: "DELETE", scopes: [SCOPES.calendarEvents], allow404: true });
      return { action: "deleted", eventId };
    }
    return { action: "none", eventId: existing ? eventId : null };
  }

  const minutes = booking.finalDurationMinutes ?? booking.estimatedDurationMinutes;
  const confirmed = booking.status === "CONFIRMED" || booking.status === "COMPLETED";
  const prefix = booking.status === "PENDING" ? "⏳ Demande" : booking.status === "RESCHEDULE_PROPOSED" ? "↺ Proposition" : "✦";
  const body = {
    id: eventId,
    summary: `${prefix} ${booking.firstName} ${booking.lastName} — tatouage (${formatDuration(minutes, "fr")})`,
    description: [
      `Référence : ${booking.reference}`,
      `Statut : ${booking.status}`,
      `Client : ${booking.firstName} ${booking.lastName} <${booking.email}>`,
      booking.placement ? `Zone : ${booking.placement}` : null,
      booking.approximateSize ? `Taille : ${booking.approximateSize}` : null,
      "",
      booking.projectDescription,
      "",
      `Gérer : ${siteUrl()}/admin/reservations/${booking.id}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
    start: { dateTime: booking.startAt.toISOString(), timeZone: bookingConfig.timezone },
    end: { dateTime: booking.endAt.toISOString(), timeZone: bookingConfig.timezone },
    // Tant que l'artiste n'a pas validé : événement « provisoire » qui n'apparaît pas comme occupé.
    status: confirmed ? "confirmed" : "tentative",
    transparency: confirmed ? "opaque" : "transparent",
    colorId: confirmed ? "6" : "8",
    extendedProperties: { private: { slcBookingId: booking.id, slcReference: booking.reference } },
    reminders: { useDefault: true },
  };

  if (existing) {
    await googleFetch(`${url}?sendUpdates=none`, { method: "PUT", body, scopes: [SCOPES.calendarEvents] });
    return { action: "updated", eventId };
  }
  await googleFetch(`${API}/calendars/${calendar}/events?sendUpdates=none`, { method: "POST", body, scopes: [SCOPES.calendarEvents] });
  return { action: "created", eventId };
}
