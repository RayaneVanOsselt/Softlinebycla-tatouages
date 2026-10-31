"use client";

import { useTranslations } from "next-intl";

export function DurationPicker({ value, max, onChange }: { value: number; max: number; onChange: (minutes: number) => void }) {
  const t = useTranslations("booking.duration");
  const options = Array.from({ length: Math.max(1, Math.floor(max / 60)) }, (_, i) => (i + 1) * 60);
  return (
    <fieldset>
      <legend className="field-label">{t("label")}</legend>
      <div role="radiogroup" aria-label={t("label")} className="mt-3 flex flex-wrap gap-2">
        {options.map((m) => {
          const active = m === value;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(m)}
              className={`min-h-11 min-w-14 shrink-0 rounded-full border px-4 text-sm font-semibold tabular-nums transition-colors duration-300 ${
                active ? "border-nut bg-nut text-ivory" : "border-line bg-ivory hover:border-chocolate"
              }`}
            >
              {t("option", { count: m / 60 })}
            </button>
          );
        })}
      </div>
      <p className="field-hint mt-2">{t("hint")}</p>
    </fieldset>
  );
}
