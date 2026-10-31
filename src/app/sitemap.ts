import type { MetadataRoute } from "next";
import { localizedPath, type InternalPath } from "@/i18n/paths";
import { siteUrl } from "@/lib/config";
import { getPublishedSlugs } from "@/lib/content/portfolio";

export const revalidate = 3600;

const LOCALES = ["fr", "nl", "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entry = (path: InternalPath, params: Record<string, string> = {}, lastModified?: Date, priority = 0.7): MetadataRoute.Sitemap[number] => {
    const fill = (l: (typeof LOCALES)[number]) => `${base}${Object.entries(params).reduce((p, [k, v]) => p.replace(`[${k}]`, v), localizedPath(path, l))}`;
    return {
      url: fill("fr"),
      lastModified: lastModified ?? new Date(),
      priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, fill(l)])) },
    };
  };
  const slugs = await getPublishedSlugs().catch(() => []);
  return [
    entry("/", {}, undefined, 1),
    entry("/portfolio", {}, undefined, 0.9),
    entry("/booking", {}, undefined, 0.9),
    entry("/about"),
    entry("/contact"),
    entry("/privacy", {}, undefined, 0.3),
    entry("/legal", {}, undefined, 0.3),
    ...slugs.map((s) => entry("/portfolio/[slug]", { slug: s.slug }, s.updatedAt, 0.6)),
  ];
}
