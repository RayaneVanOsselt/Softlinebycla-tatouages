"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Spinner, TextArea, TextField } from "../ui/Field";
import { ArrowRight, Check } from "../ui/icons";

type Errors = Record<string, string>;

export function ContactForm() {
  const locale = useLocale();
  const t = useTranslations("contact");
  const e = useTranslations("booking.errors");
  const f = useTranslations("booking.form");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (submitting) return;
    const form = ev.currentTarget;
    const fd = new FormData(form);
    const local: Errors = {};
    for (const k of ["firstName", "lastName", "email", "subject", "message"]) if (!String(fd.get(k) ?? "").trim()) local[k] = "required";
    const email = String(fd.get("email") ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) local.email = "invalid_email";
    const msg = String(fd.get("message") ?? "").trim();
    if (msg && msg.length < 10) local.message = "too_short";
    if (!fd.get("consent")) local.consent = "consent_required";
    setErrors(local);
    if (Object.keys(local).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(local)[0]}"]`)?.focus();
      return;
    }
    fd.set("consent", "true");
    fd.set("locale", locale);
    fd.set("startedAt", String(startedAt.current));
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/contact", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; fieldErrors?: Errors };
      if (res.ok && json.ok) {
        setSentTo(String(fd.get("firstName")));
        form.reset();
        return;
      }
      if (json.fieldErrors) setErrors(json.fieldErrors);
      setFormError(json.code === "RATE_LIMITED" || json.code === "SPAM" ? e(json.code) : e("generic"));
    } catch {
      setFormError(e("network"));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div role="status" className="rounded-[var(--radius-card)] bg-surface p-8 md:p-10">
        <span className="grid size-12 place-items-center rounded-full bg-nut text-ivory">
          <Check size={22} />
        </span>
        <h2 className="display-m mt-6">{t("successTitle")}</h2>
        <p className="lead mt-4">{t("success", { name: sentTo })}</p>
        <button
          type="button"
          className="link-line mt-8 text-[0.78rem] font-bold tracking-[0.14em] uppercase"
          onClick={() => {
            setSentTo(null);
            startedAt.current = Date.now();
          }}
        >
          {t("another")}
        </button>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? e(errors[k] as "required") : undefined);

  return (
    <form onSubmit={submit} noValidate className="grid gap-7 sm:grid-cols-2">
      <TextField id="firstName" label={t("firstName")} autoComplete="given-name" required maxLength={80} error={err("firstName")} />
      <TextField id="lastName" label={t("lastName")} autoComplete="family-name" required maxLength={80} error={err("lastName")} />
      <TextField id="email" type="email" inputMode="email" label={t("email")} autoComplete="email" required maxLength={200} error={err("email")} className="sm:col-span-2" />
      <TextField id="subject" label={t("subject")} required maxLength={150} error={err("subject")} className="sm:col-span-2" />
      <TextArea id="message" label={t("message")} required rows={6} maxLength={5000} error={err("message")} className="sm:col-span-2" />
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">{f("honeypot")}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3 text-[0.92rem]">
          <input type="checkbox" name="consent" value="true" className="mt-1 size-5 shrink-0 accent-[var(--color-nut)]" aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "contact-consent-error" : undefined} />
          <span>
            {t("consent")}{" "}
            <Link href="/privacy" className="link-line">
              {f("privacyLink")}
            </Link>
            .
          </span>
        </label>
        {errors.consent && (
          <p id="contact-consent-error" className="field-error mt-2" role="alert">
            {e("consent_required")}
          </p>
        )}
      </div>
      {formError && (
        <p role="alert" className="field-error rounded-xl bg-surface p-4 sm:col-span-2">
          {formError}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Spinner /> {t("submitting")}
            </>
          ) : (
            <>
              {t("submit")} <ArrowRight className="btn-icon" size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
