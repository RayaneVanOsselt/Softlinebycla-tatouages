"use client";

import { useTranslations } from "next-intl";

export type Step = "time" | "details" | "done";
const ORDER: Step[] = ["time", "details", "done"];

export function Stepper({ step }: { step: Step }) {
  const t = useTranslations("booking");
  const current = ORDER.indexOf(step);
  return (
    <nav aria-label={t("stepsLabel")}>
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.75rem] font-semibold tracking-[0.08em]">
        {ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-4" aria-current={i === current ? "step" : undefined}>
            {i > 0 && <span aria-hidden className="h-4 w-px bg-line" />}
            <span className={`flex items-center gap-2 transition-colors duration-500 ${i === current ? "text-chocolate" : i < current ? "text-nut" : "text-fg-muted opacity-70"}`}>
              <span className={`grid size-6 place-items-center rounded-full text-[0.68rem] ${i <= current ? "bg-nut text-ivory" : "border border-line"}`}>{i + 1}</span>
              <span className={i === current ? "underline decoration-light-brown underline-offset-[6px]" : ""}>{t(`steps.${s}`)}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
