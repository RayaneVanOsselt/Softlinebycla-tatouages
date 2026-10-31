"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { asset, basePath } from "@/lib/config";

const KEY = "slc-intro-seen";
/** Accueil = /fr/, /nl/ ou /en/ (précédé du chemin GitHub Pages éventuel). */
const HOME_PATTERN = `^${basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(fr|nl|en)/?$`;

/**
 * Script exécuté avant l'affichage : décide si l'introduction joue (première visite de la session,
 * mouvement non réduit, page d'accueil). Sinon elle n'est jamais affichée — aucun flash.
 */
export const introBootScript = `(function(){try{var d=document.documentElement;d.classList.remove('no-js');var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var s=sessionStorage.getItem('${KEY}');var home=new RegExp(${JSON.stringify(HOME_PATTERN)}).test(location.pathname);d.dataset.intro=(!r&&!s&&home)?'play':'skip';if(!r&&!s&&home)sessionStorage.setItem('${KEY}','1');}catch(e){document.documentElement.dataset.intro='skip';}})();`;

/** Introduction : le trait d'aiguille se dessine, le monogramme officiel apparaît, puis le rideau se lève. */
export function Intro() {
  const t = useTranslations("intro");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const html = document.documentElement;
    if (!el || html.dataset.intro !== "play") return;
    const finish = () => {
      html.dataset.intro = "done";
    };
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el && e.animationName === "intro-out") finish();
    };
    el.addEventListener("animationend", onEnd);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    const safety = window.setTimeout(finish, 3500);
    return () => {
      el.removeEventListener("animationend", onEnd);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <div ref={ref} className="intro" aria-hidden="true" data-testid="intro">
      <span className="intro-needle" />
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/brand/monogram-ink.png")} alt="" className="intro-mark" width={277} height={364} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/brand/wordmark-ink.png")} alt="" className="intro-word" width={431} height={51} />
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="intro-skip"
        onClick={() => {
          document.documentElement.dataset.intro = "done";
        }}
      >
        {t("skip")}
      </button>
    </div>
  );
}
