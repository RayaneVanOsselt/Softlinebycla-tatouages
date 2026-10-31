import { getSetting, pickLocalized, type SocialSettings } from "../settings";

/** Réseaux sociaux affichés : uniquement ceux dont l'URL est renseignée (jamais de lien vide). */
export function activeSocials(social: SocialSettings) {
  const labels: Record<keyof SocialSettings, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    pinterest: "Pinterest",
    facebook: "Facebook",
    youtube: "YouTube",
  };
  return (Object.keys(labels) as Array<keyof SocialSettings>)
    .filter((k) => social[k] && /^https:\/\//.test(social[k]))
    .map((k) => ({ key: k, label: labels[k], url: social[k] }));
}

export async function getSiteChrome() {
  const [social, contact] = await Promise.all([getSetting("social"), getSetting("contact")]);
  return { socials: activeSocials(social), contactEmail: contact.contactEmail || null };
}

export async function getEditableContent(locale: string, defaults: Record<string, string>) {
  const content = await getSetting("content");
  const out: Record<string, string> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    out[key] = pickLocalized((content as Record<string, Partial<Record<string, string>>>)[key], locale, fallback);
  }
  return out;
}
