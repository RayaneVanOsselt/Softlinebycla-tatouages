import { asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { ProjectList } from "@/components/admin/ProjectList";
import { getDb } from "@/lib/db";
import { categories, media, projects } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio" };

export default async function AdminPortfolio() {
  const db = await getDb();
  const [list, cats, allMedia, counts] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.createdAt)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select({ projectId: media.projectId, url: media.url, posterUrl: media.posterUrl, kind: media.kind, sortOrder: media.sortOrder }).from(media).orderBy(asc(media.sortOrder)),
    db.select({ categoryId: projects.categoryId, n: count() }).from(projects).groupBy(projects.categoryId),
  ]);
  const catName = new Map(cats.map((c) => [c.id, c.name.fr ?? c.slug]));
  const items = list.map((p) => {
    const ms = allMedia.filter((m) => m.projectId === p.id);
    const cover = ms[0];
    return {
      id: p.id,
      title: p.title.fr ?? p.slug,
      category: p.categoryId ? (catName.get(p.categoryId) ?? null) : null,
      featured: p.featured,
      published: p.published,
      cover: cover ? (cover.kind === "video" ? cover.posterUrl : cover.url) : null,
      mediaCount: ms.length,
    };
  });
  const catCount = new Map(counts.map((c) => [c.categoryId, c.n]));
  return (
    <>
      <AdminHeading
        title="Portfolio"
        text="Réorganisez avec les flèches, publiez ou masquez un projet, choisissez ceux qui apparaissent à la une. Les changements sont visibles sur le site en quelques secondes."
        actions={
          <Link href="/admin/portfolio/nouveau" className="rounded-full bg-nut px-5 py-2.5 text-sm font-semibold text-ivory">
            + Nouveau projet
          </Link>
        }
      />
      <ProjectList initial={items} categories={cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: catCount.get(c.id) ?? 0 }))} />
    </>
  );
}
