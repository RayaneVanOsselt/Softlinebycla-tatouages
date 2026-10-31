import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalSection } from "@/components/site/LegalSection";
import { PageHeading } from "@/components/site/PageHeading";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/config";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.privacy" });
  return pageMetadata({ locale, path: "/privacy", title: t("title"), description: t("description") });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const legal = siteConfig.mentionsLegales;
  const name = legal.nom || "SOFTLINEBY.CLA";
  const email = legal.emailDonneesPersonnelles || siteConfig.emailContact;
  const list = (key: "data" | "purposes" | "retention") =>
    (t.raw(key) as string[]).map((s) => s.replace("{attachmentDays}", String(siteConfig.conservation.imagesReferenceJours)).replace("{months}", String(siteConfig.conservation.donneesClientsMois)));

  return (
    <>
      <PageHeading eyebrow={t("eyebrow")} title={t("title")}>
        <p>{t("intro")}</p>
      </PageHeading>
      <div className="container-site max-w-5xl pb-28">
        <LegalSection title={t("controllerTitle")}>
          <p>{t("controller", { name, email: email || "—" })}</p>
        </LegalSection>
        <LegalSection title={t("dataTitle")}>
          <ul>{list("data").map((s) => <li key={s}>{s}</li>)}</ul>
        </LegalSection>
        <LegalSection title={t("purposesTitle")}>
          <ul>{list("purposes").map((s) => <li key={s}>{s}</li>)}</ul>
        </LegalSection>
        <LegalSection title={t("recipientsTitle")}>
          <p>{t("recipients")}</p>
        </LegalSection>
        <LegalSection title={t("retentionTitle")}>
          <ul>{list("retention").map((s) => <li key={s}>{s}</li>)}</ul>
        </LegalSection>
        <LegalSection title={t("rightsTitle")}>
          <p>{t("rights", { email: email || "—" })}</p>
        </LegalSection>
        <LegalSection title={t("cookiesTitle")}>
          <p>{t("cookies")}</p>
        </LegalSection>
        <LegalSection title={t("securityTitle")}>
          <p>{t("security")}</p>
        </LegalSection>
        {legal.derniereMiseAJour && <p className="pt-6 text-sm text-fg-muted">{t("updated", { date: legal.derniereMiseAJour })}</p>}
      </div>
    </>
  );
}
