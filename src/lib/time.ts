import { TZDate } from "@date-fns/tz";
import { bookingConfig } from "./config";

/** Date calendaire locale au format YYYY-MM-DD. */
export type DateKey = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function isDateKey(value: string): value is DateKey {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function isMonthKey(value: string) {
  const m = MONTH_RE.exec(value);
  return Boolean(m && Number(m[2]) >= 1 && Number(m[2]) <= 12);
}

function parts(dateKey: DateKey) {
  const m = DATE_RE.exec(dateKey);
  if (!m) throw new Error(`Date invalide : ${dateKey}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Instant UTC correspondant à « date locale + minutes depuis minuit » dans le fuseau donné (gère l'heure d'été). */
export function zonedToUtc(dateKey: DateKey, minuteOfDay: number, tz = bookingConfig.timezone): Date {
  const { y, m, d } = parts(dateKey);
  const zoned = new TZDate(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, tz);
  return new Date(zoned.getTime());
}

/** Décompose un instant en date locale + minute de la journée dans le fuseau. */
export function utcToZoned(instant: Date, tz = bookingConfig.timezone): { date: DateKey; minute: number } {
  const z = new TZDate(instant.getTime(), tz);
  return {
    date: `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`,
    minute: z.getHours() * 60 + z.getMinutes(),
  };
}

export function todayKey(now = new Date(), tz = bookingConfig.timezone): DateKey {
  return utcToZoned(now, tz).date;
}

export function addDays(dateKey: DateKey, days: number): DateKey {
  const { y, m, d } = parts(dateKey);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = lundi … 6 = dimanche */
export function weekdayMondayFirst(dateKey: DateKey) {
  const { y, m, d } = parts(dateKey);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function monthOf(dateKey: DateKey) {
  return dateKey.slice(0, 7);
}

export function daysInMonth(monthKey: string): DateKey[] {
  const m = MONTH_RE.exec(monthKey);
  if (!m) throw new Error(`Mois invalide : ${monthKey}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const count = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${m[1]}-${m[2]}-${pad(i + 1)}`);
}

export function addMonths(monthKey: string, delta: number) {
  const m = MONTH_RE.exec(monthKey);
  if (!m) throw new Error(`Mois invalide : ${monthKey}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

export function minuteToHm(minute: number) {
  return `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
}

export function hmToMinute(hm: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutes de début possibles dans la plage autorisée (11:00 … 19:00 par défaut). */
export function slotStartMinutes(cfg: Pick<typeof bookingConfig, "dayStartMinute" | "dayEndMinute" | "slotMinutes"> = bookingConfig) {
  const out: number[] = [];
  for (let m = cfg.dayStartMinute; m + cfg.slotMinutes <= cfg.dayEndMinute; m += cfg.slotMinutes) out.push(m);
  return out;
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

const intlLocale: Record<string, string> = { fr: "fr-BE", nl: "nl-BE", en: "en-GB" };

export function formatDateLong(instant: Date, locale: string, tz = bookingConfig.timezone) {
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(instant);
}

export function formatTime(instant: Date, locale: string, tz = bookingConfig.timezone) {
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(instant);
}

export function formatDateKeyLong(dateKey: DateKey, locale: string) {
  return formatDateLong(zonedToUtc(dateKey, 12 * 60), locale);
}

export function formatDuration(minutes: number, locale: string) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const unit = locale === "nl" ? "u" : "h";
  return m ? `${h} ${unit} ${pad(m)}` : `${h} ${unit}`;
}
