import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/portfolio/MediaImage";
import { Reveal } from "@/components/site/Reveal";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/config";
import { getProjectBySlug, getPublishedSlugs } from "@/lib/content/portfolio";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs().catch(() => []);
  return routing.locales.flatMap((locale) => slugs.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getProjectBySlug(slug, locale);
  if (!data) return {};
  const cover = data.project.media[0]!;
  const imageUrl = cover.kind === "video" ? cover.posterUrl : cover.url;
  return pageMetadata({
    locale,
    path: "/portfolio/[slug]",
    params: { slug },
    title: data.project.title,
    description: data.project.description || data.project.title,
    image: imageUrl ? { url: imageUrl.startsWith("http") ? imageUrl : `${siteUrl()}${imageUrl}`, width: cover.width, height: cover.height, alt: cover.alt } : undefined,
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getProjectBySlug(slug, locale);
  if (!data) notFound();
  const { project, similar, prev, next } = data;
  const t = await getTranslations("portfolio");
  const [cover, ...more] = project.media;

  return (
    <article className="pt-[calc(var(--header-h)+2rem)]">
      <div className="container-site">
        <Link href="/portfolio" className="link-reveal inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.16em] uppercase">
          <ArrowLeft size={16} /> {t("back")}
        </Link>
      </div>

      <div className="container-site mt-10 grid gap-12 pb-20 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          {cover && (
            <div className="hero-in relative overflow-hidden rounded-[var(--radius-card)] bg-surface-strong" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}>
              {cover.kind === "video" ? (
                <video src={cover.url} poster={cover.posterUrl ?? undefined} controls playsInline muted loop preload="metadata" aria-label={cover.alt} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <MediaImage media={cover} sizes="(max-width: 1024px) 100vw, 58vw" priority quality={85} />
              )}
            </div>
          )}
          {more.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-5">
              {more.map((m) => (
                <Reveal key={m.id} className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface-strong" style={{ aspectRatio: `${m.width} / ${m.height}` }}>
                  {m.kind === "video" ? (
                    <video src={m.url} poster={m.posterUrl ?? undefined} controls playsInline muted preload="metadata" aria-label={m.alt} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <MediaImage media={m} sizes="(max-width: 1024px) 50vw, 29vw" />
                  )}
                </Reveal>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            {project.category && (
              <p className="eyebrow hero-in" style={{ ["--d" as string]: "60ms" }}>
                {project.category.name}
              </p>
            )}
            <h1 className="display-l mt-5 overflow-hidden pb-2">
              <span className="hero-mask" style={{ ["--d" as string]: "120ms" }}>
                {project.title}
              </span>
            </h1>
            {project.description && (
              <p className="lead hero-in mt-7" style={{ ["--d" as string]: "240ms" }}>
                {project.description}
              </p>
            )}
            <dl className="hero-in mt-10 grid grid-cols-2 gap-6 border-t border-line pt-6 text-sm" style={{ ["--d" as string]: "320ms" }}>
              {project.category && (
                <div>
                  <dt className="field-label">{t("style")}</dt>
                  <dd className="mt-1">{project.category.name}</dd>
                </div>
              )}
              {project.year && (
                <div>
                  <dt className="field-label">{t("year")}</dt>
                  <dd className="mt-1">{project.year}</dd>
                </div>
              )}
              <div>
                <dt className="field-label">{t("video")} / photo</dt>
                <dd className="mt-1">{t("media", { count: project.media.length })}</dd>
              </div>
            </dl>
            <div className="hero-in mt-10 rounded-[var(--radius-card)] bg-surface p-7" style={{ ["--d" as string]: "400ms" }}>
              <p className="display-s">{t("bookSimilar")}</p>
              <Link href="/booking" className="btn btn-primary mt-5">
                {t("bookSimilarCta")} <ArrowRight className="btn-icon" size={16} />
              </Link>
            </div>
            <nav className="mt-10 flex justify-between gap-4 text-sm" aria-label="Projets">
              {prev ? (
                <Link href={{ pathname: "/portfolio/[slug]", params: { slug: prev.slug } }} className="link-reveal inline-flex items-center gap-2">
                  <ArrowLeft size={16} /> {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={{ pathname: "/portfolio/[slug]", params: { slug: next.slug } }} className="link-reveal inline-flex items-center gap-2 text-right">
                  {next.title} <ArrowRight size={16} />
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="bg-surface py-20 md:py-28" aria-labelledby="similar-title">
          <div className="container-site">
            <h2 id="similar-title" className="display-m">
              {t("similar")}
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((p, i) => (
                <Reveal as="li" key={p.id} delay={i * 100}>
                  <Link href={{ pathname: "/portfolio/[slug]", params: { slug: p.slug } }} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-strong">
                      <span className="absolute inset-0 block transition-transform duration-[1.2s] ease-[var(--ease-soft)] group-hover:scale-[1.04]">
                        <MediaImage media={p.media[0]!} sizes="(max-width: 640px) 100vw, 33vw" />
                      </span>
                    </span>
                    <span className="mt-4 flex items-center justify-between">
                      <span className="font-[family-name:var(--font-display)] text-2xl">{p.title}</span>
                      <ArrowUpRight size={18} />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
