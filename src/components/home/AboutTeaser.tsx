import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PublicMedia } from "@/lib/content/portfolio";
import { MediaImage } from "../portfolio/MediaImage";
import { Reveal } from "../site/Reveal";
import { ArrowRight, Spark } from "../ui/icons";

export async function AboutTeaser({ media, text }: { media: PublicMedia | null; text: string }) {
  const t = await getTranslations("home");
  const pillars = t.raw("pillars") as Array<{ title: string; text: string }>;
  return (
    <section className="relative bg-surface py-24 md:py-36" aria-labelledby="about-teaser">
      <div className="container-site grid items-center gap-14 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          {media && (
            <Reveal variant="mask" className="arch relative aspect-[4/5] w-full max-w-md bg-surface-strong">
              <div className="absolute inset-0">
                <MediaImage media={media} sizes="(max-width: 1024px) 90vw, 36vw" />
              </div>
            </Reveal>
          )}
          <Spark aria-hidden size={56} className="absolute -right-2 -bottom-6 text-light-brown lg:right-6" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal>
            <p className="eyebrow">{t("aboutLabel")}</p>
            <h2 id="about-teaser" className="display-l mt-6">
              {t("aboutTitle")}
            </h2>
            <p className="lead mt-8 max-w-xl">{text}</p>
          </Reveal>
          <ul className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-3 lg:gap-6">
            {pillars.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 120}>
                <p className="font-[family-name:var(--font-display)] text-2xl italic">{p.title}</p>
                <p className="mt-2 text-[0.95rem] text-fg-muted">{p.text}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={200} className="mt-10">
            <Link href="/about" className="link-line inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] uppercase">
              {t("aboutLink")} <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
