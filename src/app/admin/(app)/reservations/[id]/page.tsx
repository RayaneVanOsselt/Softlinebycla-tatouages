import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/admin/BookingActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Panel } from "@/components/admin/ui";
import { STATUS_LABELS_FR } from "@/lib/booking/status";
import { getDb } from "@/lib/db";
import { calendarConfigured } from "@/lib/google/calendar";
import { bookingAttachments, bookingEvents, bookings, jobs } from "@/lib/db/schema";
import { getSetting } from "@/lib/settings";
import { formatDateLong, formatDuration, formatTime, minuteToHm, slotStartMinutes, utcToZoned } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservation" };

const ACTION_LABELS: Record<string, string> = {
  created: "Demande envoyée par le client",
  accepted: "Demande acceptée",
  declined: "Demande refusée",
  reschedule_proposed: "Nouveau créneau proposé",
  proposal_accepted: "Proposition acceptée par le client",
  proposal_declined: "Proposition refusée par le client",
  cancelled: "Réservation annulée",
  expired: "Demande expirée (sans décision dans le délai)",
  completed: "Rendez-vous terminé",
  notes_updated: "Note privée modifiée",
};

const JOB_LABELS: Record<string, string> = { email: "E-mail", "calendar.sync": "Google Agenda", "sheets.sync": "Google Sheets" };
const JOB_STATUS: Record<string, string> = { PENDING: "En file", RUNNING: "En cours", DONE: "Fait", FAILED: "Échec", SKIPPED: "Non envoyé / non configuré" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!b) notFound();
  const [events, files, tasks, cfg] = await Promise.all([
    db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, id)).orderBy(asc(bookingEvents.createdAt)),
    db.select({ id: bookingAttachments.id, filename: bookingAttachments.filename, sizeBytes: bookingAttachments.sizeBytes }).from(bookingAttachments).where(eq(bookingAttachments.bookingId, id)),
    db.select().from(jobs).where(eq(jobs.bookingId, id)).orderBy(desc(jobs.createdAt)),
    getSetting("booking"),
  ]);
  const minutes = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
  const local = utcToZoned(b.startAt);
  const moved = b.requestedStartAt.getTime() !== b.startAt.getTime();

  const details: Array<[string, string | null]> = [
    ["Zone du corps", b.placement],
    ["Taille approximative", b.approximateSize],
    ["Style", b.style],
    ["Commentaire", b.comment],
    ["Langue", b.locale.toUpperCase()],
  ];

  return (
    <>
      <Link href="/admin/reservations" className="text-sm underline underline-offset-4">
        ← Réservations
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-fg-muted uppercase">{b.reference}</p>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.2rem,4vw,3.2rem)] leading-none font-light">
            {b.firstName} {b.lastName}
          </h1>
          <a href={`mailto:${b.email}?subject=${encodeURIComponent(`Votre demande ${b.reference}`)}`} className="mt-2 inline-block text-sm underline underline-offset-4">
            {b.email}
          </a>
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Rendez-vous">
            <p className="font-[family-name:var(--font-display)] text-3xl first-letter:uppercase">{formatDateLong(b.startAt, "fr")}</p>
            <p className="mt-1 text-lg tabular-nums">
              {formatTime(b.startAt, "fr")} – {formatTime(b.endAt, "fr")} · {formatDuration(minutes, "fr")}
            </p>
            <p className="mt-2 text-sm text-fg-muted">
              Durée estimée par le client : {formatDuration(b.estimatedDurationMinutes, "fr")}
              {b.finalDurationMinutes && b.finalDurationMinutes !== b.estimatedDurationMinutes ? ` · durée ajustée : ${formatDuration(b.finalDurationMinutes, "fr")}` : ""}
            </p>
            {moved && (
              <p className="mt-2 text-sm text-fg-muted">
                Créneau demandé à l’origine : {formatDateLong(b.requestedStartAt, "fr")} à {formatTime(b.requestedStartAt, "fr")}
              </p>
            )}
            {b.holdExpiresAt && ["PENDING", "RESCHEDULE_PROPOSED"].includes(b.status) && (
              <p className="mt-4 rounded-xl bg-cream/50 p-3 text-sm">
                ⏳ Créneau bloqué jusqu’au <strong>{formatDateLong(b.holdExpiresAt, "fr")} à {formatTime(b.holdExpiresAt, "fr")}</strong>. Sans décision, la demande expirera automatiquement.
              </p>
            )}
            {!b.calendarChecked && calendarConfigured() && b.status === "PENDING" && (
              <p className="mt-3 rounded-xl border border-nut p-3 text-sm font-semibold text-nut">⚠︎ Google Agenda n’a pas pu être vérifié au moment de la demande : contrôlez votre agenda avant d’accepter.</p>
            )}
          </Panel>

          <Panel title="Projet">
            <p className="whitespace-pre-line">{b.projectDescription}</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-bold tracking-[0.1em] text-fg-muted uppercase">{k}</dt>
                    <dd className="whitespace-pre-line">{v}</dd>
                  </div>
                ))}
            </dl>
            {files.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold tracking-[0.1em] text-fg-muted uppercase">Images de référence (privées)</p>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {files.map((f) => (
                    <li key={f.id}>
                      <a href={`/api/admin/attachments/${f.id}`} target="_blank" rel="noopener" className="block size-32 overflow-hidden rounded-xl border border-line-soft">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/admin/attachments/${f.id}`} alt={f.filename} className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-fg-muted">Supprimées automatiquement {cfg.attachmentRetentionDays} jours après le rendez-vous ou la clôture.</p>
              </div>
            )}
            {b.clientMessage && (
              <div className="mt-6 rounded-xl bg-cream/40 p-3 text-sm">
                <p className="text-xs font-bold tracking-[0.1em] text-fg-muted uppercase">Dernier message envoyé au client</p>
                <p className="mt-1 whitespace-pre-line">{b.clientMessage}</p>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Décision">
            <BookingActions
              id={b.id}
              status={b.status}
              durationMinutes={b.finalDurationMinutes ?? b.estimatedDurationMinutes}
              date={local.date}
              start={minuteToHm(local.minute)}
              notes={b.adminNotes ?? ""}
              slots={slotStartMinutes().map(minuteToHm)}
              maxHours={Math.max(cfg.maxDurationHours, Math.ceil(minutes / 60))}
            />
          </Panel>

          <Panel title="Historique">
            <ol className="space-y-3 border-l border-line pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-nut" />
                  <p className="font-semibold">{ACTION_LABELS[e.action] ?? e.action}</p>
                  <p className="text-xs text-fg-muted">
                    {formatDateLong(e.createdAt, "fr")} {formatTime(e.createdAt, "fr")} · {e.actor === "client" ? "client" : e.actor === "admin" ? "vous" : "automatique"}
                    {e.toStatus ? ` · → ${STATUS_LABELS_FR[e.toStatus]}` : ""}
                  </p>
                  {e.note && <p className="mt-1 text-xs whitespace-pre-line">« {e.note} »</p>}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="E-mails & synchronisation">
            <ul className="space-y-2 text-sm">
              {tasks.map((j) => (
                <li key={j.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-soft pb-2 last:border-0">
                  <span>
                    <span className="font-semibold">{JOB_LABELS[j.type] ?? j.type}</span>
                    {j.type === "email" && <span className="text-fg-muted"> — {String((j.payload as { email?: { subject?: string } }).email?.subject ?? "")}</span>}
                    {j.lastError && <span className="block text-xs text-fg-muted">{j.lastError}</span>}
                  </span>
                  <span className={`text-xs font-bold ${j.status === "FAILED" ? "text-nut" : ""}`}>{JOB_STATUS[j.status]}</span>
                </li>
              ))}
            </ul>
            {b.calendarEventId && <p className="mt-3 text-xs text-fg-muted">Événement Google Agenda : {b.calendarEventId}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
