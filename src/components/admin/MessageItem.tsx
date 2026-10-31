"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setMessageStatusAction } from "@/app/admin/actions";
import { AdminButton, useAction } from "./ui";

export function MessageItem({ m }: { m: { id: string; firstName: string; lastName: string; email: string; subject: string; message: string; status: string; createdAt: string; locale: string } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const a = useAction();
  const set = (s: "NEW" | "READ" | "ARCHIVED") => a.run(() => setMessageStatusAction(m.id, s), () => router.refresh());
  return (
    <li className={`rounded-2xl border p-4 ${m.status === "NEW" ? "border-nut bg-white" : "border-line-soft bg-white/60"}`}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && m.status === "NEW") set("READ");
        }}
      >
        <span>
          <span className="font-semibold">{m.subject}</span>
          <span className="block text-sm text-fg-muted">
            {m.firstName} {m.lastName} · {m.email} · {m.locale.toUpperCase()}
          </span>
        </span>
        <span className="shrink-0 text-xs text-fg-muted">{m.createdAt}</span>
      </button>
      {open && (
        <div className="mt-4 border-t border-line-soft pt-4">
          <p className="whitespace-pre-line">{m.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="inline-flex min-h-10 items-center rounded-full bg-nut px-4 text-sm font-semibold text-ivory">
              Répondre par e-mail
            </a>
            {m.status !== "ARCHIVED" ? (
              <AdminButton variant="ghost" pending={a.pending} onClick={() => set("ARCHIVED")}>
                Archiver
              </AdminButton>
            ) : (
              <AdminButton variant="ghost" pending={a.pending} onClick={() => set("READ")}>
                Désarchiver
              </AdminButton>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
