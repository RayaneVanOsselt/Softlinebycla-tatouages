import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { ProjectEditor, type EditorProject } from "@/components/admin/ProjectEditor";
import { blobEnabled } from "@/lib/config";
import { getDb } from "@/lib/db";
import { categories, media, projects } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projet" };

const L = (v: { fr?: string; nl?: string; en?: string } | null | undefined) => ({ fr: v?.fr ?? "", nl: v?.nl ?? "", en: v?.en ?? "" });

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  let project: EditorProject;
  if (id === "nouveau") {
    project = { id: null, slug: "", title: L(null), description: L(null), categoryId: null, year: null, featured: false, published: true, media: [] };
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const [p] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!p) notFound();
    const ms = await db.select().from(media).where(eq(media.projectId, id)).orderBy(asc(media.sortOrder));
    project = {
      id: p.id,
      slug: p.slug,
      title: L(p.title),
      description: L(p.description),
      categoryId: p.categoryId,
      year: p.year,
      featured: p.featured,
      published: p.published,
      media: ms.map((m) => ({ id: m.id, kind: m.kind, url: m.url, posterUrl: m.posterUrl, alt: L(m.alt), focalX: m.focalX, focalY: m.focalY })),
    };
  }
  return (
    <>
      <Link href="/admin/portfolio" className="text-sm underline underline-offset-4">
        ← Portfolio
      </Link>
      <div className="mt-4">
        <AdminHeading title={project.id ? project.title.fr || "Projet" : "Nouveau projet"} />
      </div>
      <ProjectEditor project={project} categories={cats.map((c) => ({ id: c.id, name: c.name.fr ?? c.slug }))} blobEnabled={blobEnabled()} />
    </>
  );
}
