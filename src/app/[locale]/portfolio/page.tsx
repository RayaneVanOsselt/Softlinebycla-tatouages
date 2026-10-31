import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gallery } from "@/components/portfolio/Gallery";
import { PageHeading } from "@/components/site/PageHeading";
import type { Locale } from "@/i18n/routing";
import { getPublishedProjects } from "@/lib/content/portfolio";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.portfolio" });
  return pageMetadata({ locale, path: "/portfolio", title: t("title"), description: t("description") });
}

export default async function PortfolioPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portfolio");
  const { projects, categories } = await getPublishedProjects(locale);
  return (
    <>
      <PageHeading eyebrow={t("eyebrow")} title={t("title")}>
        <p>{t("intro")}</p>
      </PageHeading>
      <Gallery projects={projects} categories={categories} />
    </>
  );
}
