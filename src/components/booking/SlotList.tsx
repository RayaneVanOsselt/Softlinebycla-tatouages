"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "../ui/icons";
import { formatDay, type DayView, type SlotView } from "./types";

export function SlotList({ day, selected, onSelect }: { day: DayView | null; selected: SlotView | null; onSelect: (slot: SlotView) => void }) {
  const locale = useLocale();
  const t = useTranslations("booking.slots");
  const reduce = useReducedMotion();

  return (
    <div className="card flex h-full min-h-[22rem] flex-col overflow-hidden bg-ivory">
      <div className="bg-nut px-5 py-4 text-ivory">
        <p className="text-[0.68rem] font-bold tracking-[0.2em] text-cream uppercase">{t("label")}</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-xl first-letter:uppercase" aria-live="polite">
          {day ? formatDay(day.date, locale) : "—"}
        </p>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={day?.date ?? "none"}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          {!day ? (
            <p className="p-6 text-fg-muted">{t("chooseDay")}</p>
          ) : day.slots.length === 0 ? (
            <p className="p-6 text-fg-muted">{t("none")}</p>
          ) : (
            <div role="radiogroup" aria-label={t("label")} className="divide-y divide-line-soft">
              {day.slots.map((s) => {
                const isSel = selected?.startMinute === s.startMinute;
                const disabled = s.status !== "available";
                return (
                  <button
                    key={s.startMinute}
                    type="button"
                    role="radio"
                    aria-checked={isSel}
                    aria-disabled={disabled}
                    title={s.status === "held" ? t("heldHint") : undefined}
                    onClick={() => !disabled && onSelect(s)}
                    className={`flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left transition-colors duration-300 ${
                      disabled ? "cursor-not-allowed" : "hover:bg-surface"
                    } ${isSel ? "bg-surface" : ""}`}
                  >
                    <span className={`tabular-nums ${disabled ? "text-light-brown" : "font-semibold"}`}>
                      {s.start} <span className="font-normal text-fg-muted">–</span> {s.end}
                    </span>
                    <span className="flex items-center gap-3">
                      {s.status !== "available" && (
                        <span className="rounded-full border border-line px-2.5 py-0.5 text-[0.65rem] font-bold tracking-[0.12em] text-fg-muted uppercase">
                          {s.status === "held" ? t("held") : t("unavailable")}
                        </span>
                      )}
                      {s.status === "available" && (
                        <span
                          aria-hidden
                          className={`grid size-6 place-items-center rounded-full border transition-colors duration-300 ${isSel ? "border-nut bg-nut text-ivory" : "border-light-brown"}`}
                        >
                          {isSel && <Check size={14} />}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {day?.slots.some((s) => s.status === "held") && <p className="px-5 py-4 text-[0.8rem] text-fg-muted">{t("heldHint")}</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
