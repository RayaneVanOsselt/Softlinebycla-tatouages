import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { asset } from "@/lib/config";
import type { PublicMedia } from "@/lib/content/portfolio";
import { ArrowRight } from "../ui/icons";
import { HeroVideo } from "./HeroVideo";

export async function Hero({ media, title, text }: { media: PublicMedia | null; title?: string; text?: string }) {
  const t = await getTranslations("home");
  const [line1, line2] = title ? [title, ""] : [t("heroTitle"), t("heroTitleAccent")];

  return (
    <section className="paper-grain relative overflow-hidden" aria-labelledby="hero-title">
      {/* Trait d'aiguille vertical, signature du monogramme */}
      <span aria-hidden className="absolute top-[var(--header-h)] bottom-0 left-[58%] hidden w-px origin-top bg-line lg:block hero-in" style={{ ["--d" as string]: "0ms" }} />

      <div className="container-site grid min-h-[100svh] items-end gap-y-10 pt-[calc(var(--header-h)+2.5rem)] pb-14 lg:grid-cols-12 lg:gap-x-10 lg:pt-[calc(var(--header-h)+3rem)] lg:pb-20">
        <div className="relative z-10 lg:col-span-7 lg:pb-10">
          <p className="eyebrow hero-in" style={{ ["--d" as string]: "100ms" }}>
            {t("eyebrow")}
          </p>
          <h1 id="hero-title" className="display-xl mt-7">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="hero-mask" style={{ ["--d" as string]: "150ms" }}>
                {line1}
              </span>
            </span>
            {line2 && (
              <span className="block overflow-hidden pb-[0.12em] lg:pl-[12%]">
                <span className="hero-mask accent-italic" style={{ ["--d" as string]: "280ms" }}>
                  {line2}
                </span>
              </span>
            )}
          </h1>

          <div className="mt-8 grid gap-8 lg:mt-12 lg:max-w-xl lg:pl-[12%]">
            <p className="lead hero-in" style={{ ["--d" as string]: "450ms" }}>
              {text ?? t("heroText")}
            </p>
            <div className="hero-in flex flex-wrap gap-3" style={{ ["--d" as string]: "560ms" }}>
              <Link href="/booking" className="btn btn-primary">
                {t("ctaBook")} <ArrowRight className="btn-icon" size={16} />
              </Link>
              <Link href="/portfolio" className="btn btn-ghost">
                {t("ctaWork")}
              </Link>
            </div>
          </div>
        </div>

        <div className="relative lg:col-span-5 lg:self-stretch lg:pt-4">
          <div className="hero-in relative mx-auto h-[min(68svh,40rem)] w-full max-w-md lg:h-full lg:max-h-[46rem] lg:max-w-none" style={{ ["--d" as string]: "200ms" }}>
            <div className="arch absolute inset-0 bg-surface-strong">
              {media?.kind === "video" ? (
                <>
                  {media.posterUrl && (
                    <Image src={media.posterUrl} alt="" fill priority sizes="(max-width: 1024px) 90vw, 38vw" className="object-cover" />
                  )}
                  <HeroVideo src={asset(media.url)} poster={media.posterUrl ? asset(media.posterUrl) : ""} label={media.alt || t("heroMediaLabel")} />
                </>
              ) : media ? (
                <Image src={media.url} alt={media.alt} fill priority sizes="(max-width: 1024px) 90vw, 38vw" className="object-cover" style={{ objectPosition: `${media.focalX}% ${media.focalY}%` }} />
              ) : null}
            </div>
            {/* Cadre fin décalé */}
            <span aria-hidden className="arch pointer-events-none absolute inset-0 translate-x-3 -translate-y-3 border border-light-brown/50" />
          </div>
        </div>
      </div>

      <div aria-hidden className="absolute bottom-6 left-[var(--gutter)] hidden items-center gap-3 text-[0.68rem] font-bold tracking-[0.24em] text-nut uppercase lg:flex">
        <span className="relative block h-10 w-px overflow-hidden bg-line-soft">
          <span className="absolute inset-0 bg-nut motion-safe:animate-[scroll-cue_2.4s_var(--ease-silk)_infinite]" />
        </span>
        {t("scroll")}
      </div>
    </section>
  );
}
