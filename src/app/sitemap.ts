import type { MetadataRoute } from "next";
import { localizedPath, type InternalPath } from "@/i18n/paths";
import { siteUrl } from "@/lib/config";
import { getPublishedSlugs } from "@/lib/content/portfolio";

export const dynamic = "force-static";

const LOCALES = ["fr", "nl", "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entry = (path: InternalPath, params: Record<string, string> = {}, lastModified?: Date, priority = 0.7): MetadataRoute.Sitemap[number] => {
    const fill = (l: (typeof LOCALES)[number]) => `${base}${localizedPath(path, l, params)}`;
    return {
      url: fill("fr"),
      lastModified: lastModified ?? new Date(),
      priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, fill(l)])) },
    };
  };
  const slugs = getPublishedSlugs();
  return [
    entry("/", {}, undefined, 1),
    entry("/portfolio", {}, undefined, 0.9),
    entry("/booking", {}, undefined, 0.9),
    entry("/about"),
    entry("/contact"),
    entry("/privacy", {}, undefined, 0.3),
    entry("/legal", {}, undefined, 0.3),
    ...slugs.map((slug) => entry("/portfolio/[slug]", { slug }, undefined, 0.6)),
  ];
}
