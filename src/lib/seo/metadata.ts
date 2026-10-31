import type { Metadata } from "next";
import { siteUrl } from "../config";
import { localizedPath, type InternalPath } from "@/i18n/paths";

const OG_LOCALE: Record<string, string> = { fr: "fr_BE", nl: "nl_BE", en: "en_GB" };

/** Métadonnées par page et par langue : canonique, hreflang, Open Graph. */
export function pageMetadata(opts: {
  locale: "fr" | "nl" | "en";
  path: InternalPath;
  title: string;
  description: string;
  params?: Record<string, string>;
  image?: { url: string; width: number; height: number; alt: string };
  noindex?: boolean;
}): Metadata {
  const fill = (p: string) => Object.entries(opts.params ?? {}).reduce((acc, [k, v]) => acc.replace(`[${k}]`, v), p);
  const url = (l: "fr" | "nl" | "en") => `${siteUrl()}${fill(localizedPath(opts.path, l))}`;
  const image = opts.image ?? { url: `${siteUrl()}/brand/og-default.jpg`, width: 1200, height: 630, alt: "SOFTLINEBY.CLA" };
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: url(opts.locale),
      languages: { fr: url("fr"), nl: url("nl"), en: url("en"), "x-default": url("fr") },
    },
    openGraph: {
      type: "website",
      siteName: "SOFTLINEBY.CLA",
      title: opts.title,
      description: opts.description,
      url: url(opts.locale),
      locale: OG_LOCALE[opts.locale],
      alternateLocale: Object.entries(OG_LOCALE).filter(([l]) => l !== opts.locale).map(([, v]) => v),
      images: [image],
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image.url] },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}
