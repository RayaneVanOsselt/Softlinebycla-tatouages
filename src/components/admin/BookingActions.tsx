"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  acceptBookingAction,
  cancelBookingAction,
  completeBookingAction,
  declineBookingAction,
  proposeBookingAction,
  resyncBookingAction,
  saveNotesAction,
} from "@/app/admin/actions";
import type { BookingStatus } from "@/lib/db/schema";
import { AdminButton, Feedback, inputCls, labelCls, useAction } from "./ui";

type Mode = null | "accept" | "decline" | "propose" | "cancel";

export function BookingActions({
  id,
  status,
  durationMinutes,
  date,
  start,
  notes,
  slots,
  maxHours,
}: {
  id: string;
  status: BookingStatus;
  durationMinutes: number;
  date: string;
  start: string;
  notes: string;
  slots: string[];
  maxHours: number;
}) {
  const router = useRouter();
  const { pending, result, run } = useAction();
  const notesAction = useAction();
  const [mode, setMode] = useState<Mode>(null);
  const [duration, setDuration] = useState(durationMinutes);
  const [message, setMessage] = useState("");
  const [pDate, setPDate] = useState(date);
  const [pStart, setPStart] = useState(start);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState(notes);
  const done = () => {
    setMode(null);
    setMessage("");
    router.refresh();
  };
  const durations = Array.from({ length: maxHours }, (_, i) => (i + 1) * 60);
  const canAccept = status === "PENDING";
  const canPropose = ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"].includes(status);
  const canCancel = ["PENDING", "CONFIRMED", "RESCHEDULE_PROPOSED"].includes(status);

  const messageField = (label: string) => (
    <div>
      <label htmlFor="msg" className={labelCls}>
        {label}
      </label>
      <textarea id="msg" rows={3} maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {canAccept && (
          <AdminButton onClick={() => setMode(mode === "accept" ? null : "accept")} aria-expanded={mode === "accept"}>
            Accepter
          </AdminButton>
        )}
        {canAccept && (
          <AdminButton variant="ghost" onClick={() => setMode(mode === "decline" ? null : "decline")} aria-expanded={mode === "decline"}>
            Refuser
          </AdminButton>
        )}
        {canPropose && (
          <AdminButton variant="ghost" onClick={() => setMode(mode === "propose" ? null : "propose")} aria-expanded={mode === "propose"}>
            Proposer un autre créneau
          </AdminButton>
        )}
        {status === "CONFIRMED" && (
          <AdminButton variant="ghost" pending={pending} onClick={() => run(() => completeBookingAction(id), done)}>
            Marquer comme terminé
          </AdminButton>
        )}
        {canCancel && (
          <AdminButton variant="danger" onClick={() => setMode(mode === "cancel" ? null : "cancel")} aria-expanded={mode === "cancel"}>
            Annuler
          </AdminButton>
        )}
      </div>

      {mode === "accept" && (
        <div className="space-y-4 rounded-xl bg-cream/40 p-4">
          <div>
            <label htmlFor="dur" className={labelCls}>
              Durée finale (estimation du client : {durationMinutes / 60} h)
            </label>
            <select id="dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d / 60} h
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-fg-muted">Une durée plus longue vérifie automatiquement les conflits (autres réservations, périodes bloquées, Google Agenda).</p>
          </div>
          {messageField("Message au client (facultatif, inclus dans l’e-mail de confirmation)")}
          <AdminButton pending={pending} onClick={() => run(() => acceptBookingAction(id, { durationMinutes: duration, message }), done)}>
            Confirmer le rendez-vous et prévenir le client
          </AdminButton>
        </div>
      )}

      {mode === "decline" && (
        <div className="space-y-4 rounded-xl bg-cream/40 p-4">
          {messageField("Message au client (facultatif)")}
          <AdminButton pending={pending} onClick={() => run(() => declineBookingAction(id, { message }), done)}>
            Refuser et libérer le créneau
          </AdminButton>
        </div>
      )}

      {mode === "propose" && (
        <div className="space-y-4 rounded-xl bg-cream/40 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="pdate" className={labelCls}>
                Date
              </label>
              <input id="pdate" type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="pstart" className={labelCls}>
                Début
              </label>
              <select id="pstart" value={pStart} onChange={(e) => setPStart(e.target.value)} className={inputCls}>
                {slots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pdur" className={labelCls}>
                Durée
              </label>
              <select id="pdur" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
                {durations.map((d) => (
                  <option key={d} value={d}>
                    {d / 60} h
                  </option>
                ))}
              </select>
            </div>
          </div>
          {messageField("Message au client (facultatif)")}
          <p className="text-xs text-fg-muted">Le client reçoit un e-mail avec deux boutons. Le rendez-vous ne sera confirmé qu’après son acceptation ; le créneau actuel est libéré.</p>
          <AdminButton pending={pending} onClick={() => run(() => proposeBookingAction(id, { date: pDate, start: pStart, durationMinutes: duration, message }), done)}>
            Envoyer la proposition
          </AdminButton>
        </div>
      )}

      {mode === "cancel" && (
        <div className="space-y-4 rounded-xl bg-cream/40 p-4">
          {messageField("Message au client (facultatif)")}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[var(--color-nut)]" /> Prévenir le client par e-mail
          </label>
          <AdminButton variant="danger" pending={pending} onClick={() => run(() => cancelBookingAction(id, { message, notify }), done)}>
            Confirmer l’annulation
          </AdminButton>
        </div>
      )}

      <Feedback result={result} />

      <div className="border-t border-line-soft pt-5">
        <label htmlFor="notes" className={labelCls}>
          Notes privées (jamais visibles par le client)
        </label>
        <textarea id="notes" rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <AdminButton variant="ghost" pending={notesAction.pending} onClick={() => notesAction.run(() => saveNotesAction(id, note))}>
            Enregistrer la note
          </AdminButton>
          <AdminButton variant="subtle" pending={notesAction.pending} onClick={() => notesAction.run(() => resyncBookingAction(id), () => router.refresh())}>
            Resynchroniser Google
          </AdminButton>
        </div>
        <div className="mt-3">
          <Feedback result={notesAction.result} />
        </div>
      </div>
    </div>
  );
}
