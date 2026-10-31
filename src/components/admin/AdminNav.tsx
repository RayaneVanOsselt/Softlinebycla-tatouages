"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/admin/actions";
import { Monogram } from "../site/Brand";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil" },
  { href: "/admin/reservations", label: "Réservations", short: "Demandes", badge: "pending" },
  { href: "/admin/agenda", label: "Agenda", short: "Agenda" },
  { href: "/admin/portfolio", label: "Portfolio", short: "Portfolio" },
  { href: "/admin/messages", label: "Messages", short: "Messages", badge: "unread" },
  { href: "/admin/parametres", label: "Paramètres", short: "Réglages" },
  { href: "/admin/synchronisation", label: "Synchronisation", short: "Synchro", badge: "syncErrors" },
] as const;

export function AdminNav({ email, counts }: { email: string; counts: Record<string, number> }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-line-soft bg-ivory px-5 py-6 lg:flex">
        <Link href="/admin" className="flex items-center gap-3">
          <Monogram className="h-10 w-auto" />
          <span className="text-[0.7rem] font-bold tracking-[0.2em] uppercase">Administration</span>
        </Link>
        <nav className="mt-10 flex-1" aria-label="Administration">
          <ul className="space-y-1">
            {ITEMS.map((i) => {
              const n = "badge" in i ? counts[i.badge] : 0;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={active(i.href) ? "page" : undefined}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active(i.href) ? "bg-nut text-ivory" : "hover:bg-cream/60"}`}
                  >
                    {i.label}
                    {n ? <span className={`rounded-full px-2 text-xs ${active(i.href) ? "bg-ivory text-nut" : "bg-nut text-ivory"}`}>{n}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="space-y-3 border-t border-line-soft pt-4 text-xs text-fg-muted">
          <p className="truncate" title={email}>
            {email}
          </p>
          <div className="flex items-center justify-between">
            <a href="/fr" target="_blank" className="link-line">
              Voir le site ↗
            </a>
            <form action={signOutAction}>
              <button type="submit" className="link-line">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile : barre supérieure + navigation basse */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line-soft bg-ivory/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Monogram className="h-8 w-auto" />
          <span className="text-[0.65rem] font-bold tracking-[0.2em] uppercase">Admin</span>
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="text-xs font-semibold underline underline-offset-4">
            Déconnexion
          </button>
        </form>
      </header>
      <nav aria-label="Administration" className="scrollbar-none fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-line-soft bg-ivory/95 backdrop-blur lg:hidden">
        {ITEMS.map((i) => {
          const n = "badge" in i ? counts[i.badge] : 0;
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active(i.href) ? "page" : undefined}
              className={`relative flex min-h-14 min-w-[4.6rem] flex-1 flex-col items-center justify-center px-2 text-[0.68rem] font-bold ${active(i.href) ? "text-nut" : "text-fg-muted"}`}
            >
              {active(i.href) && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-nut" />}
              {i.short}
              {n ? <span className="absolute top-1.5 right-2 rounded-full bg-nut px-1.5 text-[0.6rem] text-ivory">{n}</span> : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
