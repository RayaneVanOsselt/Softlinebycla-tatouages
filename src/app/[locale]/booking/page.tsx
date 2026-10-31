import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingFlow } from "@/components/booking/BookingFlow";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.booking" });
  return pageMetadata({ locale, path: "/booking", title: t("title"), description: t("description") });
}

export default async function BookingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking");
  const title = t("title");

  return (
    <section className="paper-grain relative">
      <div className="container-site pt-[calc(var(--header-h)+2.5rem)] pb-24 md:pt-[calc(var(--header-h)+4rem)]">
        <p className="eyebrow hero-in">{t("eyebrow")}</p>
        {/* Grande initiale calligraphiée, en écho au monogramme */}
        <h1 className="mt-6 flex flex-wrap items-end gap-x-4 font-[family-name:var(--font-display)] leading-[0.9] font-light">
          <span className="hero-in flex items-end" style={{ ["--d" as string]: "60ms" }}>
            <span aria-hidden className="-mr-[0.08em] text-[clamp(6rem,15vw,12rem)] leading-[0.75] text-nut italic">
              {title.charAt(0)}
            </span>
            <span className="sr-only">{title.charAt(0)}</span>
            <span className="text-[clamp(2.6rem,6.5vw,5.75rem)] tracking-[-0.02em] uppercase">{title.slice(1)}</span>
          </span>
          <span className="hero-in text-[clamp(2.6rem,6.5vw,5.75rem)] tracking-[-0.02em] uppercase" style={{ ["--d" as string]: "160ms" }}>
            {t("titleAccent")}
          </span>
        </h1>
        <p className="lead hero-in mt-6 max-w-2xl" style={{ ["--d" as string]: "240ms" }}>
          {t("intro")}
        </p>
        <noscript>
          <p className="mt-6 rounded-xl bg-surface p-4">JavaScript est nécessaire pour afficher l’agenda. / JavaScript is required to display the calendar.</p>
        </noscript>
        <div className="mt-12">
          <BookingFlow />
        </div>
      </div>
    </section>
  );
}
