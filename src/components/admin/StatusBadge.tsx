import type { BookingStatus } from "@/lib/db/schema";
import { STATUS_LABELS_FR } from "@/lib/booking/status";

const STYLE: Record<BookingStatus, string> = {
  PENDING: "bg-cream text-chocolate border-light-brown",
  RESCHEDULE_PROPOSED: "bg-sand/60 text-chocolate border-light-brown border-dashed",
  CONFIRMED: "bg-nut text-ivory border-nut",
  COMPLETED: "bg-chocolate text-cream border-chocolate",
  DECLINED: "bg-transparent text-fg-muted border-line line-through",
  CANCELLED: "bg-transparent text-fg-muted border-line line-through",
  EXPIRED: "bg-transparent text-fg-muted border-line",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold tracking-[0.06em] whitespace-nowrap uppercase ${STYLE[status]}`}>
      {STATUS_LABELS_FR[status]}
    </span>
  );
}
