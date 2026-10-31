import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteChrome } from "@/lib/content/site";
import { ArrowUpRight, Mail, socialIcon } from "../ui/icons";
import { FullLogo } from "./Brand";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const { socials, contactEmail } = await getSiteChrome();
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark paper-grain relative overflow-hidden bg-chocolate text-cream">
      <div className="container-site grid gap-14 pt-20 pb-10 md:grid-cols-12 md:pt-28">
        <div className="md:col-span-4">
          <FullLogo tone="cream" className="h-auto w-40" />
          <p className="mt-6 max-w-xs text-sand">{t("tagline")}</p>
        </div>

        <nav aria-label={t("navTitle")} className="md:col-span-2 md:col-start-6">
          <h2 className="eyebrow mb-5">{t("navTitle")}</h2>
          <ul className="space-y-2.5">
            {(
              [
                ["/", "home"],
                ["/portfolio", "portfolio"],
                ["/about", "about"],
                ["/contact", "contact"],
              ] as const
            ).map(([href, key]) => (
              <li key={key}>
                <Link href={href} className="link-reveal">
                  {nav(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <h2 className="eyebrow mb-5">{t("bookingTitle")}</h2>
          <p className="mb-5 text-sm text-sand">{t("bookingText")}</p>
          <Link href="/booking" className="btn btn-primary">
            {nav("bookCta")} <ArrowUpRight className="btn-icon" size={16} />
          </Link>
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="link-reveal mt-6 flex items-center gap-2 text-sm">
              <Mail size={16} className="shrink-0" /> <span>{contactEmail.split("@")[0]}<wbr />@{contactEmail.split("@")[1]}</span>
            </a>
          )}
        </div>

        <div className="md:col-span-2">
          {socials.length > 0 && (
            <>
              <h2 className="eyebrow mb-5">{t("followTitle")}</h2>
              <ul className="mb-8 flex flex-wrap gap-2">
                {socials.map((s) => {
                  const Icon = socialIcon[s.key];
                  return (
                    <li key={s.key}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer me"
                        aria-label={s.label}
                        className="grid size-11 place-items-center rounded-full border border-cream/30 transition-colors duration-500 hover:border-cream hover:bg-cream hover:text-chocolate"
                      >
                        <Icon size={18} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <h2 className="eyebrow mb-3">{nav("language")}</h2>
          <LanguageSwitcher tone="light" />
        </div>
      </div>

      <div className="container-site flex flex-col gap-4 border-t border-cream/15 py-7 text-[0.8rem] text-sand md:flex-row md:items-center md:justify-between">
        <p>
          © {year} SOFTLINEBY.CLA — {t("rights")}
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <Link href="/privacy" className="link-reveal">
              {t("privacy")}
            </Link>
          </li>
          <li>
            <Link href="/legal" className="link-reveal">
              {t("legal")}
            </Link>
          </li>
          <li>{t("cookies")}</li>
        </ul>
      </div>
    </footer>
  );
}
