import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProposalResponse } from "@/components/booking/ProposalResponse";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getProposalByToken } from "@/lib/booking/service";
import { formatDateLong, formatDuration, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.response" });
  return { title: t("title"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function ResponsePage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ token?: string; choice?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token, choice } = await searchParams;
  const t = await getTranslations("booking.respond");
  const proposal = token && token.length >= 20 && token.length <= 100 ? await getProposalByToken(token) : null;

  return (
    <section className="container-site max-w-3xl pt-[calc(var(--header-h)+4rem)] pb-28">
      <p className="eyebrow">{t("eyebrow")}</p>
      {!proposal || proposal.expired ? (
        <>
          <h1 className="display-l mt-6">{t("expiredTitle")}</h1>
          <p className="lead mt-6">{t("expired")}</p>
          <Link href="/booking" className="btn btn-primary mt-10">
            {t("newRequest")}
          </Link>
        </>
      ) : (
        <>
          <h1 className="display-l mt-6">{t("title")}</h1>
          <p className="lead mt-6">{t("intro", { name: proposal.firstName })}</p>
          <div className="ticket mt-10 px-7 pt-7 pb-9">
            <p className="font-[family-name:var(--font-display)] text-3xl first-letter:uppercase">{formatDateLong(proposal.startAt, locale)}</p>
            <p className="mt-2 text-lg tabular-nums">
              {formatTime(proposal.startAt, locale)} – {formatTime(proposal.endAt, locale)} · {formatDuration((proposal.endAt.getTime() - proposal.startAt.getTime()) / 60000, locale)}
            </p>
            <p className="mt-4 text-[0.72rem] font-bold tracking-[0.18em] text-fg-muted uppercase">{proposal.reference}</p>
            {proposal.message && (
              <div className="mt-6 border-t border-dashed border-line pt-5">
                <p className="field-label">{t("message")}</p>
                <p className="mt-2 whitespace-pre-line">{proposal.message}</p>
              </div>
            )}
          </div>
          {proposal.holdExpiresAt && (
            <p className="mt-8 text-sm text-fg-muted">
              {t("expiresAt", { date: `${formatDateLong(proposal.holdExpiresAt, locale)} ${formatTime(proposal.holdExpiresAt, locale)}` })}
            </p>
          )}
          <ProposalResponse token={token!} preferred={choice === "decline" ? "decline" : "accept"} />
        </>
      )}
    </section>
  );
}
