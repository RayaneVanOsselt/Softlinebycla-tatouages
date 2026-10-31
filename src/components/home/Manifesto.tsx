"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block whitespace-pre">
      {word}{" "}
    </motion.span>
  );
}

/** Texte révélé mot à mot au rythme du défilement. */
export function Manifesto({ label, text }: { label: string; text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(/\s+/);

  return (
    <section className="container-site py-28 md:py-44" aria-label={label}>
      <div className="grid gap-10 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3 lg:pt-4">{label}</p>
        <p ref={ref} className="display-m text-chocolate lg:col-span-9">
          {reduce ? text : words.map((w, i) => <Word key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />)}
        </p>
      </div>
    </section>
  );
}
