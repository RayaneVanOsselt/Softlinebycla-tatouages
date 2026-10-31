import site from "../../content/site.json";

/** Réglages du site (fichier content/site.json, modifiable sur GitHub). */
export const siteConfig = site;

export const brand = {
  name: "SOFTLINEBY.CLA",
  shortName: "softlineby.cla",
} as const;

export const locales = ["fr", "nl", "en"] as const;
export type AppLocale = (typeof locales)[number];

/** Préfixe GitHub Pages (« /Softlinebycla-tatouages »), vide en local. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Chemin d'un fichier de /public, avec le préfixe GitHub Pages. */
export const asset = (p: string) => (/^(https?:|data:|blob:)/.test(p) ? p : `${basePath}${p}`);

/** Adresse publique complète du site (préfixe inclus), sans « / » final. */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Adresse du moteur de réservation (Google Apps Script). En local : serveur de démonstration. */
export function bookingApiUrl() {
  return (process.env.NEXT_PUBLIC_BOOKING_API_URL || site.adresseApiReservation || "").trim();
}

export function activeSocials() {
  const labels = { instagram: "Instagram", tiktok: "TikTok", pinterest: "Pinterest", facebook: "Facebook", youtube: "YouTube" } as const;
  return (Object.keys(labels) as Array<keyof typeof labels>)
    .filter((k) => /^https:\/\//.test(site.reseauxSociaux[k] ?? ""))
    .map((k) => ({ key: k, label: labels[k], url: site.reseauxSociaux[k] }));
}
