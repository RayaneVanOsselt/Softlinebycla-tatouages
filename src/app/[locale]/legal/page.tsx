import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalSection } from "@/components/site/LegalSection";
import { PageHeading } from "@/components/site/PageHeading";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/config";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.legal" });
  return pageMetadata({ locale, path: "/legal", title: t("title"), description: t("description") });
}

export default async function LegalPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const legal = siteConfig.mentionsLegales;
  // Seules les informations réellement renseignées dans content/site.json sont affichées (aucune adresse publiée).
  const rows: Array<[string, string]> = [
    [t("name"), legal.nom || "SOFTLINEBY.CLA"],
    [t("form"), legal.formeJuridique],
    [t("enterprise"), legal.numeroEntreprise],
    [t("vat"), legal.tva],
    [t("contact"), legal.emailDonneesPersonnelles || siteConfig.emailContact],
  ].filter(([, v]) => v) as Array<[string, string]>;

  return (
    <>
      <PageHeading eyebrow={t("eyebrow")} title={t("title")} />
      <div className="container-site max-w-5xl pb-28">
        <LegalSection title={t("editorTitle")}>
          <dl className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="field-label pt-1">{k}</dt>
                <dd className="text-chocolate">{v}</dd>
              </div>
            ))}
          </dl>
        </LegalSection>
        <LegalSection title={t("hostingTitle")}>
          <p>{t("hosting")}</p>
        </LegalSection>
        <LegalSection title={t("ipTitle")}>
          <p>{t("ip")}</p>
        </LegalSection>
        <LegalSection title={t("liabilityTitle")}>
          <p>{t("liability")}</p>
        </LegalSection>
        {legal.derniereMiseAJour && <p className="pt-6 text-sm text-fg-muted">{t("updated", { date: legal.derniereMiseAJour })}</p>}
      </div>
    </>
  );
}
