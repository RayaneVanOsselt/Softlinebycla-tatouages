export type { DayView, MonthData, SlotView } from "@/lib/api";
import type { SlotView } from "@/lib/api";

export interface Selection {
  date: string;
  slot: SlotView;
}

export const intlLocale: Record<string, string> = { fr: "fr-BE", nl: "nl-BE", en: "en-GB" };

/** Date locale « YYYY-MM-DD » interprétée à midi UTC : aucun décalage de jour quel que soit le fuseau du navigateur. */
export function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

export function formatDay(key: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(intlLocale[locale] ?? locale, { ...opts, timeZone: "UTC" }).format(dateFromKey(key));
}
