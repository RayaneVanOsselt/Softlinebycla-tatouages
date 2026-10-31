"use client";

import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";

/** Révélation au défilement (IntersectionObserver + CSS) : léger, sans bloquer le contenu. */
export function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  variant = "fade",
  style,
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade" | "mask";
  style?: CSSProperties;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.inview = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.inview = "true";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`${variant === "mask" ? "reveal-mask" : "reveal"} ${className}`}
      style={{ ...style, ["--reveal-delay" as string]: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
