"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "../ui/icons";
import { dateFromKey, formatDay, intlLocale, type DayView } from "./types";
type DayState = DayView["state"];

const STATE_STYLE: Record<DayState, string> = {
  available: "text-chocolate hover:bg-cream/70 font-semibold",
  held: "text-nut hover:bg-cream/50",
  full: "text-light-brown/70 line-through decoration-1",
  closed: "text-light-brown/45",
};

export function MonthCalendar({
  month,
  days,
  loading,
  selected,
  today,
  canPrev,
  canNext,
  direction,
  onMonth,
  onSelect,
}: {
  month: string;
  days: DayView[];
  loading: boolean;
  selected: string | null;
  today: string;
  canPrev: boolean;
  canNext: boolean;
  direction: number;
  onMonth: (delta: number) => void;
  onSelect: (date: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("booking.calendar");
  const reduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const title = new Intl.DateTimeFormat(intlLocale[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(dateFromKey(`${month}-01`));
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", timeZone: "UTC" });
    // 2 janvier 2023 = lundi
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2023, 0, 2 + i, 12))).replace(".", ""));
  }, [locale]);

  const first = days[0]?.date ?? `${month}-01`;
  const offset = (dateFromKey(first).getUTCDay() + 6) % 7;
  const selectable = (d: DayView) => d.state === "available" || d.state === "held";
  const focusTarget = selected && days.some((d) => d.date === selected) ? selected : (days.find(selectable)?.date ?? days.find((d) => d.date >= today)?.date ?? first);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = keys[e.key];
    const current = (e.target as HTMLElement).dataset.date;
    if (!delta || !current) return;
    e.preventDefault();
    const idx = days.findIndex((d) => d.date === current) + delta;
    const next = days[Math.max(0, Math.min(days.length - 1, idx))];
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next?.date}"]`)?.focus();
  };

  return (
    <div className="card overflow-hidden bg-ivory">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <h3 className="font-[family-name:var(--font-display)] text-2xl capitalize" aria-live="polite">
          {title}
        </h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMonth(-1)} disabled={!canPrev} aria-label={t("prev")} className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:border-chocolate disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => onMonth(1)} disabled={!canNext} aria-label={t("next")} className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:border-chocolate disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="px-3 pt-3 pb-4">
        <div className="grid grid-cols-7 text-center text-[0.68rem] font-bold tracking-[0.12em] text-fg-muted uppercase" aria-hidden>
          {weekdays.map((w) => (
            <span key={w} className="py-2">
              {w}
            </span>
          ))}
        </div>
        <div className="relative min-h-[17.5rem]">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={month}
              ref={gridRef}
              role="group"
              aria-label={t("label")}
              aria-busy={loading}
              onKeyDown={onKeyDown}
              className={`grid grid-cols-7 gap-y-1 transition-opacity duration-300 ${loading ? "opacity-40" : "opacity-100"}`}
              custom={direction}
              initial={reduce ? false : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {Array.from({ length: offset }, (_, i) => (
                <span key={`pad-${i}`} aria-hidden />
              ))}
              {days.map((d) => {
                const isSelected = d.date === selected;
                const isToday = d.date === today;
                const can = selectable(d) && !loading;
                const stateLabel = t(`legend.${d.state}`);
                return (
                  <button
                    key={d.date}
                    type="button"
                    data-date={d.date}
                    tabIndex={d.date === focusTarget ? 0 : -1}
                    aria-disabled={!can}
                    aria-pressed={isSelected}
                    aria-label={`${t("dayLabel", { date: formatDay(d.date, locale), state: stateLabel })}${isSelected ? ` — ${t("selected")}` : ""}`}
                    onClick={() => can && onSelect(d.date)}
                    className={`relative mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full text-[0.95rem] transition-colors duration-300 ${
                      isSelected ? "bg-nut font-semibold text-ivory" : STATE_STYLE[d.state]
                    } ${can ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span className={isToday && !isSelected ? "underline decoration-light-brown underline-offset-4" : ""}>{Number(d.date.slice(8))}</span>
                    {!isSelected && d.state === "available" && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-nut" />}
                    {!isSelected && d.state === "held" && <span aria-hidden className="absolute bottom-1 size-1 rounded-full border border-nut" />}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line-soft px-4 py-3 text-[0.75rem] text-fg-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-nut" /> {t("legend.available")}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full border border-nut" /> {t("legend.held")}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="text-light-brown line-through">12</span> {t("legend.full")}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="text-light-brown/50">12</span> {t("legend.closed")}
        </li>
      </ul>
    </div>
  );
}
