"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABEL: Record<string, string> = { fr: "Français", nl: "Nederlands", en: "English" };

/** Liens (et non boutons) : fonctionne sans JavaScript et conserve la page visitée dans la nouvelle langue. */
export function LanguageSwitcher({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations("nav");
  const { locale: _ignored, ...rest } = params as Record<string, string>;
  const href = { pathname, params: rest } as unknown as Parameters<typeof Link>[0]["href"];

  return (
    <nav aria-label={t("language")} className={className}>
      <ul className="flex items-center gap-1 text-[0.72rem] font-bold tracking-[0.18em]">
        {routing.locales.map((l, i) => (
          <li key={l} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden className={tone === "light" ? "text-sand/60" : "text-light-brown/60"}>
                ·
              </span>
            )}
            <Link
              href={href}
              locale={l}
              lang={l}
              hrefLang={l}
              aria-current={l === locale ? "true" : undefined}
              aria-label={LABEL[l]}
              className={`inline-flex min-h-11 min-w-9 items-center justify-center uppercase transition-opacity duration-300 ${
                l === locale ? "opacity-100" : "opacity-55 hover:opacity-100"
              }`}
              scroll={false}
            >
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
