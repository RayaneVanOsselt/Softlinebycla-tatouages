import { and, desc, asc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { BookingRow } from "@/components/admin/BookingRow";
import { inputCls, labelCls } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { BOOKING_STATUSES, bookings, type BookingStatus } from "@/lib/db/schema";
import { STATUS_LABELS_FR } from "@/lib/booking/status";
import { addDays, isDateKey, zonedToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = BOOKING_STATUSES.includes(sp.statut as BookingStatus) ? (sp.statut as BookingStatus) : undefined;
  const q = sp.q?.trim().slice(0, 100);
  const from = sp.du && isDateKey(sp.du) ? sp.du : undefined;
  const to = sp.au && isDateKey(sp.au) ? sp.au : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const conds: SQL[] = [];
  if (status) conds.push(eq(bookings.status, status));
  if (from) conds.push(gte(bookings.startAt, zonedToUtc(from, 0)));
  if (to) conds.push(lte(bookings.startAt, zonedToUtc(addDays(to, 1), 0)));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(bookings.firstName, like), ilike(bookings.lastName, like), ilike(bookings.email, like), ilike(bookings.reference, like))!);
  }
  const db = await getDb();
  const order = status === "PENDING" || status === "CONFIRMED" ? asc(bookings.startAt) : desc(bookings.createdAt);
  const rows = await db.select().from(bookings).where(conds.length ? and(...conds) : undefined).orderBy(order).limit(51).offset((page - 1) * 50);
  const hasMore = rows.length > 50;
  const qs = (p: number) => new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <AdminHeading title="Réservations" text="Recherchez, filtrez et ouvrez une demande pour l’accepter, la refuser ou proposer un autre créneau." />
      <form className="mb-6 grid gap-3 rounded-2xl border border-line-soft bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" role="search">
        <div>
          <label htmlFor="q" className={labelCls}>
            Recherche
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Nom, e-mail, référence…" className={inputCls} />
        </div>
        <div>
          <label htmlFor="statut" className={labelCls}>
            Statut
          </label>
          <select id="statut" name="statut" defaultValue={status ?? ""} className={inputCls}>
            <option value="">Tous</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS_FR[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="du" className={labelCls}>
            Du
          </label>
          <input id="du" name="du" type="date" defaultValue={from} className={inputCls} />
        </div>
        <div>
          <label htmlFor="au" className={labelCls}>
            Au
          </label>
          <input id="au" name="au" type="date" defaultValue={to} className={inputCls} />
        </div>
        <button type="submit" className="self-end rounded-full bg-nut px-5 py-2.5 text-sm font-semibold text-ivory">
          Filtrer
        </button>
      </form>
      <section className="rounded-2xl border border-line-soft bg-white/70 p-3">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-fg-muted">Aucune réservation ne correspond.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {rows.slice(0, 50).map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        )}
      </section>
      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? <a href={`?${qs(page - 1)}`} className="underline underline-offset-4">← Précédent</a> : <span />}
        {hasMore && <a href={`?${qs(page + 1)}`} className="underline underline-offset-4">Suivant →</a>}
      </div>
    </>
  );
}
