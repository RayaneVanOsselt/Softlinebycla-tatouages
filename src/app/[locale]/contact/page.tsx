import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageHeading } from "@/components/site/PageHeading";
import { ArrowRight, Mail, socialIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { activeSocials, siteConfig } from "@/lib/config";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.contact" });
  return pageMetadata({ locale, path: "/contact", title: t("title"), description: t("description") });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const socials = activeSocials();
  const contactEmail = siteConfig.emailContact || null;
  return (
    <>
      <PageHeading eyebrow={t("eyebrow")} title={t("title")}>
        <p>{t("intro")}</p>
      </PageHeading>
      <div className="container-site grid gap-16 pb-28 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <aside className="space-y-10 lg:col-span-4 lg:col-start-9">
          <div className="rounded-[var(--radius-card)] bg-surface p-7">
            <p className="display-s">{t("bookingHint")}</p>
            <Link href="/booking" className="btn btn-primary mt-6">
              {t("bookingLink")} <ArrowRight className="btn-icon" size={16} />
            </Link>
          </div>
          {contactEmail && (
            <div>
              <p className="eyebrow">{t("emailDirect")}</p>
              <a href={`mailto:${contactEmail}`} className="link-line mt-4 inline-flex items-center gap-2 break-all">
                <Mail size={18} /> {contactEmail}
              </a>
            </div>
          )}
          {socials.length > 0 && (
            <div>
              <p className="eyebrow">{t("social")}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {socials.map((s) => {
                  const Icon = socialIcon[s.key];
                  return (
                    <li key={s.key}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer me" className="btn btn-ghost min-h-11 px-4">
                        <Icon size={16} /> {s.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
