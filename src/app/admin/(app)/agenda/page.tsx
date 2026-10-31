import { AdminHeading } from "@/components/admin/AdminHeading";
import { AgendaEditor } from "@/components/admin/AgendaEditor";
import { todayKey } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agenda" };

export default function AgendaPage() {
  const today = todayKey();
  return (
    <>
      <AdminHeading
        title="Agenda"
        text="Ouvrez vos disponibilités jour par jour. Rien n’est ouvert automatiquement : les clients ne voient que ce que vous avez ouvert, moins les rendez-vous, demandes en attente, périodes bloquées et occupations Google Agenda."
      />
      <AgendaEditor initialMonth={today.slice(0, 7)} today={today} />
    </>
  );
}
