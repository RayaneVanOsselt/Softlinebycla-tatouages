"use client";

import { useRouter } from "next/navigation";
import { rebuildSheetAction, resyncAllCalendarAction, retryJobsAction, runMaintenanceAction, testEmailAction, testGoogleAction } from "@/app/admin/actions";
import { AdminButton, Feedback, useAction } from "./ui";

export function SyncTools() {
  const router = useRouter();
  const a = useAction();
  const run = (fn: Parameters<typeof a.run>[0]) => a.run(fn, () => router.refresh());
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <AdminButton pending={a.pending} onClick={() => run(testEmailAction)}>
          Tester l’envoi d’e-mail
        </AdminButton>
        <AdminButton variant="ghost" pending={a.pending} onClick={() => run(testGoogleAction)}>
          Tester Google Agenda & Sheets
        </AdminButton>
        <AdminButton variant="ghost" pending={a.pending} onClick={() => run(() => retryJobsAction())}>
          Relancer les tâches en échec
        </AdminButton>
        <AdminButton variant="ghost" pending={a.pending} onClick={() => run(resyncAllCalendarAction)}>
          Resynchroniser l’agenda
        </AdminButton>
        <AdminButton variant="ghost" pending={a.pending} onClick={() => run(rebuildSheetAction)}>
          Reconstruire Google Sheets
        </AdminButton>
        <AdminButton variant="ghost" pending={a.pending} onClick={() => run(runMaintenanceAction)}>
          Lancer la maintenance
        </AdminButton>
      </div>
      <Feedback result={a.result} />
    </div>
  );
}
