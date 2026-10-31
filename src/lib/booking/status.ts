import type { BookingStatus } from "../db/schema";

/** Transitions autorisées. Les statuts finaux n'ont aucune sortie : impossible de « ressusciter » une demande. */
export const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "RESCHEDULE_PROPOSED", "EXPIRED", "CANCELLED"],
  RESCHEDULE_PROPOSED: ["CONFIRMED", "CANCELLED", "EXPIRED", "RESCHEDULE_PROPOSED"],
  CONFIRMED: ["CANCELLED", "COMPLETED", "RESCHEDULE_PROPOSED"],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: [],
  COMPLETED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`Transition interdite : ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus) {
  if (!canTransition(from, to)) throw new TransitionError(from, to);
}

export const STATUS_LABELS_FR: Record<BookingStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Refusé",
  RESCHEDULE_PROPOSED: "Nouveau créneau proposé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
  COMPLETED: "Terminé",
};
