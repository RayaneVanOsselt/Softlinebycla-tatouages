/**
 * Moteur de disponibilités — fonctions pures, sans accès base de données (testées unitairement).
 *
 * Disponibilité publiée = créneaux ouverts manuellement par l'artiste
 *   ∩ plage autorisée (11:00–20:00 par défaut)
 *   − réservations bloquantes (en attente, proposées, confirmées)
 *   − périodes bloquées
 *   − occupations Google Agenda
 *   − délai de prévenance / fenêtre de réservation.
 */
import { bookingConfig } from "../config";
import { addDays, slotStartMinutes, todayKey, zonedToUtc, minuteToHm, type DateKey } from "../time";

export type SlotStatus = "available" | "held" | "unavailable";
export type DayState = "available" | "held" | "full" | "closed";

export interface Interval {
  start: number; // epoch ms (inclus)
  end: number; // epoch ms (exclu)
}

/** held = demande en attente (peut se libérer) ; busy = réservé, bloqué ou occupé dans Google Agenda. */
export interface Blocker extends Interval {
  kind: "held" | "busy";
}

export interface SlotView {
  startMinute: number;
  start: string;
  end: string;
  status: SlotStatus;
}

export interface DayView {
  date: DateKey;
  state: DayState;
  slots: SlotView[];
}

export interface EngineOptions {
  durationMinutes: number;
  now: Date;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  cfg?: Pick<typeof bookingConfig, "dayStartMinute" | "dayEndMinute" | "slotMinutes" | "timezone">;
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export function slotsNeeded(durationMinutes: number, slotMinutes = bookingConfig.slotMinutes) {
  return Math.max(1, Math.ceil(durationMinutes / slotMinutes));
}

export function isWithinWindow(date: DateKey, opts: Pick<EngineOptions, "now" | "maxAdvanceDays" | "cfg">) {
  const tz = opts.cfg?.timezone ?? bookingConfig.timezone;
  const today = todayKey(opts.now, tz);
  return date >= today && date <= addDays(today, opts.maxAdvanceDays);
}

export type SlotRejection = "outside_range" | "not_open" | "too_soon" | "outside_window" | "conflict" | "held";

/**
 * Vérifie qu'une plage [date startMinute, +durée) est réservable.
 * Retourne null si oui, sinon la raison.
 */
export function checkInterval(
  date: DateKey,
  startMinute: number,
  open: ReadonlySet<number>,
  blockers: readonly Blocker[],
  opts: EngineOptions,
): SlotRejection | null {
  const cfg = opts.cfg ?? bookingConfig;
  const { durationMinutes } = opts;
  if (durationMinutes <= 0 || durationMinutes % cfg.slotMinutes !== 0) return "outside_range";
  if (startMinute < cfg.dayStartMinute || startMinute + durationMinutes > cfg.dayEndMinute) return "outside_range";
  if ((startMinute - cfg.dayStartMinute) % cfg.slotMinutes !== 0) return "outside_range";
  if (!isWithinWindow(date, opts)) return "outside_window";
  for (let k = 0; k < slotsNeeded(durationMinutes, cfg.slotMinutes); k++) {
    if (!open.has(startMinute + k * cfg.slotMinutes)) return "not_open";
  }
  const interval = {
    start: zonedToUtc(date, startMinute, cfg.timezone).getTime(),
    end: zonedToUtc(date, startMinute + durationMinutes, cfg.timezone).getTime(),
  };
  if (interval.start < opts.now.getTime() + opts.minNoticeMinutes * 60_000) return "too_soon";
  let held = false;
  for (const b of blockers) {
    if (!overlaps(interval, b)) continue;
    if (b.kind === "busy") return "conflict";
    held = true;
  }
  return held ? "held" : null;
}

/** Calcule les créneaux d'une journée pour une durée donnée. */
export function computeDay(date: DateKey, open: ReadonlySet<number>, blockers: readonly Blocker[], opts: EngineOptions): DayView {
  const cfg = opts.cfg ?? bookingConfig;
  if (!isWithinWindow(date, opts) || open.size === 0) return { date, state: "closed", slots: [] };

  const slots: SlotView[] = [];
  for (const startMinute of slotStartMinutes(cfg)) {
    const reason = checkInterval(date, startMinute, open, blockers, opts);
    if (reason === "outside_range" || reason === "not_open" || reason === "too_soon" || reason === "outside_window") continue;
    slots.push({
      startMinute,
      start: minuteToHm(startMinute),
      end: minuteToHm(startMinute + opts.durationMinutes),
      status: reason === null ? "available" : reason === "held" ? "held" : "unavailable",
    });
  }

  // Y a-t-il encore au moins un créneau ouvert dans le futur ce jour-là ?
  const nowCut = opts.now.getTime() + opts.minNoticeMinutes * 60_000;
  const anyFutureOpen = [...open].some((m) => zonedToUtc(date, m, cfg.timezone).getTime() >= nowCut);

  let state: DayState;
  if (slots.some((s) => s.status === "available")) state = "available";
  else if (slots.some((s) => s.status === "held")) state = "held";
  else state = anyFutureOpen ? "full" : "closed";
  return { date, state, slots };
}

export function computeDays(
  dates: readonly DateKey[],
  openByDate: ReadonlyMap<DateKey, ReadonlySet<number>>,
  blockers: readonly Blocker[],
  opts: EngineOptions,
): DayView[] {
  return dates.map((d) => computeDay(d, openByDate.get(d) ?? new Set(), blockers, opts));
}
