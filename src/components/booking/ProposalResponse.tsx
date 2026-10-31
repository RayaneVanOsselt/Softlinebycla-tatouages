"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatDateLong, formatDuration, formatTime } from "@/lib/time";
import { Spinner } from "../ui/Field";
import { Check } from "../ui/icons";

type Proposal = { firstName: string; start: string; end: string; reference: string; holdUntil: string | null };
type State = "loading" | "ready" | "sending" | "accepted" | "declined" | "expired" | "error";

/** Réponse du client à un nouveau créneau proposé (lien reçu par e-mail). */
export function ProposalResponse() {
  const locale = useLocale();
  const t = useTranslations("booking.respond");
  const e = useTranslations("booking.errors");
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [proposal, setProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    if (token.length < 20) return setState("expired");
    api.proposal(token).then((r) => {
      if (r.ok) {
        setProposal(r);
        setState("ready");
      } else setState(r.code === "NETWORK" || r.code === "NOT_CONFIGURED" ? "error" : "expired");
    });
  }, [token]);

  const send = async (choice: "accept" | "decline") => {
    if (choice === "decline" && !window.confirm(t("confirmDecline"))) return;
    setState("sending");
    const r = await api.respond(token, choice);
    if (r.ok) setState(choice === "accept" ? "accepted" : "declined");
    else setState(r.code === "NETWORK" ? "error" : "expired");
  };

  if (state === "loading") {
    return (
      <p className="mt-10 flex items-center gap-2 text-fg-muted" role="status">
        <Spinner /> …
      </p>
    );
  }

  if (state === "accepted" || state === "declined" || state === "expired") {
    return (
      <div role="status" className="mt-6">
        {state === "accepted" && (
          <span className="grid size-14 place-items-center rounded-full bg-nut text-ivory">
            <Check size={26} />
          </span>
        )}
        <h1 className="display-l mt-6">{t(`${state}Title`)}</h1>
        <p className="lead mt-4">{t(state)}</p>
        {state !== "accepted" && (
          <Link href="/booking" className="btn btn-primary mt-8">
            {t("newRequest")}
          </Link>
        )}
      </div>
    );
  }

  const start = proposal ? new Date(proposal.start) : null;
  const end = proposal ? new Date(proposal.end) : null;
  return (
    <>
      <h1 className="display-l mt-6">{t("title")}</h1>
      {proposal && start && end && (
        <>
          <p className="lead mt-6">{t("intro", { name: proposal.firstName })}</p>
          <div className="ticket mt-10 px-7 pt-7 pb-9">
            <p className="font-[family-name:var(--font-display)] text-3xl first-letter:uppercase">{formatDateLong(start, locale)}</p>
            <p className="mt-2 text-lg tabular-nums">
              {formatTime(start, locale)} – {formatTime(end, locale)} · {formatDuration((end.getTime() - start.getTime()) / 60000, locale)}
            </p>
            <p className="mt-4 text-[0.72rem] font-bold tracking-[0.18em] text-fg-muted uppercase">{proposal.reference}</p>
          </div>
          {proposal.holdUntil && (
            <p className="mt-8 text-sm text-fg-muted">{t("expiresAt", { date: `${formatDateLong(new Date(proposal.holdUntil), locale)} ${formatTime(new Date(proposal.holdUntil), locale)}` })}</p>
          )}
        </>
      )}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => send("accept")} disabled={state === "sending" || !proposal} className="btn btn-primary">
          {state === "sending" ? <Spinner /> : <Check size={16} />} {t("accept")}
        </button>
        <button type="button" onClick={() => send("decline")} disabled={state === "sending" || !proposal} className="btn btn-ghost">
          {t("decline")}
        </button>
      </div>
      {state === "error" && (
        <p role="alert" className="field-error mt-6">
          {e("network")}
        </p>
      )}
    </>
  );
}
