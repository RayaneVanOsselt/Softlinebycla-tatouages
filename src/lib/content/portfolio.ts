import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { categories, media, projects, type Category, type Localized, type Media, type Project } from "../db/schema";

export interface PublicMedia {
  id: string;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  alt: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
  focalX: number;
  focalY: number;
}

export interface PublicProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number | null;
  featured: boolean;
  category: { slug: string; name: string } | null;
  media: PublicMedia[];
}

export const pick = (value: Localized | null | undefined, locale: string) =>
  (value?.[locale as keyof Localized] || value?.fr || value?.en || value?.nl || "").trim();

function toPublicMedia(m: Media, locale: string, fallbackAlt: string): PublicMedia {
  return {
    id: m.id,
    kind: m.kind,
    url: m.url,
    posterUrl: m.posterUrl,
    alt: pick(m.alt, locale) || fallbackAlt,
    width: m.width,
    height: m.height,
    blurDataUrl: m.blurDataUrl,
    focalX: m.focalX,
    focalY: m.focalY,
  };
}

function assemble(rows: Project[], mediaRows: Media[], cats: Category[], locale: string): PublicProject[] {
  const catById = new Map(cats.map((c) => [c.id, c]));
  const mediaBy = new Map<string, Media[]>();
  for (const m of mediaRows) {
    if (!m.projectId || m.visibility !== "public") continue;
    if (!mediaBy.has(m.projectId)) mediaBy.set(m.projectId, []);
    mediaBy.get(m.projectId)!.push(m);
  }
  return rows
    .map((p) => {
      const title = pick(p.title, locale);
      const cat = p.categoryId ? catById.get(p.categoryId) : undefined;
      return {
        id: p.id,
        slug: p.slug,
        title,
        description: pick(p.description, locale),
        year: p.year,
        featured: p.featured,
        category: cat ? { slug: cat.slug, name: pick(cat.name, locale) } : null,
        media: (mediaBy.get(p.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((m) => toPublicMedia(m, locale, title)),
      };
    })
    .filter((p) => p.media.length > 0);
}

export async function getPublishedProjects(locale: string) {
  const db = await getDb();
  const rows = await db.select().from(projects).where(eq(projects.published, true)).orderBy(asc(projects.sortOrder), asc(projects.createdAt));
  const ids = rows.map((r) => r.id);
  const [mediaRows, cats] = await Promise.all([
    ids.length ? db.select().from(media).where(inArray(media.projectId, ids)) : Promise.resolve([] as Media[]),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  const list = assemble(rows, mediaRows, cats, locale);
  const used = new Set(list.map((p) => p.category?.slug).filter(Boolean));
  const usedCategories = cats.filter((c) => used.has(c.slug)).map((c) => ({ slug: c.slug, name: pick(c.name, locale) }));
  return { projects: list, categories: usedCategories };
}

export async function getFeaturedProjects(locale: string, limit = 8) {
  const { projects: list } = await getPublishedProjects(locale);
  const featured = list.filter((p) => p.featured);
  return (featured.length ? featured : list).slice(0, limit);
}

export async function getProjectBySlug(slug: string, locale: string) {
  const db = await getDb();
  const [row] = await db.select().from(projects).where(and(eq(projects.slug, slug), eq(projects.published, true))).limit(1);
  if (!row) return null;
  const [mediaRows, cats] = await Promise.all([db.select().from(media).where(eq(media.projectId, row.id)), db.select().from(categories)]);
  const [project] = assemble([row], mediaRows, cats, locale);
  if (!project) return null;
  const { projects: all } = await getPublishedProjects(locale);
  const idx = all.findIndex((p) => p.id === project.id);
  const similar = all.filter((p) => p.id !== project.id && p.category?.slug === project.category?.slug).slice(0, 3);
  const others = similar.length ? similar : all.filter((p) => p.id !== project.id).slice(0, 3);
  return {
    project,
    similar: others,
    prev: idx > 0 ? all[idx - 1]! : null,
    next: idx >= 0 && idx < all.length - 1 ? all[idx + 1]! : null,
  };
}

export async function getPublishedSlugs() {
  const db = await getDb();
  const rows = await db.select({ slug: projects.slug, updatedAt: projects.updatedAt }).from(projects).where(eq(projects.published, true));
  return rows;
}
