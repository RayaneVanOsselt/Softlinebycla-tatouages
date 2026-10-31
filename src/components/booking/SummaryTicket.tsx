"use client";

import { useLocale, useTranslations } from "next-intl";
import { Monogram } from "../site/Brand";
import { formatDay, type Selection } from "./types";

export function SummaryTicket({ selection, durationMinutes, onChange }: { selection: Selection | null; durationMinutes: number; onChange?: () => void }) {
  const locale = useLocale();
  const t = useTranslations("booking.summary");
  const d = useTranslations("booking.duration");
  const rows = selection
    ? [
        [t("date"), formatDay(selection.date, locale)],
        [t("time"), `${selection.slot.start} – ${selection.slot.end}`],
        [t("duration"), d("option", { count: durationMinutes / 60 })],
      ]
    : [];

  return (
    <div className="ticket px-6 pt-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.2em] text-fg-muted uppercase">SOFTLINEBY.CLA</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{t("title")}</p>
        </div>
        <Monogram className="h-12 w-auto opacity-80" />
      </div>
      <div className="my-5 border-t border-dashed border-line" />
      {selection ? (
        <dl className="space-y-4" aria-live="polite">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4">
              <dt className="text-[0.72rem] font-bold tracking-[0.14em] text-fg-muted uppercase">{k}</dt>
              <dd className="text-right font-semibold first-letter:uppercase">{v}</dd>
            </div>
          ))}
          <div className="border-t border-dashed border-line pt-4">
            <dt className="text-[0.72rem] font-bold tracking-[0.14em] text-fg-muted uppercase">{t("status")}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display)] text-lg italic">{t("statusValue")}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-fg-muted">{t("empty")}</p>
      )}
      {selection && onChange && (
        <button type="button" onClick={onChange} className="link-line mt-6 text-[0.75rem] font-bold tracking-[0.14em] uppercase">
          {t("change")}
        </button>
      )}
    </div>
  );
}
