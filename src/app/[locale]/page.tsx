import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutTeaser } from "@/components/home/AboutTeaser";
import { CtaBand } from "@/components/home/CtaBand";
import { FeaturedWork } from "@/components/home/FeaturedWork";
import { Hero } from "@/components/home/Hero";
import { Manifesto } from "@/components/home/Manifesto";
import { Process } from "@/components/home/Process";
import { getFeaturedProjects } from "@/lib/content/portfolio";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/config";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.home" });
  return pageMetadata({ locale, path: "/", title: t("title"), description: t("description") });
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const featured = await getFeaturedProjects(locale, 8);

  const heroProject = featured.find((p) => p.media[0]?.kind === "video") ?? featured[0];
  const rest = featured.filter((p) => p !== heroProject);
  const aboutMedia = rest.find((p) => p.media[0]?.kind === "image")?.media[0] ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SOFTLINEBY.CLA",
    url: `${siteUrl()}/${locale}/`,
    inLanguage: locale,
    description: t("heroText"),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero media={heroProject?.media[0] ?? null} />
      <Manifesto label={t("manifestoLabel")} text={t("manifesto")} />
      <FeaturedWork
        projects={rest.length ? rest : featured}
        labels={{ eyebrow: t("featuredLabel"), title: t("featuredTitle"), text: t("featuredText"), all: t("featuredAll"), video: (await getTranslations("portfolio"))("video") }}
      />
      <AboutTeaser media={aboutMedia} text={t("aboutText")} />
      <Process />
      <CtaBand />
    </>
  );
}
