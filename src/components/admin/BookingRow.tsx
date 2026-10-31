import Link from "next/link";
import type { Booking } from "@/lib/db/schema";
import { formatDateLong, formatDuration, formatTime } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

export function BookingRow({ b }: { b: Booking }) {
  const minutes = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
  return (
    <li>
      <Link href={`/admin/reservations/${b.id}`} className="grid gap-1 rounded-xl px-3 py-3 transition-colors hover:bg-cream/50 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center sm:gap-4">
        <span>
          <span className="font-semibold">
            {b.firstName} {b.lastName}
          </span>
          <span className="block text-xs text-fg-muted">{b.reference}</span>
        </span>
        <span className="text-sm">
          <span className="first-letter:uppercase">{formatDateLong(b.startAt, "fr")}</span>
          <span className="block text-xs text-fg-muted tabular-nums">
            {formatTime(b.startAt, "fr")} – {formatTime(b.endAt, "fr")} · {formatDuration(minutes, "fr")}
          </span>
        </span>
        <StatusBadge status={b.status} />
      </Link>
    </li>
  );
}
