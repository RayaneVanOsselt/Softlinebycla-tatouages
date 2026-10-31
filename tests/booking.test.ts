import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/db";
import { blockedPeriods, bookingEvents, bookings, jobs } from "@/lib/db/schema";
import {
  acceptBooking,
  BookingError,
  cancelBooking,
  createBookingRequest,
  declineBooking,
  getMonthAvailability,
  getProposalByToken,
  proposeReschedule,
  respondToProposal,
  sweepExpired,
} from "@/lib/booking/service";
import { drainJobs } from "@/lib/jobs/processor";
import { setEmailSenderForTesting } from "@/lib/email/transport";
import { zonedToUtc } from "@/lib/time";
import { baseRequest, captureEmails, openDay, setupDb } from "./helpers";

const NOW = new Date("2026-11-02T08:00:00Z");
const DAY = "2026-11-10";
const H = (h: number) => h * 60;
let db: Database;

beforeEach(async () => {
  process.env.ADMIN_EMAILS = "artist@example.com";
  db = await setupDb();
});
afterEach(() => setEmailSenderForTesting(undefined));

const request = (overrides: Partial<Parameters<typeof createBookingRequest>[0]> = {}) =>
  createBookingRequest({ ...baseRequest, date: DAY, startMinute: H(14), durationMinutes: 120, ...overrides }, NOW);

