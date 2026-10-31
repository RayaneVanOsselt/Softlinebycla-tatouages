import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MediaImage } from "@/components/portfolio/MediaImage";
import { Monogram } from "@/components/site/Brand";
import { PageHeading } from "@/components/site/PageHeading";
import { Reveal } from "@/components/site/Reveal";
import { ArrowRight } from "@/components/ui/icons";
import { CtaBand } from "@/components/home/CtaBand";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getFeaturedProjects } from "@/lib/content/portfolio";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.about" });
  return pageMetadata({ locale, path: "/about", title: t("title"), description: t("description") });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const featured = await getFeaturedProjects(locale, 8);
  const images = featured.flatMap((p) => p.media).filter((m) => m.kind === "image").slice(0, 3);
  const sections = [
    { title: t("approachTitle"), text: t("approach") },
    { title: t("processTitle"), text: t("process") },
    { title: t("experienceTitle"), text: t("experience") },
    { title: t("universeTitle"), text: t("universe") },
  ];

  return (
    <>
      <PageHeading eyebrow={t("eyebrow")} title={t("title")}>
        <p>{t("intro")}</p>
      </PageHeading>

      <section className="container-site grid gap-5 pb-20 sm:grid-cols-3">
        {images.map((m, i) => (
          <Reveal key={m.id} variant="mask" delay={i * 140} className={`relative aspect-[3/4] overflow-hidden bg-surface-strong ${i === 1 ? "arch sm:mt-16" : "rounded-[var(--radius-card)]"}`}>
            <div className="absolute inset-0">
              <MediaImage media={m} sizes="(max-width: 640px) 100vw, 33vw" />
            </div>
          </Reveal>
        ))}
      </section>

      <section className="container-site grid gap-16 pb-28 lg:grid-cols-12">
        <div className="relative hidden lg:col-span-3 lg:block">
          <div className="sticky top-[calc(var(--header-h)+3rem)]">
            <Monogram className="h-40 w-auto opacity-80" />
          </div>
        </div>
        <div className="space-y-16 lg:col-span-8 lg:col-start-5">
          {sections.map((s, i) => (
            <Reveal key={s.title} className="grid gap-5 border-t border-line pt-8 md:grid-cols-[5rem_1fr]">
              <span className="font-[family-name:var(--font-display)] text-3xl text-light-brown italic">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="display-s">{s.title}</h2>
                <p className="mt-4 max-w-2xl text-[1.05rem] text-fg-muted">{s.text}</p>
              </div>
            </Reveal>
          ))}
          <Reveal>
            <Link href="/portfolio" className="btn btn-ghost">
              {t("cta")} <ArrowRight className="btn-icon" size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
