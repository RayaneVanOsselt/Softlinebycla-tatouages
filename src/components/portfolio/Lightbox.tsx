"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import type { PublicMedia } from "@/lib/content/portfolio";
import { ArrowUpRight, ChevronLeft, ChevronRight, Close } from "../ui/icons";

export interface LightboxItem {
  media: PublicMedia;
  title: string;
  category?: string;
  slug: string;
}

/** Visionneuse accessible : Échap pour fermer, flèches pour naviguer, balayage tactile, focus piégé et restauré. */
export function Lightbox({ items, index, onClose, onIndex }: { items: LightboxItem[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const t = useTranslations("portfolio");
  const reduce = useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);
  const open = index !== null;
  const item = open ? items[index] : undefined;

  const go = useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const id = requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab" && dialog.current) {
        const f = [...dialog.current.querySelectorAll<HTMLElement>("button, a, video[controls]")];
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, go, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && item && (
        <motion.div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label={t("lightboxLabel")}
          className="fixed inset-0 z-[90] flex flex-col bg-chocolate/97 text-cream"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.35 }}
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX;
            if (start != null && end != null && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
            <p className="text-[0.72rem] font-bold tracking-[0.2em] text-sand uppercase" aria-live="polite">
              {t("counter", { current: index! + 1, total: items.length })}
            </p>
            <button type="button" data-autofocus onClick={onClose} className="grid size-12 place-items-center rounded-full border border-cream/30 transition-colors hover:bg-cream hover:text-chocolate" aria-label={t("close")}>
              <Close size={20} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={item.media.id}
                className="relative h-full w-full"
                initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {item.media.kind === "video" ? (
                  <video
                    key={item.media.url}
                    src={item.media.url}
                    poster={item.media.posterUrl ?? undefined}
                    controls
                    playsInline
                    autoPlay={!reduce}
                    muted
                    loop
                    aria-label={item.media.alt}
                    className="absolute inset-0 m-auto max-h-full max-w-full"
                  />
                ) : (
                  <Image src={item.media.url} alt={item.media.alt} fill sizes="100vw" quality={85} className="object-contain" priority />
                )}
              </motion.div>
            </AnimatePresence>
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-2 hidden size-12 place-items-center rounded-full bg-chocolate/60 backdrop-blur transition hover:bg-cream hover:text-chocolate md:left-6 md:grid" aria-label={t("prev")}>
                  <ChevronLeft size={22} />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-2 hidden size-12 place-items-center rounded-full bg-chocolate/60 backdrop-blur transition hover:bg-cream hover:text-chocolate md:right-6 md:grid" aria-label={t("next")}>
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-6">
            <div>
              {item.category && <p className="text-[0.68rem] font-bold tracking-[0.2em] text-sand uppercase">{item.category}</p>}
              <p className="font-[family-name:var(--font-display)] text-2xl">{item.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 1 && (
                <div className="flex gap-2 md:hidden">
                  <button type="button" onClick={() => go(-1)} className="grid size-11 place-items-center rounded-full border border-cream/30" aria-label={t("prev")}>
                    <ChevronLeft size={18} />
                  </button>
                  <button type="button" onClick={() => go(1)} className="grid size-11 place-items-center rounded-full border border-cream/30" aria-label={t("next")}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              <Link href={{ pathname: "/portfolio/[slug]", params: { slug: item.slug } }} className="btn btn-ghost min-h-11 text-cream" onClick={onClose}>
                {t("details")} <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
