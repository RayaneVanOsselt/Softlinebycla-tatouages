import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ProposalResponse } from "@/components/booking/ProposalResponse";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.response" });
  return { title: t("title"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function ResponsePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking.respond");
  return (
    <section className="container-site max-w-3xl pt-[calc(var(--header-h)+4rem)] pb-28">
      <p className="eyebrow">{t("eyebrow")}</p>
      <Suspense fallback={<p className="mt-10 text-fg-muted">…</p>}>
        <ProposalResponse />
      </Suspense>
    </section>
  );
}
