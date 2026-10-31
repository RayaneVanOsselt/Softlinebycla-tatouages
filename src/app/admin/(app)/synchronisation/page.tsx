import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { AdminHeading } from "@/components/admin/AdminHeading";
import { SyncTools } from "@/components/admin/SyncTools";
import { Panel } from "@/components/admin/ui";
import { calendarConfigured } from "@/lib/google/calendar";
import { sheetsConfigured } from "@/lib/google/sheets";
import { emailConfigured } from "@/lib/email/transport";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { formatDateLong, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Synchronisation" };

const LABEL: Record<string, string> = { email: "E-mail", "calendar.sync": "Google Agenda", "sheets.sync": "Google Sheets" };
const STATUS: Record<string, string> = { PENDING: "En file", RUNNING: "En cours", DONE: "Fait", FAILED: "Échec", SKIPPED: "Non configuré / ignoré" };

export default async function SyncPage() {
  const db = await getDb();
  const rows = await db.select().from(jobs).where(inArray(jobs.status, ["FAILED", "SKIPPED", "PENDING", "RUNNING"])).orderBy(desc(jobs.updatedAt)).limit(100);
  const services = [
    ["E-mails (SMTP)", emailConfigured()],
    ["Google Agenda", calendarConfigured()],
    ["Google Sheets", sheetsConfigured()],
  ] as const;
  return (
    <>
      <AdminHeading
        title="Synchronisation"
        text="La base de données est la source de vérité. E-mails, Google Agenda et Google Sheets sont mis à jour en arrière-plan avec reprise automatique en cas de panne."
      />
      <div className="grid gap-6">
        <Panel title="Services connectés">
          <ul className="grid gap-2 sm:grid-cols-3">
            {services.map(([label, ok]) => (
              <li key={label} className={`rounded-xl border p-3 text-sm font-semibold ${ok ? "border-light-brown bg-cream/40" : "border-nut text-nut"}`}>
                {ok ? "✓" : "⚠︎"} {label} — {ok ? "configuré" : "non configuré"}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <SyncTools />
          </div>
        </Panel>
        <Panel title="Tâches à surveiller">
          {rows.length === 0 ? (
            <p className="text-sm text-fg-muted">Tout est à jour.</p>
          ) : (
            <ul className="divide-y divide-line-soft text-sm">
              {rows.map((j) => (
                <li key={j.id} className="grid gap-1 py-2 md:grid-cols-[10rem_1fr_9rem_10rem] md:items-center md:gap-3">
                  <span className="font-semibold">{LABEL[j.type] ?? j.type}</span>
                  <span className="text-fg-muted">
                    {j.type === "email" ? String((j.payload as { email?: { subject?: string } }).email?.subject ?? "") : ""} {j.lastError && <span className="block text-xs">{j.lastError}</span>}
                  </span>
                  <span className={`text-xs font-bold ${j.status === "FAILED" ? "text-nut" : ""}`}>
                    {STATUS[j.status]} · {j.attempts} essai(s)
                  </span>
                  <span className="text-xs text-fg-muted">
                    {j.bookingId ? (
                      <Link href={`/admin/reservations/${j.bookingId}`} className="underline underline-offset-4">
                        Réservation
                      </Link>
                    ) : null}{" "}
                    {formatDateLong(j.updatedAt, "fr").split(" ").slice(1, 3).join(" ")} {formatTime(j.updatedAt, "fr")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
