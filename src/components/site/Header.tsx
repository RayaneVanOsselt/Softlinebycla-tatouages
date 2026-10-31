"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { ArrowUpRight } from "../ui/icons";
import { Monogram, Wordmark } from "./Brand";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV = [
  { href: "/portfolio", key: "portfolio" },
  { href: "/about", key: "about" },
  { href: "/booking", key: "booking" },
  { href: "/contact", key: "contact" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // En-tête qui se rétracte en descendant et réapparaît en remontant
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 320 && y > lastY.current + 4);
      if (y < lastY.current - 4 || y < 320) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Menu mobile : verrouillage du défilement, Échap pour fermer, focus piégé
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>("a,button")];
        const a = items[0];
        const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b?.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      menuButton.current?.focus();
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow] duration-500 ease-[var(--ease-soft)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled && !open ? "bg-ivory/85 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur-md" : "bg-transparent"}`}
      >
        <div className="container-site flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href="/" className="group flex items-center gap-3" aria-label="SOFTLINEBY.CLA — accueil">
            <Monogram className="h-10 w-auto transition-transform duration-700 ease-[var(--ease-soft)] group-hover:-rotate-6" priority />
            <Wordmark className="hidden h-[0.8rem] w-auto sm:block lg:hidden xl:block" />
          </Link>

          <nav aria-label={t("mainNav")} className="hidden lg:block">
            <ul className="flex items-center gap-6 text-[0.74rem] font-semibold tracking-[0.14em] whitespace-nowrap uppercase xl:gap-9 xl:text-[0.78rem] xl:tracking-[0.16em]">
              {NAV.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="link-reveal py-2" aria-current={isActive(item.href) ? "page" : undefined}>
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden md:block" />
            <Link href="/booking" className="btn btn-primary hidden min-h-11 px-5 text-[0.7rem] md:inline-flex lg:hidden xl:inline-flex">
              {t("bookCta")}
            </Link>
            <button
              ref={menuButton}
              type="button"
              className="flex min-h-11 items-center gap-3 text-[0.72rem] font-bold tracking-[0.2em] uppercase lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden>{t("menu")}</span>
              <span aria-hidden className="relative block h-3 w-7">
                <span className={`absolute left-0 h-px w-7 bg-current transition-transform duration-500 ${open ? "top-1.5 rotate-[22deg]" : "top-0"}`} />
                <span className={`absolute left-0 h-px bg-current transition-all duration-500 ${open ? "top-1.5 w-7 -rotate-[22deg]" : "top-3 w-5"}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="paper-grain fixed inset-0 z-40 flex flex-col bg-ivory pt-[var(--header-h)] lg:hidden"
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.75, ease: [0.65, 0, 0.35, 1] }}
          >
            <nav aria-label={t("mainNav")} className="container-site flex flex-1 flex-col justify-center">
              <ul className="space-y-1">
                {[{ href: "/", key: "home" } as const, ...NAV].map((item, i) => (
                  <motion.li
                    key={item.key}
                    initial={reduce ? false : { opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-baseline gap-4 py-2 font-[family-name:var(--font-display)] text-[clamp(2.6rem,11vw,4.5rem)] leading-none font-light"
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <span className="w-8 font-sans text-xs tracking-[0.2em] text-nut">0{i + 1}</span>
                      <span className="transition-[font-style] group-hover:italic group-aria-[current=page]:italic">{t(item.key)}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="container-site flex flex-wrap items-center justify-between gap-4 border-t border-line-soft py-6">
              <LanguageSwitcher />
              <Link href="/booking" className="btn btn-primary">
                {t("bookCta")} <ArrowUpRight className="btn-icon" size={16} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
