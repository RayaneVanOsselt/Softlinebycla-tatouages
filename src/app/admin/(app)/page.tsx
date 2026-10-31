import Link from "next/link";
import { after } from "next/server";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { BookingRow } from "@/components/admin/BookingRow";
import { getCounts, getPending, getRecentFailures, getSetupStatus, getUpcoming } from "@/lib/admin/queries";
import { getDb } from "@/lib/db";
import { sweepExpired } from "@/lib/booking/service";
import { drainJobs } from "@/lib/jobs/processor";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord" };

export default async function Dashboard() {
  // Expirations et relances opportunistes à chaque visite (en plus de la tâche planifiée)
  const db = await getDb();
  await db.transaction((tx) => sweepExpired(tx));
  after(() => drainJobs(3).catch((error) => logger.error("jobs.after_failed", { error })));

  const [counts, pending, upcoming, setup, failures] = await Promise.all([getCounts(), getPending(), getUpcoming(), getSetupStatus(), getRecentFailures()]);
  const missingRequired = setup.filter((s) => s.required && !s.done);
  const tiles = [
    { label: "Demandes en attente", value: counts.pending, href: "/admin/reservations?statut=PENDING" },
    { label: "Propositions envoyées", value: counts.proposed, href: "/admin/reservations?statut=RESCHEDULE_PROPOSED" },
    { label: "Rendez-vous confirmés à venir", value: upcoming.length, href: "/admin/reservations?statut=CONFIRMED" },
    { label: "Messages non lus", value: counts.unread, href: "/admin/messages" },
  ];

  return (
    <>
      <AdminHeading title="Bonjour ✦" text="Vue d’ensemble de vos demandes, rendez-vous et de la configuration du site." />

      {missingRequired.length > 0 && (
        <div role="alert" className="mb-8 rounded-2xl border border-nut bg-ivory p-5">
          <p className="font-semibold text-nut">⚠︎ Configuration à terminer avant la mise en ligne ({missingRequired.length})</p>
          <p className="mt-1 text-sm text-fg-muted">Voir la check-list ci-dessous et le guide « docs/GUIDE-DEMARRAGE.md ».</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-2xl border border-line-soft bg-white/70 p-5 transition-colors hover:border-nut">
            <p className="font-[family-name:var(--font-display)] text-5xl leading-none">{t.value}</p>
            <p className="mt-3 text-xs font-bold tracking-[0.1em] text-fg-muted uppercase">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-line-soft bg-white/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">À traiter</h2>
            <Link href="/admin/reservations" className="text-sm underline underline-offset-4">
              Tout voir
            </Link>
          </div>
          {pending.length ? <ul className="-mx-3 divide-y divide-line-soft">{pending.map((b) => <BookingRow key={b.id} b={b} />)}</ul> : <p className="text-sm text-fg-muted">Aucune demande en attente.</p>}
        </section>
        <section className="rounded-2xl border border-line-soft bg-white/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Prochains rendez-vous</h2>
            <Link href="/admin/agenda" className="text-sm underline underline-offset-4">
              Agenda
            </Link>
          </div>
          {upcoming.length ? <ul className="-mx-3 divide-y divide-line-soft">{upcoming.map((b) => <BookingRow key={b.id} b={b} />)}</ul> : <p className="text-sm text-fg-muted">Aucun rendez-vous confirmé à venir.</p>}
        </section>
      </div>

      {failures.length > 0 && (
        <section className="mt-6 rounded-2xl border border-nut bg-white/70 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Erreurs de synchronisation</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {failures.map((j) => (
              <li key={j.id}>
                <span className="font-semibold">{j.type}</span> — {j.lastError}
              </li>
            ))}
          </ul>
          <Link href="/admin/synchronisation" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
            Relancer depuis la page Synchronisation
          </Link>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line-soft bg-white/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Check-list de configuration</h2>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {setup.map((s) => (
            <li key={s.key} className="flex gap-3 rounded-xl p-2">
              <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[0.65rem] ${s.done ? "bg-nut text-ivory" : "border border-light-brown"}`}>
                {s.done ? "✓" : ""}
              </span>
              <span className="text-sm">
                <span className="font-semibold">
                  {s.label} {!s.required && <span className="font-normal text-fg-muted">(facultatif)</span>}
                </span>
                <span className="sr-only">{s.done ? " — fait" : " — à faire"}</span>
                {!s.done && <span className="block text-fg-muted">{s.help}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
