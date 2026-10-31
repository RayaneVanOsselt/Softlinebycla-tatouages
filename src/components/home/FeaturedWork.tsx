"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PublicProject } from "@/lib/content/portfolio";
import { MediaImage } from "../portfolio/MediaImage";
import { ArrowUpRight, Play } from "../ui/icons";

/** Hauteurs/décalages variés : composition éditoriale asymétrique */
const LAYOUT = [
  "h-full self-start",
  "h-[76%] self-end",
  "h-[88%] self-center",
  "h-[70%] self-start",
  "h-[94%] self-end",
  "h-[78%] self-center",
  "h-[86%] self-start",
  "h-[72%] self-end",
];

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

export function FeaturedWork({
  projects,
  labels,
}: {
  projects: PublicProject[];
  labels: { eyebrow: string; title: string; text: string; all: string; video: string };
}) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useDesktop();
  const pinned = desktop && !reduce;
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (!pinned) return;
    const measure = () => {
      const el = track.current;
      if (el) setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pinned, projects.length]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      ref={section}
      aria-labelledby="featured-title"
      className="on-dark relative bg-chocolate text-cream"
      style={pinned ? { height: `calc(100vh + ${distance}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-screen flex-col overflow-hidden" : "py-24"}>
        <div className="container-site flex flex-wrap items-end justify-between gap-6 pt-[calc(var(--header-h)+1rem)] lg:pt-[calc(var(--header-h)+2rem)]">
          <div>
            <p className="eyebrow">{labels.eyebrow}</p>
            <h2 id="featured-title" className="display-l mt-5">
              {labels.title}
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-sand">{labels.text}</p>
            <Link href="/portfolio" className="link-line mt-4 inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] uppercase">
              {labels.all} <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        <motion.div
          ref={track}
          style={pinned ? { x } : undefined}
          className={
            pinned
              ? "flex min-h-0 flex-1 gap-10 px-[var(--gutter)] py-8 will-change-transform"
              : "scrollbar-none mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[var(--gutter)] pb-4"
          }
        >
          {projects.map((p, i) => {
            const m = p.media[0]!;
            return (
              <Link
                key={p.id}
                href={`/portfolio/${p.slug}`}
                className={`group relative block shrink-0 snap-start ${
                  pinned ? `${LAYOUT[i % LAYOUT.length]} aspect-[3/4]` : "aspect-[3/4] w-[78vw] max-w-sm"
                }`}
              >
                <div className={`relative h-full w-full overflow-hidden bg-nut ${i % 3 === 1 ? "arch" : "rounded-[var(--radius-card)]"}`}>
                  <div className="absolute inset-0 transition-transform duration-[1.4s] ease-[var(--ease-soft)] group-hover:scale-[1.045]">
                    <MediaImage media={m} sizes="(max-width: 1024px) 78vw, 30vw" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-chocolate/70 via-transparent to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
                  {m.kind === "video" && (
                    <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-ivory/90 px-3 py-1.5 text-[0.65rem] font-bold tracking-[0.16em] text-chocolate uppercase">
                      <Play size={11} /> {labels.video}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                    <div>
                      <p className="text-[0.68rem] font-bold tracking-[0.2em] text-sand uppercase">
                        {String(i + 1).padStart(2, "0")} — {p.category?.name}
                      </p>
                      <h3 className="mt-1 font-[family-name:var(--font-display)] text-[1.7rem] leading-tight text-ivory">{p.title}</h3>
                    </div>
                    <span className="grid size-10 shrink-0 translate-y-2 place-items-center rounded-full border border-cream/50 text-cream opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          <Link
            href="/portfolio"
            className={`group flex shrink-0 snap-start flex-col justify-between rounded-[var(--radius-card)] border border-cream/25 p-8 transition-colors duration-500 hover:bg-cream hover:text-chocolate ${
              pinned ? "h-[70%] w-[20rem] self-center" : "aspect-[3/4] w-[78vw] max-w-sm"
            }`}
          >
            <span className="eyebrow">{labels.eyebrow}</span>
            <span className="font-[family-name:var(--font-display)] text-4xl leading-tight italic">{labels.all}</span>
            <ArrowUpRight size={28} />
          </Link>
        </motion.div>

        {pinned && (
          <div className="container-site pb-8">
            <div className="h-px w-full bg-cream/15">
              <motion.div className="h-px bg-cream" style={{ width: progress }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
