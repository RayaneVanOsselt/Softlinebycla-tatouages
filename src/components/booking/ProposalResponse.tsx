"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Spinner } from "../ui/Field";
import { Check } from "../ui/icons";

export function ProposalResponse({ token, preferred }: { token: string; preferred?: "accept" | "decline" }) {
  const t = useTranslations("booking.respond");
  const e = useTranslations("booking.errors");
  const [state, setState] = useState<"idle" | "loading" | "accepted" | "declined" | "expired" | "error">("idle");

  const send = async (choice: "accept" | "decline") => {
    if (choice === "decline" && !window.confirm(t("confirmDecline"))) return;
    setState("loading");
    try {
      const res = await fetch("/api/booking-response", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, choice }),
      });
      const json = (await res.json().catch(() => ({}))) as { status?: string; code?: string };
      if (res.ok) setState(choice === "accept" ? "accepted" : "declined");
      else if (json.code === "EXPIRED" || json.code === "NOT_FOUND" || json.code === "INVALID_TRANSITION") setState("expired");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  if (state === "accepted" || state === "declined" || state === "expired") {
    const key = state === "accepted" ? "accepted" : state === "declined" ? "declined" : "expired";
    return (
      <div role="status" className="mt-10">
        {state === "accepted" && (
          <span className="grid size-14 place-items-center rounded-full bg-nut text-ivory">
            <Check size={26} />
          </span>
        )}
        <h2 className="display-m mt-6">{t(`${key}Title`)}</h2>
        <p className="lead mt-4">{t(key)}</p>
        {state !== "accepted" && (
          <Link href="/booking" className="btn btn-primary mt-8">
            {t("newRequest")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
      <button type="button" onClick={() => send("accept")} disabled={state === "loading"} className={`btn btn-primary ${preferred === "decline" ? "" : "ring-2 ring-nut/30 ring-offset-2 ring-offset-ivory"}`}>
        {state === "loading" ? <Spinner /> : <Check size={16} />} {t("accept")}
      </button>
      <button type="button" onClick={() => send("decline")} disabled={state === "loading"} className="btn btn-ghost">
        {t("decline")}
      </button>
      {state === "error" && (
        <p role="alert" className="field-error sm:self-center">
          {e("generic")}
        </p>
      )}
    </div>
  );
}
