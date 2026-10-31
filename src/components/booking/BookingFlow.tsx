"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { SelectField, Spinner, TextArea, TextField } from "../ui/Field";
import { ArrowLeft, ArrowRight, Check } from "../ui/icons";
import { DurationPicker } from "./DurationPicker";
import { MonthCalendar } from "./MonthCalendar";
import { ReferenceUploader, type PreparedFile } from "./ReferenceUploader";
import { SlotList } from "./SlotList";
import { Stepper, type Step } from "./Stepper";
import { SummaryTicket } from "./SummaryTicket";
import type { MonthData, Selection } from "./types";

const addMonths = (m: string, d: number) => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  const dt = new Date(Date.UTC(y, mo - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
};

type FieldErrors = Record<string, string>;

export function BookingFlow({ today, maxMonth, maxDurationMinutes }: { today: string; maxMonth: string; maxDurationMinutes: number }) {
  const locale = useLocale();
  const t = useTranslations("booking");
  const reduce = useReducedMotion();
  const firstMonth = today.slice(0, 7);

  const [step, setStep] = useState<Step>("time");
  const [duration, setDuration] = useState(60);
  const [month, setMonth] = useState(firstMonth);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string; firstName: string } | null>(null);
  const startedAt = useRef(Date.now());
  const topRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const autoAdvanced = useRef(false);

  // Chargement des disponibilités du mois (jamais d'informations sur les autres clients)
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setLoadError(false);
    fetch(`/api/availability?month=${month}&duration=${duration}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as MonthData;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
        // Premier affichage : si le mois courant n'a plus rien, on passe au mois suivant ayant des disponibilités
        if (!autoAdvanced.current && month === firstMonth && !d.days.some((x) => x.state === "available") && month < maxMonth) {
          autoAdvanced.current = true;
          setMonth(addMonths(month, 1));
        }
        autoAdvanced.current = true;
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setLoading(false);
        setLoadError(true);
      });
    return () => ctrl.abort();
  }, [month, duration, reload, firstMonth, maxMonth]);

  // La sélection reste valable uniquement si le créneau est toujours disponible
  useEffect(() => {
    if (!data || !selection) return;
    const day = data.days.find((d) => d.date === selection.date);
    if (!day) return;
    const slot = day.slots.find((s) => s.startMinute === selection.slot.startMinute && s.status === "available");
    if (!slot) setSelection(null);
    else if (slot.end !== selection.slot.end) setSelection({ date: selection.date, slot });
  }, [data, selection]);

  const day = useMemo(() => data?.days.find((d) => d.date === selectedDate) ?? null, [data, selectedDate]);
  const hasAvailability = data?.days.some((d) => d.state === "available") ?? false;

  const changeMonth = (delta: number) => {
    setDirection(delta);
    setMonth((m) => addMonths(m, delta));
    setSelectedDate(null);
  };

  const scrollTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  const goDetails = () => {
    if (!selection) return;
    setStep("details");
    setFormError(null);
    scrollTop();
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selection || submitting) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const local: FieldErrors = {};
    const req = (k: string) => !String(fd.get(k) ?? "").trim() && (local[k] = "required");
    ["firstName", "lastName", "email", "projectDescription"].forEach(req);
    const email = String(fd.get("email") ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) local.email = "invalid_email";
    const desc = String(fd.get("projectDescription") ?? "").trim();
    if (desc && desc.length < 20) local.projectDescription = "too_short";
    if (!fd.get("consent")) local.consent = "consent_required";
    setErrors(local);
    if (Object.keys(local).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(local)[0]}"]`)?.focus();
      return;
    }

    fd.set("consent", "true");
    fd.set("locale", locale);
    fd.set("date", selection.date);
    fd.set("start", selection.slot.start);
    fd.set("durationMinutes", String(duration));
    fd.set("startedAt", String(startedAt.current));
    files.forEach((f) => fd.append("references", f.blob, f.name));

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/bookings", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { reference?: string; code?: string; fieldErrors?: FieldErrors };
      if (res.ok && json.reference) {
        setResult({ reference: json.reference, firstName: String(fd.get("firstName")) });
        setStep("done");
        scrollTop();
        return;
      }
      if (json.fieldErrors) {
        setErrors(json.fieldErrors);
        setFormError(t("errors.generic"));
      } else if (json.code && ["SLOT_UNAVAILABLE", "SLOT_HELD", "TOO_SOON", "OUTSIDE_RANGE"].includes(json.code)) {
        // Le créneau vient d'être pris : retour au calendrier avec des disponibilités à jour
        setFormError(t(`errors.${json.code}`));
        setSelection(null);
        setReload((n) => n + 1);
        setStep("time");
        scrollTop();
      } else if (json.code === "RATE_LIMITED" || json.code === "SPAM") {
        setFormError(t(`errors.${json.code}`));
      } else {
        setFormError(t("errors.generic"));
      }
    } catch {
      setFormError(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}` as "errors.required") : undefined);
  const styleOptions = Object.entries(t.raw("form.styleOptions") as Record<string, string>);
  const anim = {
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? undefined : { opacity: 0, y: -16 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div ref={topRef} className="scroll-mt-[calc(var(--header-h)+1rem)]">
      <div className="flex flex-col gap-4 border-y border-line-soft py-5 md:flex-row md:items-center md:justify-between">
        <Stepper step={step} />
        <p className="max-w-md text-[0.85rem] text-fg-muted">{t("notice")}</p>
      </div>

      {formError && step === "time" && (
        <p role="alert" className="field-error mt-6 rounded-xl bg-surface p-4">
          {formError}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {step === "time" && (
          <motion.div key="time" {...anim} className="mt-8 grid gap-6 pb-28 md:grid-cols-2 xl:grid-cols-12 xl:pb-0">
            <div className="space-y-6 xl:col-span-4">
              <DurationPicker
                value={duration}
                max={data?.maxDurationMinutes ?? maxDurationMinutes}
                onChange={(m) => {
                  setDuration(m);
                }}
              />
              <MonthCalendar
                month={month}
                days={data?.month === month ? data.days : []}
                loading={loading}
                selected={selectedDate}
                today={today}
                canPrev={month > firstMonth}
                canNext={month < maxMonth}
                direction={direction}
                onMonth={changeMonth}
                onSelect={(d) => {
                  setSelectedDate(d);
                  if (selection?.date !== d) setSelection(null);
                  // Sur mobile, les horaires sont sous le calendrier : on les amène à l'écran
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
                  }
                }}
              />
              {loading && (
                <p className="flex items-center gap-2 text-sm text-fg-muted" role="status">
                  <Spinner /> {t("calendar.loading")}
                </p>
              )}
              {loadError && (
                <div role="alert" className="flex items-center justify-between gap-4 rounded-xl bg-surface p-4 text-sm">
                  {t("calendar.error")}
                  <button type="button" className="link-line font-bold" onClick={() => setReload((n) => n + 1)}>
                    {t("calendar.retry")}
                  </button>
                </div>
              )}
              {!loading && !loadError && data && !hasAvailability && (
                <div className="rounded-xl bg-surface p-4 text-sm" role="status">
                  <p className="font-semibold">{t("calendar.empty")}</p>
                  <p className="mt-1 text-fg-muted">{t("calendar.tryShorter")}</p>
                  {month < maxMonth && (
                    <button type="button" className="link-line mt-3 font-bold" onClick={() => changeMonth(1)}>
                      {t("calendar.tryNext")}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div ref={slotsRef} className="scroll-mt-[calc(var(--header-h)+1rem)] xl:col-span-4">
              <SlotList
                day={day}
                selected={selection?.date === selectedDate ? selection.slot : null}
                onSelect={(slot) => selectedDate && setSelection({ date: selectedDate, slot })}
              />
            </div>

            <div className="hidden xl:col-span-4 xl:block">
              <div className="sticky top-[calc(var(--header-h)+1.5rem)] space-y-8">
                <SummaryTicket selection={selection} durationMinutes={duration} />
                <button type="button" onClick={goDetails} disabled={!selection} className="btn btn-primary w-full">
                  {t("summary.continue")} <ArrowRight className="btn-icon" size={16} />
                </button>
              </div>
            </div>

            {/* Barre récapitulative mobile */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-ivory/95 px-4 py-3 backdrop-blur xl:hidden">
              <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
                <p className="text-sm leading-tight" aria-live="polite">
                  {selection ? (
                    <>
                      <span className="font-semibold">
                        {new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${selection.date}T12:00:00Z`))}
                      </span>
                      <br />
                      <span className="tabular-nums text-fg-muted">
                        {selection.slot.start} – {selection.slot.end}
                      </span>
                    </>
                  ) : (
                    <span className="text-fg-muted">{t("summary.empty")}</span>
                  )}
                </p>
                <button type="button" onClick={goDetails} disabled={!selection} className="btn btn-primary min-h-12 px-5">
                  {t("summary.continue")} <ArrowRight className="btn-icon" size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "details" && selection && (
          <motion.div key="details" {...anim} className="mt-8 grid gap-10 lg:grid-cols-12">
            <form onSubmit={submit} noValidate className="lg:col-span-7" aria-describedby="form-intro">
              <h2 className="display-m">{t("form.title")}</h2>
              <p id="form-intro" className="mt-3 text-fg-muted">
                {t("form.intro")}
              </p>

              <fieldset className="mt-10 grid gap-7 sm:grid-cols-2">
                <legend className="eyebrow mb-6">{t("form.identity")}</legend>
                <TextField id="firstName" label={t("form.firstName")} autoComplete="given-name" required maxLength={80} error={err("firstName")} />
                <TextField id="lastName" label={t("form.lastName")} autoComplete="family-name" required maxLength={80} error={err("lastName")} />
                <TextField id="email" type="email" inputMode="email" label={t("form.email")} autoComplete="email" required maxLength={200} error={err("email")} className="sm:col-span-2" />
              </fieldset>

              <fieldset className="mt-12 grid gap-7 sm:grid-cols-2">
                <legend className="eyebrow mb-6">{t("form.project")}</legend>
                <TextArea
                  id="projectDescription"
                  label={t("form.description")}
                  hint={t("form.descriptionHint")}
                  required
                  minLength={20}
                  maxLength={3000}
                  rows={5}
                  error={err("projectDescription")}
                  className="sm:col-span-2"
                />
                <TextField id="placement" label={t("form.placement")} placeholder={t("form.placementHint")} optionalLabel={t("form.optional")} maxLength={120} error={err("placement")} />
                <TextField id="approximateSize" label={t("form.size")} placeholder={t("form.sizeHint")} optionalLabel={t("form.optional")} maxLength={60} error={err("approximateSize")} />
                <SelectField id="style" label={t("form.style")} optionalLabel={t("form.optional")} options={styleOptions} defaultValue="" className="sm:col-span-2" />
                <TextArea id="comment" label={t("form.comment")} optionalLabel={t("form.optional")} maxLength={2000} rows={3} error={err("comment")} className="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <ReferenceUploader files={files} onChange={setFiles} />
                </div>
              </fieldset>

              {/* Champ piège anti-robots (invisible pour les humains) */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="website">{t("form.honeypot")}</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="mt-10">
                <label className="flex cursor-pointer items-start gap-3 text-[0.92rem]">
                  <input
                    type="checkbox"
                    name="consent"
                    value="true"
                    className="mt-1 size-5 shrink-0 accent-[var(--color-nut)]"
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={errors.consent ? "consent-error" : undefined}
                  />
                  <span>
                    {t("form.consent")}{" "}
                    <Link href="/privacy" target="_blank" className="link-line">
                      {t("form.privacyLink")}
                    </Link>
                    .
                  </span>
                </label>
                {errors.consent && (
                  <p id="consent-error" className="field-error mt-2" role="alert">
                    {t("errors.consent_required")}
                  </p>
                )}
              </div>

              {formError && (
                <p role="alert" className="field-error mt-8 rounded-xl bg-surface p-4">
                  {formError}
                </p>
              )}

              <div className="mt-10 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setStep("time")} className="link-reveal inline-flex items-center gap-2 text-[0.78rem] font-bold tracking-[0.14em] uppercase">
                  <ArrowLeft size={16} /> {t("form.back")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
                  {submitting ? (
                    <>
                      <Spinner /> {t("form.submitting")}
                    </>
                  ) : (
                    <>
                      {t("form.submit")} <ArrowRight className="btn-icon" size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <aside className="lg:col-span-4 lg:col-start-9">
              <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
                <SummaryTicket selection={selection} durationMinutes={duration} onChange={() => setStep("time")} />
              </div>
            </aside>
          </motion.div>
        )}

        {step === "done" && result && selection && (
          <motion.div key="done" {...anim} className="mt-10 grid gap-10 pb-10 lg:grid-cols-12" role="status">
            <div className="lg:col-span-7">
              <span className="grid size-14 place-items-center rounded-full bg-nut text-ivory">
                <Check size={26} />
              </span>
              <h2 className="display-l mt-8">{t("success.title")}</h2>
              <p className="lead mt-6">{t("success.text", { name: result.firstName })}</p>
              <p className="mt-6 rounded-xl border border-line bg-surface p-5 font-semibold">{t("success.pending")}</p>
              <p className="mt-4 text-fg-muted">{t("success.emailSent")}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/" className="btn btn-primary">
                  {t("success.home")}
                </Link>
                <Link href="/portfolio" className="btn btn-ghost">
                  {t("success.portfolio")}
                </Link>
              </div>
            </div>
            <aside className="lg:col-span-4 lg:col-start-9">
              <SummaryTicket selection={selection} durationMinutes={duration} />
              <p className="mt-10 text-center text-[0.72rem] font-bold tracking-[0.2em] text-fg-muted uppercase">
                {t("success.reference")} · <span className="text-chocolate">{result.reference}</span>
              </p>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
