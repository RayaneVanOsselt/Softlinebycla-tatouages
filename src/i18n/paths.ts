/** Chemins des pages (identiques dans les 3 langues : l'hébergement statique ne permet pas de les traduire). */
export type InternalPath = "/" | "/portfolio" | "/portfolio/[slug]" | "/about" | "/booking" | "/booking/response" | "/contact" | "/privacy" | "/legal";

export function localizedPath(path: InternalPath, locale: "fr" | "nl" | "en", params: Record<string, string> = {}): string {
  const p = Object.entries(params).reduce<string>((acc, [k, v]) => acc.replace(`[${k}]`, v), path);
  return `/${locale}${p === "/" ? "" : p}/`;
}
