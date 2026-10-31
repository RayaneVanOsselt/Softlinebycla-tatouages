"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addBlockedPeriodAction,
  deleteBlockedPeriodAction,
  getAdminMonthAction,
  setAvailabilityAction,
  type AdminDay,
} from "@/app/admin/actions";
import { AdminButton, Feedback, inputCls, labelCls, useAction } from "./ui";

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const addMonths = (m: string, d: number) => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  const dt = new Date(Date.UTC(y, mo - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
};
const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-BE", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function AgendaEditor({ initialMonth, today }: { initialMonth: string; today: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<AdminDay[]>([]);
  const [slots, setSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [hours, setHours] = useState<Set<number>>(new Set());
  const save = useAction();
  const block = useAction();
  const [blockForm, setBlockForm] = useState({ startDate: today, startTime: "00:00", endDate: today, endTime: "23:59", reason: "" });

  const load = useCallback(async (m: string) => {
    setLoading(true);
    const r = await getAdminMonthAction(m);
    setDays(r.days);
    setSlots(r.slots);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  // Heures affichées pour la sélection : celles communes à tous les jours sélectionnés
  useEffect(() => {
    if (!selected.length) return setHours(new Set());
    const sets = selected.map((d) => new Set(byDate.get(d)?.open ?? []));
    const common = slots.filter((s) => sets.every((set) => set.has(s)));
    setHours(new Set(common));
  }, [selected, byDate, slots]);

  const offset = days[0] ? (new Date(`${days[0].date}T12:00:00Z`).getUTCDay() + 6) % 7 : 0;

  const clickDay = (d: string) => {
    save.setResult(null);
    if (multi) setSelected((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d].sort()));
    else setSelected((s) => (s.length === 1 && s[0] === d ? [] : [d]));
  };

  const selectWeekday = (wd: number) => {
    const list = days.filter((d) => (new Date(`${d.date}T12:00:00Z`).getUTCDay() + 6) % 7 === wd && d.date >= today).map((d) => d.date);
    setMulti(true);
    setSelected((s) => [...new Set([...s, ...list])].sort());
  };

  const toggleHour = (m: number) =>
    setHours((h) => {
      const n = new Set(h);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });

  const preset = (from: number, to: number) => setHours(new Set(slots.filter((s) => s >= from * 60 && s < to * 60)));

  const apply = () =>
    save.run(
      () => setAvailabilityAction({ dates: selected, minutes: [...hours], mode: "replace" }),
      () => load(month),
    );

  const single = selected.length === 1 ? byDate.get(selected[0]!) : undefined;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-line-soft bg-white/70 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="grid size-10 place-items-center rounded-full border border-line" aria-label="Mois précédent">
              ‹
            </button>
            <h2 className="min-w-44 text-center font-[family-name:var(--font-display)] text-2xl capitalize" aria-live="polite">
              {fmtDay(`${month}-01`, { month: "long", year: "numeric" })}
            </h2>
            <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="grid size-10 place-items-center rounded-full border border-line" aria-label="Mois suivant">
              ›
            </button>
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold">
            <input
              type="checkbox"
              checked={multi}
              onChange={(e) => {
                setMulti(e.target.checked);
                if (!e.target.checked) setSelected((s) => s.slice(0, 1));
              }}
              className="size-4 accent-[var(--color-nut)]"
            />
            Sélection multiple
          </label>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <button key={w} type="button" onClick={() => selectWeekday(i)} className="rounded-lg py-1.5 text-[0.7rem] font-bold tracking-[0.1em] text-fg-muted uppercase hover:bg-cream/50" title={`Sélectionner tous les ${w.toLowerCase()}. à venir du mois`}>
              {w}
            </button>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`p${i}`} />
          ))}
          {days.map((d) => {
            const past = d.date < today;
            const isSel = selected.includes(d.date);
            const active = d.bookings.filter((b) => b.status !== "COMPLETED");
            return (
              <button
                key={d.date}
                type="button"
                disabled={past}
                onClick={() => clickDay(d.date)}
                aria-pressed={isSel}
                aria-label={`${fmtDay(d.date, { weekday: "long", day: "numeric", month: "long" })} : ${d.open.length} h ouverte(s), ${active.length} réservation(s)${d.blocked.length ? ", période bloquée" : ""}`}
                className={`relative flex min-h-16 flex-col items-start justify-between rounded-xl border p-1.5 text-left transition-colors md:min-h-20 md:p-2 ${
                  isSel ? "border-nut bg-nut text-ivory" : past ? "border-transparent opacity-35" : d.open.length ? "border-light-brown bg-cream/40 hover:border-nut" : "border-line-soft hover:border-nut"
                } ${loading ? "opacity-50" : ""}`}
              >
                <span className="text-sm font-semibold">{Number(d.date.slice(8))}</span>
                <span className="flex w-full flex-wrap items-center gap-1 text-[0.6rem] font-bold md:text-[0.65rem]">
                  {d.open.length > 0 && <span>{d.open.length} h</span>}
                  {active.length > 0 && <span className={`rounded-full px-1 ${isSel ? "bg-ivory text-nut" : "bg-nut text-ivory"}`}>{active.length} RDV</span>}
                  {d.blocked.length > 0 && <span title="Période bloquée">⊘</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-fg-muted">
          Par défaut, tout est fermé : seuls les jours et heures que vous ouvrez sont proposés aux clients. Astuce : en sélection multiple, cliquez sur « Lun », « Mar »… pour sélectionner tous ces jours du mois.
        </p>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-line-soft bg-white/70 p-4 md:p-5 xl:sticky xl:top-6">
          {selected.length === 0 ? (
            <p className="text-sm text-fg-muted">Choisissez un jour dans le calendrier (ou plusieurs avec la sélection multiple) pour ouvrir ou fermer des heures.</p>
          ) : (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-2xl first-letter:uppercase">
                {selected.length === 1 ? fmtDay(selected[0]!, { weekday: "long", day: "numeric", month: "long" }) : `${selected.length} jours sélectionnés`}
              </h2>
              <p className="mt-1 text-xs text-fg-muted">Touchez une heure pour l’ouvrir (foncé) ou la fermer (clair). Plage autorisée : 11:00 – 20:00.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {slots.map((m) => {
                  const on = hours.has(m);
                  const taken = single?.bookings.find((b) => b.start <= hm(m) && b.end > hm(m) && b.status !== "COMPLETED");
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleHour(m)}
                      className={`min-h-12 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${on ? "border-nut bg-nut text-ivory" : "border-line hover:border-nut"}`}
                    >
                      {hm(m)}
                      {taken && <span className="block text-[0.6rem] font-normal opacity-80">{taken.name}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <AdminButton variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => preset(11, 20)}>
                  Toute la plage
                </AdminButton>
                <AdminButton variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => preset(11, 15)}>
                  11 h – 15 h
                </AdminButton>
                <AdminButton variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => preset(14, 20)}>
                  14 h – 20 h
                </AdminButton>
                <AdminButton variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setHours(new Set())}>
                  Tout fermer
                </AdminButton>
              </div>
              <AdminButton className="mt-5 w-full" pending={save.pending} onClick={apply}>
                Enregistrer {selected.length > 1 ? `pour ${selected.length} jours` : ""}
              </AdminButton>
              <div className="mt-3">
                <Feedback result={save.result} />
              </div>
              {single && single.bookings.length > 0 && (
                <div className="mt-5 border-t border-line-soft pt-4">
                  <p className={labelCls}>Rendez-vous ce jour-là</p>
                  <ul className="space-y-1 text-sm">
                    {single.bookings.map((b) => (
                      <li key={b.id}>
                        <Link href={`/admin/reservations/${b.id}`} className="underline underline-offset-4">
                          {b.start}–{b.end} · {b.name}
                        </Link>{" "}
                        <span className="text-xs text-fg-muted">({b.status === "CONFIRMED" ? "confirmé" : b.status === "PENDING" ? "en attente" : b.status === "RESCHEDULE_PROPOSED" ? "proposé" : "terminé"})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-fg-muted">Fermer une heure n’annule jamais un rendez-vous existant.</p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-line-soft bg-white/70 p-4 md:p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Périodes d’indisponibilité</h2>
          <p className="mt-1 text-xs text-fg-muted">Vacances, formation, journée bloquée… Prioritaire sur les heures ouvertes.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="bs">
                Du
              </label>
              <input id="bs" type="date" value={blockForm.startDate} onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value, endDate: e.target.value > blockForm.endDate ? e.target.value : blockForm.endDate })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="bst">
                à
              </label>
              <input id="bst" type="time" value={blockForm.startTime} onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="be">
                Au
              </label>
              <input id="be" type="date" value={blockForm.endDate} onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="bet">
                à
              </label>
              <input id="bet" type="time" value={blockForm.endTime} onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls} htmlFor="br">
                Motif (privé, facultatif)
              </label>
              <input id="br" value={blockForm.reason} maxLength={200} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} className={inputCls} />
            </div>
          </div>
          <AdminButton className="mt-4" pending={block.pending} onClick={() => block.run(() => addBlockedPeriodAction(blockForm), () => load(month))}>
            Bloquer cette période
          </AdminButton>
          <div className="mt-3">
            <Feedback result={block.result} />
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            {[...new Map(days.flatMap((d) => d.blocked).map((p) => [p.id, p])).values()].map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream/40 px-3 py-2">
                <span>
                  {new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Brussels" }).format(new Date(p.start))} →{" "}
                  {new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Brussels" }).format(new Date(p.end))}
                  {p.reason && <span className="block text-xs text-fg-muted">{p.reason}</span>}
                </span>
                <AdminButton variant="subtle" className="text-xs" onClick={() => block.run(() => deleteBlockedPeriodAction(p.id), () => load(month))}>
                  Supprimer
                </AdminButton>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
