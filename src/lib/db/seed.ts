import { sql } from "drizzle-orm";
import manifest from "@/content/media-manifest.json";
import { seedCategories, seedProjects } from "@/content/portfolio-seed";
import { logger } from "../logger";
import type { Database } from "./index";
import { categories, media, projects } from "./schema";

type ManifestEntry = { kind: "image" | "video"; src: string; width: number; height: number; blurDataUrl?: string; poster?: string };
const entries = manifest as Record<string, ManifestEntry>;

/** Remplit le portfolio initial (photos/vidéos fournies) si la base est vide. Idempotent. */
export async function seedIfEmpty(db: Database) {
  const [{ count }] = (await db.select({ count: sql<number>`count(*)::int` }).from(projects)) as [{ count: number }];
  if (count > 0) return false;

  await db.transaction(async (tx) => {
    const cats = await tx
      .insert(categories)
      .values(seedCategories.map((c, i) => ({ slug: c.slug, name: c.name, sortOrder: i })))
      .onConflictDoNothing()
      .returning();
    const catId = new Map(cats.map((c) => [c.slug, c.id]));

    for (const [i, p] of seedProjects.entries()) {
      const [project] = await tx
        .insert(projects)
        .values({
          slug: p.slug,
          title: p.title,
          description: p.description,
          categoryId: catId.get(p.category) ?? null,
          featured: Boolean(p.featured),
          published: true,
          sortOrder: i,
        })
        .returning();
      const rows = p.media
        .map((key, j) => {
          const m = entries[key];
          if (!m) {
            logger.warn("seed.media_missing", { key });
            return null;
          }
          return {
            projectId: project!.id,
            kind: m.kind,
            url: m.src,
            posterUrl: m.poster ?? null,
            width: m.width,
            height: m.height,
            blurDataUrl: m.blurDataUrl ?? null,
            alt: p.alt,
            focalX: p.focal?.[0] ?? 50,
            focalY: p.focal?.[1] ?? 50,
            sortOrder: j,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length) await tx.insert(media).values(rows);
    }
  });
  logger.info("seed.portfolio", { projects: seedProjects.length });
  return true;
}
