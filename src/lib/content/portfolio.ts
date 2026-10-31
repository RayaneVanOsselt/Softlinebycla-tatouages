/**
 * Portfolio lu au moment du build depuis content/portfolio.json (modifiable sur GitHub)
 * et src/content/media.generated.json (dimensions des médias optimisés).
 */
import data from "../../../content/portfolio.json";
import generated from "../../content/media.generated.json";

type Localized = { fr?: string; nl?: string; en?: string };
type Generated = { kind: "image" | "video"; src: string; poster?: string; width: number; height: number; blurDataUrl?: string };

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

interface RawProject {
  id: string;
  categorie?: string;
  publie?: boolean;
  aLaUne?: boolean;
  annee?: number;
  medias: string[];
  cadrage?: { x: number; y: number };
  titre: Localized;
  description?: Localized;
  texteAlternatif?: Localized;
}

const media = generated as Record<string, Generated>;

export const pick = (value: Localized | null | undefined, locale: string) =>
  (value?.[locale as keyof Localized] || value?.fr || value?.en || value?.nl || "").trim();

function build(locale: string): PublicProject[] {
  const cats = new Map(data.categories.map((c) => [c.id, c.nom as Localized]));
  return (data.realisations as RawProject[])
    .filter((p) => p.publie !== false)
    .map((p) => {
      const title = pick(p.titre, locale);
      const catName = p.categorie ? cats.get(p.categorie) : undefined;
      return {
        id: p.id,
        slug: p.id,
        title,
        description: pick(p.description, locale),
        year: p.annee ?? null,
        featured: Boolean(p.aLaUne),
        category: p.categorie && catName ? { slug: p.categorie, name: pick(catName, locale) } : null,
        media: p.medias
          .map((file, i): PublicMedia | null => {
            const m = media[file];
            if (!m) {
              console.warn(`[portfolio] Fichier introuvable dans content/photos : ${file} (projet ${p.id})`);
              return null;
            }
            const alt = pick(p.texteAlternatif, locale) || title;
            return {
              id: `${p.id}-${i}`,
              kind: m.kind,
              url: m.src,
              posterUrl: m.poster ?? null,
              alt: p.medias.length > 1 ? `${alt} (${i + 1}/${p.medias.length})` : alt,
              width: m.width,
              height: m.height,
              blurDataUrl: m.blurDataUrl ?? null,
              focalX: p.cadrage?.x ?? 50,
              focalY: p.cadrage?.y ?? 50,
            };
          })
          .filter((m): m is PublicMedia => m !== null),
      };
    })
    .filter((p) => p.media.length > 0);
}

export async function getPublishedProjects(locale: string) {
  const projects = build(locale);
  const used = new Set(projects.map((p) => p.category?.slug).filter(Boolean));
  const categories = data.categories.filter((c) => used.has(c.id)).map((c) => ({ slug: c.id, name: pick(c.nom, locale) }));
  return { projects, categories };
}

export async function getFeaturedProjects(locale: string, limit = 8) {
  const all = build(locale);
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}

export async function getProjectBySlug(slug: string, locale: string) {
  const all = build(locale);
  const idx = all.findIndex((p) => p.slug === slug);
  const project = all[idx];
  if (!project) return null;
  const similar = all.filter((p) => p.id !== project.id && p.category?.slug === project.category?.slug).slice(0, 3);
  return {
    project,
    similar: similar.length ? similar : all.filter((p) => p.id !== project.id).slice(0, 3),
    prev: idx > 0 ? all[idx - 1]! : null,
    next: idx < all.length - 1 ? all[idx + 1]! : null,
  };
}

export function getPublishedSlugs() {
  return build("fr").map((p) => p.slug);
}