describe("demande de réservation", () => {
  it("refuse toute demande si aucun créneau n'est ouvert", async () => {
    await expect(request()).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    const month = await getMonthAvailability("2026-11", 60, NOW);
    expect(month.days.every((d) => d.state === "closed")).toBe(true);
  });

  it("crée une demande PENDING, bloque les créneaux et met en file les e-mails + synchronisations", async () => {
    await openDay(db, DAY);
    const b = await request();
    expect(b.status).toBe("PENDING");
    expect(b.startAt.toISOString()).toBe(zonedToUtc(DAY, H(14)).toISOString());
    expect(b.endAt.toISOString()).toBe(zonedToUtc(DAY, H(16)).toISOString());
    expect(b.holdExpiresAt!.getTime()).toBe(NOW.getTime() + 72 * 3_600_000);

    const queued = await db.select().from(jobs).where(eq(jobs.bookingId, b.id));
    expect(queued.map((j) => j.dedupeKey).sort()).toEqual(
      [`calendar:${b.id}`, `email:${b.id}:admin-new`, `email:${b.id}:received`, `sheets:${b.id}`].sort(),
    );

    const month = await getMonthAvailability("2026-11", 60, NOW);
    const day = month.days.find((d) => d.date === DAY)!;
    const status = Object.fromEntries(day.slots.map((s) => [s.start, s.status]));
    expect(status["14:00"]).toBe("held");
    expect(status["15:00"]).toBe("held");
    expect(status["16:00"]).toBe("available");
  });

  it("empêche deux demandes simultanées sur un même créneau", async () => {
    await openDay(db, DAY);
    const results = await Promise.allSettled([
      request({ email: "a@example.com" }),
      request({ email: "b@example.com", startMinute: H(15), durationMinutes: 60 }),
      request({ email: "c@example.com", startMinute: H(13), durationMinutes: 120 }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(BookingError);
    }
    const all = await db.select().from(bookings);
    expect(all).toHaveLength(1);
  });

  it("la contrainte Postgres interdit physiquement tout chevauchement", async () => {
    await openDay(db, DAY);
    const b = await request();
    await expect(
      db.insert(bookings).values({ ...b, id: undefined, reference: "SLC-TEST01", startAt: zonedToUtc(DAY, H(15)), endAt: zonedToUtc(DAY, H(17)) }),
    ).rejects.toThrow();
  });

  it("refuse un créneau qui chevauche une période bloquée", async () => {
    await openDay(db, DAY);
    await db.insert(blockedPeriods).values({ startAt: zonedToUtc(DAY, H(15)), endAt: zonedToUtc(DAY, H(16)), reason: "Pause" });
    await expect(request()).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });
});

describe("décisions de l'artiste", () => {
  it("accepter envoie la confirmation (avec .ics) — jamais avant", async () => {
    const sent = captureEmails();
    await openDay(db, DAY);
    const b = await request();
    await drainJobs();
    expect(sent.map((e) => e.subject)).toEqual(expect.arrayContaining([expect.stringContaining("en attente de confirmation")]));
    expect(sent.some((e) => /confirmé/i.test(e.subject))).toBe(false);
    expect(sent.find((e) => e.to === "lea@example.com")!.html).toContain("Votre créneau est en attente de confirmation par SOFTLINEBY.CLA");
    expect(sent.find((e) => e.to === "artist@example.com")!.html).toContain(`/admin/reservations/${b.id}`);

    const confirmed = await acceptBooking(b.id, {}, NOW);
    expect(confirmed.status).toBe("CONFIRMED");
    await drainJobs();
    const confirmation = sent.find((e) => /confirmé/i.test(e.subject));
    expect(confirmation?.attachments?.[0]?.filename).toBe(`${b.reference}.ics`);
  });

  it("refuser libère les créneaux", async () => {
    await openDay(db, DAY);
    const b = await request();
    await declineBooking(b.id, { message: "Agenda complet" }, NOW);
    const again = await request({ email: "other@example.com" });
    expect(again.status).toBe("PENDING");
  });

  it("modifier la durée recalcule les conflits", async () => {
    await openDay(db, DAY);
    const a = await request({ startMinute: H(11), durationMinutes: 60 });
    await request({ email: "other@example.com", startMinute: H(13), durationMinutes: 60 });
    await expect(acceptBooking(a.id, { durationMinutes: 180 }, NOW)).rejects.toMatchObject({ code: "CONFLICT" });
    const ok = await acceptBooking(a.id, { durationMinutes: 120 }, NOW);
    expect(ok.finalDurationMinutes).toBe(120);
    expect(ok.endAt.toISOString()).toBe(zonedToUtc(DAY, H(13)).toISOString());
    await expect(acceptBooking(a.id, {}, NOW)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("un changement de créneau n'est confirmé qu'après acceptation du client", async () => {
    const sent = captureEmails();
    await openDay(db, DAY);
    const b = await request();
    const { booking, token } = await proposeReschedule(b.id, { date: "2026-11-12", startMinute: H(16), durationMinutes: 120, message: "Plutôt jeudi ?" }, NOW);
    expect(booking.status).toBe("RESCHEDULE_PROPOSED");
    await drainJobs();
    const proposal = sent.find((e) => /nouveau créneau/i.test(e.subject))!;
    expect(proposal.html).toContain(encodeURIComponent(token));

    const view = await getProposalByToken(token, NOW);
    expect(view).toMatchObject({ firstName: "Léa", expired: false });
    expect(view).not.toHaveProperty("email");

    // l'ancien créneau est libéré, le nouveau est bloqué
    const free = await request({ email: "x@example.com" });
    expect(free.status).toBe("PENDING");

    const accepted = await respondToProposal(token, "accept", NOW);
    expect(accepted.status).toBe("CONFIRMED");
    await expect(respondToProposal(token, "accept", NOW)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("un jeton invalide ne donne accès à aucune donnée", async () => {
    expect(await getProposalByToken("nope", NOW)).toBeNull();
    await expect(respondToProposal("nope", "accept", NOW)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("l'annulation et les statuts finaux sont cohérents", async () => {
    await openDay(db, DAY);
    const b = await request();
    await cancelBooking(b.id, { notify: true }, NOW);
    await expect(acceptBooking(b.id, {}, NOW)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const history = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, b.id));
    expect(history.map((h) => h.action)).toEqual(["created", "cancelled"]);
  });
});

describe("expiration et robustesse", () => {
  it("une demande sans décision expire et libère le créneau", async () => {
    await openDay(db, DAY);
    const b = await request();
    const later = new Date(NOW.getTime() + 73 * 3_600_000);
    await db.transaction((tx) => sweepExpired(tx, later));
    const [row] = await db.select().from(bookings).where(eq(bookings.id, b.id));
    expect(row!.status).toBe("EXPIRED");
    const again = await createBookingRequest({ ...baseRequest, email: "new@example.com", date: DAY, startMinute: H(14), durationMinutes: 120 }, later);
    expect(again.status).toBe("PENDING");
  });

  it("l'expiration est aussi appliquée automatiquement lors d'une nouvelle demande", async () => {
    await openDay(db, DAY);
    await request();
    const later = new Date(NOW.getTime() + 80 * 3_600_000);
    const again = await createBookingRequest({ ...baseRequest, email: "new@example.com", date: DAY, startMinute: H(14), durationMinutes: 120 }, later);
    expect(again.status).toBe("PENDING");
  });

  it("une panne d'envoi d'e-mail ne fait pas perdre la réservation (reprise automatique)", async () => {
    let fail = true;
    const sent: string[] = [];
    setEmailSenderForTesting(async (e) => {
      if (fail) throw new Error("SMTP down");
      sent.push(e.subject);
      return { messageId: "ok" };
    });
    await openDay(db, DAY);
    const b = await request();
    const r1 = await drainJobs(1);
    expect(r1.failed).toBe(2);
    const [still] = await db.select().from(bookings).where(eq(bookings.id, b.id));
    expect(still!.status).toBe("PENDING");

    fail = false;
    await db.update(jobs).set({ runAt: new Date(0) }).where(eq(jobs.status, "PENDING"));
    await drainJobs();
    expect(sent).toHaveLength(2);
    // aucune ré-émission une fois envoyés
    await db.update(jobs).set({ runAt: new Date(0) });
    await drainJobs();
    expect(sent).toHaveLength(2);
  });

  it("sans Google configuré : synchronisations marquées « non configuré », jamais « envoyé »", async () => {
    captureEmails();
    await openDay(db, DAY);
    const b = await request();
    await drainJobs();
    const rows = await db.select().from(jobs).where(eq(jobs.bookingId, b.id));
    const cal = rows.find((j) => j.type === "calendar.sync")!;
    expect(cal.status).toBe("SKIPPED");
    expect(cal.lastError).toMatch(/non configuré|n'est pas configuré/i);
    expect(b.calendarChecked).toBe(false);
  });
});
