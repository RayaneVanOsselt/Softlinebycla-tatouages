"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "../ui/icons";

/**
 * Vidéo authentique du hero : muette, en boucle, avec poster.
 * Pas de lecture automatique si l'utilisateur préfère un mouvement réduit ou économise ses données ;
 * mise en pause hors écran ; bouton pause/lecture accessible (WCAG 2.2.2).
 */
export function HeroVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const t = useTranslations("home");
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting && !userPaused) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [userPaused]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={src} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 bottom-4 z-10 grid size-11 place-items-center rounded-full bg-ivory/85 text-chocolate backdrop-blur transition-transform duration-300 hover:scale-105"
        aria-label={playing ? t("pauseVideo") : t("playVideo")}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </>
  );
}
