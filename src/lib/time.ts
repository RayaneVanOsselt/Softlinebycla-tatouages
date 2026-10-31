/** Formats de dates et heures, toujours dans le fuseau du studio (Europe/Brussels). */
export const TIMEZONE = "Europe/Brussels";

const intlLocale: Record<string, string> = { fr: "fr-BE", nl: "nl-BE", en: "en-GB" };

export function formatDateLong(instant: Date, locale: string) {
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIMEZONE }).format(instant);
}

export function formatTime(instant: Date, locale: string) {
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIMEZONE }).format(instant);
}

export function formatDuration(minutes: number, locale: string) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const unit = locale === "nl" ? "u" : "h";
  return m ? `${h} ${unit} ${String(m).padStart(2, "0")}` : `${h} ${unit}`;
}

/** Date du jour à Bruxelles au format AAAA-MM-JJ. */
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now);
}
