import { describe, expect, it } from "vitest";
import { checkInterval, computeDay, type Blocker } from "@/lib/booking/slots";
import { slotStartMinutes, utcToZoned, zonedToUtc } from "@/lib/time";

const H = (h: number) => h * 60;
const allDay = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19].map(H));
const NOW = new Date("2026-11-02T08:00:00Z");
const opts = (durationMinutes: number) => ({ durationMinutes, now: NOW, minNoticeMinutes: 24 * 60, maxAdvanceDays: 120 });
const at = (date: string, h: number) => zonedToUtc(date, H(h)).getTime();

describe("moteur de créneaux", () => {
  it("n'ouvre aucun créneau si l'artiste n'a rien ouvert (fermé par défaut)", () => {
    const day = computeDay("2026-11-10", new Set(), [], opts(60));
    expect(day.state).toBe("closed");
    expect(day.slots).toHaveLength(0);
  });

  it("propose uniquement des créneaux entre 11:00 et 20:00, le dernier finissant à 20:00", () => {
    expect(slotStartMinutes().map((m) => m / 60)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
    const day = computeDay("2026-11-10", allDay, [], opts(60));
    expect(day.slots[0]!.start).toBe("11:00");
    expect(day.slots.at(-1)!.start).toBe("19:00");
    expect(day.slots.at(-1)!.end).toBe("20:00");
    expect(day.slots).toHaveLength(9);
  });

  it("une réservation de 3 h exige 3 créneaux consécutifs ouverts et ne dépasse jamais 20:00", () => {
    const open = new Set([H(11), H(12), H(14), H(15), H(16), H(18), H(19)]);
    const day = computeDay("2026-11-10", open, [], opts(180));
    expect(day.slots.map((s) => `${s.start}-${s.end}`)).toEqual(["14:00-17:00"]);
    expect(checkInterval("2026-11-10", H(18), allDay, [], opts(180))).toBe("outside_range");
    expect(checkInterval("2026-11-10", H(17), allDay, [], opts(180))).toBeNull();
  });

  it("distingue créneau en attente (held) et créneau réservé (busy)", () => {
    const blockers: Blocker[] = [
      { start: at("2026-11-10", 12), end: at("2026-11-10", 13), kind: "held" },
      { start: at("2026-11-10", 15), end: at("2026-11-10", 17), kind: "busy" },
    ];
    const day = computeDay("2026-11-10", allDay, blockers, opts(60));
    const status = Object.fromEntries(day.slots.map((s) => [s.start, s.status]));
    expect(status["11:00"]).toBe("available");
    expect(status["12:00"]).toBe("held");
    expect(status["15:00"]).toBe("unavailable");
    expect(status["16:00"]).toBe("unavailable");
    expect(status["17:00"]).toBe("available");
    // 2 h à partir de 14:00 chevauche 15:00 réservé
    expect(checkInterval("2026-11-10", H(14), allDay, blockers, opts(120))).toBe("conflict");
  });

  it("respecte le délai de prévenance et la fenêtre de réservation", () => {
    expect(checkInterval("2026-11-01", H(14), allDay, [], opts(60))).toBe("outside_window");
    expect(checkInterval("2026-11-02", H(14), allDay, [], opts(60))).toBe("too_soon");
    expect(checkInterval("2026-11-02", H(19), allDay, [], opts(60))).toBe("too_soon"); // < 24 h (maintenant = 09:00 le 2/11)
    expect(checkInterval("2026-11-03", H(11), allDay, [], opts(60))).toBeNull();
    expect(checkInterval("2026-11-03", H(9), new Set([H(9)]), [], opts(60))).toBe("outside_range");
    expect(checkInterval("2026-11-03", H(19), allDay, [], opts(60))).toBeNull();
    expect(checkInterval("2027-06-01", H(11), allDay, [], opts(60))).toBe("outside_window");
  });

  it("gère le passage à l'heure d'été et d'hiver (Europe/Brussels)", () => {
    // Hiver : UTC+1
    expect(zonedToUtc("2026-01-15", H(11)).toISOString()).toBe("2026-01-15T10:00:00.000Z");
    // Été : UTC+2
    expect(zonedToUtc("2026-07-15", H(11)).toISOString()).toBe("2026-07-15T09:00:00.000Z");
    // Jour du changement d'heure (29 mars 2026, 02:00 → 03:00) : 11:00 locale = 09:00 UTC
    expect(zonedToUtc("2026-03-29", H(11)).toISOString()).toBe("2026-03-29T09:00:00.000Z");
    // Retour à l'heure d'hiver (25 octobre 2026) : 11:00 locale = 10:00 UTC, 20:00 = 19:00 UTC
    expect(zonedToUtc("2026-10-25", H(11)).toISOString()).toBe("2026-10-25T10:00:00.000Z");
    expect(zonedToUtc("2026-10-25", H(20)).toISOString()).toBe("2026-10-25T19:00:00.000Z");
    expect(utcToZoned(new Date("2026-10-25T18:00:00Z"))).toEqual({ date: "2026-10-25", minute: H(19) });
    // Un créneau de 3 h le jour du changement d'heure dure bien 3 h réelles
    const s = zonedToUtc("2026-03-29", H(16)).getTime();
    const e = zonedToUtc("2026-03-29", H(19)).getTime();
    expect((e - s) / 3_600_000).toBe(3);
  });
});
