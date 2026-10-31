/** Chemins localisés (SEO) — partagés entre le routage next-intl, le sitemap et les e-mails. */
export const localizedPathnames = {
  "/": "/",
  "/portfolio": "/portfolio",
  "/portfolio/[slug]": "/portfolio/[slug]",
  "/about": { fr: "/a-propos", nl: "/over-mij", en: "/about" },
  "/booking": { fr: "/reservation", nl: "/afspraak", en: "/booking" },
  "/booking/response": { fr: "/reservation/reponse", nl: "/afspraak/antwoord", en: "/booking/response" },
  "/contact": "/contact",
  "/privacy": { fr: "/confidentialite", nl: "/privacybeleid", en: "/privacy" },
  "/legal": { fr: "/mentions-legales", nl: "/juridische-informatie", en: "/legal-notice" },
} as const;

export type InternalPath = keyof typeof localizedPathnames;

export function localizedPath(path: InternalPath, locale: "fr" | "nl" | "en"): string {
  const entry = localizedPathnames[path];
  const p = typeof entry === "string" ? entry : entry[locale];
  return `/${locale}${p === "/" ? "" : p}`;
}
