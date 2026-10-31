"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { PublicProject } from "@/lib/content/portfolio";
import { Play } from "../ui/icons";
import { Lightbox, type LightboxItem } from "./Lightbox";
import { MediaImage } from "./MediaImage";

export function Gallery({ projects, categories }: { projects: PublicProject[]; categories: Array<{ slug: string; name: string }> }) {
  const t = useTranslations("portfolio");
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<string>("all");
  const [index, setIndex] = useState<number | null>(null);

  const visible = useMemo(() => (filter === "all" ? projects : projects.filter((p) => p.category?.slug === filter)), [projects, filter]);

  // Toutes les photos des projets visibles, dans l'ordre : navigation continue dans la visionneuse
  const items: LightboxItem[] = useMemo(
    () => visible.flatMap((p) => p.media.map((m) => ({ media: m, title: p.title, category: p.category?.name, slug: p.slug }))),
    [visible],
  );
  const firstIndex = (projectId: string) => items.findIndex((it) => visible.find((p) => p.id === projectId)?.media[0]?.id === it.media.id);

  return (
    <>
      {categories.length > 1 && (
        <div className="container-site">
          <div role="group" aria-label={t("filterLabel")} className="scrollbar-none -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-2">
            {[{ slug: "all", name: t("all") }, ...categories].map((c) => {
              const active = filter === c.slug;
              const count = c.slug === "all" ? projects.length : projects.filter((p) => p.category?.slug === c.slug).length;
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(c.slug)}
                  className={`relative min-h-11 shrink-0 rounded-full border px-5 text-[0.75rem] font-bold tracking-[0.14em] uppercase transition-colors duration-500 ${
                    active ? "border-chocolate text-ivory" : "border-line text-fg hover:border-chocolate"
                  }`}
                >
                  {active && (
                    <motion.span layoutId="filter-pill" className="absolute inset-0 -z-0 rounded-full bg-chocolate" transition={{ type: "spring", stiffness: 380, damping: 34 }} />
                  )}
                  <span className="relative">
                    {c.name} <span className="opacity-60">{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="container-site mt-10 pb-28">
        {visible.length === 0 ? (
          <p className="py-20 text-center text-fg-muted">{t("empty")}</p>
        ) : (
          <LayoutGroup>
            <motion.ul layout={!reduce} className="columns-2 gap-3 sm:gap-5 md:columns-3 xl:columns-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((p, i) => {
                  const m = p.media[0]!;
                  return (
                    <motion.li
                      layout={!reduce}
                      key={p.id}
                      initial={reduce ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : Math.min(i, 8) * 0.04 }}
                      className="mb-3 break-inside-avoid sm:mb-5"
                    >
                      <button
                        type="button"
                        onClick={() => setIndex(firstIndex(p.id))}
                        className="group block w-full text-left"
                        aria-label={t("open", { title: p.title })}
                      >
                        <span
                          className={`relative block overflow-hidden bg-surface-strong ${i % 5 === 2 ? "arch" : "rounded-[var(--radius-card)]"}`}
                          style={{ aspectRatio: `${m.width} / ${m.height}` }}
                        >
                          <span className="absolute inset-0 block transition-transform duration-[1.2s] ease-[var(--ease-soft)] group-hover:scale-[1.04]">
                            <MediaImage media={m} sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw" priority={i < 4} />
                          </span>
                          <span className="absolute inset-0 bg-chocolate/0 transition-colors duration-700 group-hover:bg-chocolate/15" />
                          {m.kind === "video" && (
                            <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-ivory/90 px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.16em] text-chocolate uppercase">
                              <Play size={10} /> {t("video")}
                            </span>
                          )}
                        </span>
                        <span className="mt-3 flex items-baseline justify-between gap-3">
                          <span className="font-[family-name:var(--font-display)] text-lg leading-tight md:text-xl">{p.title}</span>
                          {p.category && <span className="hidden shrink-0 text-[0.62rem] font-bold tracking-[0.16em] text-fg-muted uppercase sm:inline">{p.category.name}</span>}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          </LayoutGroup>
        )}
      </div>

      <Lightbox items={items} index={index} onClose={() => setIndex(null)} onIndex={setIndex} />
    </>
  );
}
