/**
 * Tests du moteur de réservation (apps-script/Code.gs) — le code exact qui tourne dans Google Apps Script.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { loadGas, MemoryStore } from "./support/gas";

const gas = loadGas();
const NOW = Date.parse("2026-11-02T08:00:00Z"); // lundi 2 novembre, 09:00 à Bruxelles
const DAY = "2026-11-10";
const H = (h: number) => h * 60;
const at = (date: string, h: number) => gas.zonedToUtc(date, H(h)).getTime();

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

const request = (over: Record<string, unknown> = {}, now = NOW) =>
  gas.apiBook(
    store,
    {
      firstName: "Léa",
      lastName: "Martin",
      email: "lea@example.com",
      locale: "fr",
      date: DAY,
      start: "14:00",
      durationMinutes: 120,
      projectDescription: "Une petite branche de lys en fine line sur l'avant-bras.",
      consent: true,
      website: "",
      startedAt: now - 30_000,
      ...over,
    },
    now,
  );

const statusOf = (ref: string) => store.findByRef(ref)?.statusCode;

describe("fuseau horaire Europe/Brussels", () => {
  it("convertit correctement en heure d'hiver, d'été et les jours de changement d'heure", () => {
    expect(gas.zonedToUtc("2026-01-15", H(11)).toISOString()).toBe("2026-01-15T10:00:00.000Z");
    expect(gas.zonedToUtc("2026-07-15", H(11)).toISOString()).toBe("2026-07-15T09:00:00.000Z");
    expect(gas.zonedToUtc("2026-03-29", H(11)).toISOString()).toBe("2026-03-29T09:00:00.000Z");
    expect(gas.zonedToUtc("2026-10-25", H(11)).toISOString()).toBe("2026-10-25T10:00:00.000Z");
    expect(gas.zonedToUtc("2026-10-25", H(20)).toISOString()).toBe("2026-10-25T19:00:00.000Z");
    expect((at("2026-03-29", 19) - at("2026-03-29", 16)) / 3_600_000).toBe(3);
    expect(gas.localParts(new Date("2026-10-25T18:00:00Z")).minute).toBe(H(19));
  });
});

describe("calendrier entièrement ouvert (réglage par défaut)", () => {
  it("chaque jour à venir est ouvert de 11:00 à 20:00 sans que l'artiste n'ouvre rien", () => {
    const r = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW);
    const byDate = Object.fromEntries(r.days.map((d: { date: string; state: string; slots: unknown[] }) => [d.date, d]));
    expect(byDate["2026-11-01"].state).toBe("closed"); // passé
    expect(byDate["2026-11-02"].slots).toHaveLength(0); // délai minimum de 24 h
    for (const date of ["2026-11-04", "2026-11-07", "2026-11-08", "2026-11-30"]) {
      expect(byDate[date].state).toBe("available");
      expect(byDate[date].slots.map((s: { start: string }) => s.start)).toEqual(["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]);
    }
    const far = gas.apiAvailability(store, { month: "2027-04", duration: 60 }, NOW);
    expect(far.days.every((d: { state: string }) => d.state === "closed")).toBe(true); // au-delà de 120 jours
  });

  it("le client choisit librement son créneau ; il est ensuite bloqué pour les autres", () => {
    const r = request();
    expect(r.ok).toBe(true);
    expect(statusOf(r.reference)).toBe("PENDING");
    const day = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW).days.find((d: { date: string }) => d.date === DAY);
    const status = Object.fromEntries(day.slots.map((s: { start: string; status: string }) => [s.start, s.status]));
    expect(status["14:00"]).toBe("held");
    expect(status["15:00"]).toBe("held");
    expect(status["16:00"]).toBe("available");
    expect(request({ email: "autre@example.com", start: "15:00", durationMinutes: 60 }).code).toBe("SLOT_HELD");
  });

  it("les indisponibilités et Google Agenda retirent des créneaux", () => {
    store.blockedPeriods.push({ start: at(DAY, 11), end: at(DAY, 20) }); // journée bloquée
    store.busyIntervals.push({ start: at("2026-11-11", 12), end: at("2026-11-11", 14) }); // rendez-vous personnel
    const days = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW).days;
    expect(days.find((d: { date: string }) => d.date === DAY).state).toBe("full");
    const status = Object.fromEntries(days.find((d: { date: string }) => d.date === "2026-11-11").slots.map((s: { start: string; status: string }) => [s.start, s.status]));
    expect([status["12:00"], status["13:00"]]).toEqual(["unavailable", "unavailable"]);
    expect(status["14:00"]).toBe("available");
    expect(request().code).toBe("SLOT_UNAVAILABLE");
  });
});

describe("disponibilités", () => {
  it("réglage « non » : rien n'est proposé si l'artiste n'a rien coché", () => {
    store.cfg.allOpen = false;
    const r = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW);
    expect(r.ok).toBe(true);
    expect(r.days.every((d: { state: string }) => d.state === "closed")).toBe(true);
    expect(request().code).toBe("SLOT_UNAVAILABLE");
  });

  it("créneaux de 11:00 à 20:00, le dernier se termine à 20:00", () => {
    store.openDay(DAY);
    const day = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW).days.find((d: { date: string }) => d.date === DAY);
    expect(day.slots.map((s: { start: string }) => s.start)).toEqual(["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]);
    expect(day.slots.at(-1).end).toBe("20:00");
  });

  it("réglage « non » : une durée de 3 h exige 3 heures consécutives cochées et ne dépasse jamais 20:00", () => {
    store.cfg.allOpen = false;
    store.openDay(DAY, [11, 12, 14, 15, 16, 18, 19]);
    const day = gas.apiAvailability(store, { month: "2026-11", duration: 180 }, NOW).days.find((d: { date: string }) => d.date === DAY);
    expect(day.slots.map((s: { start: string; end: string }) => `${s.start}-${s.end}`)).toEqual(["14:00-17:00"]);
  });

  it("respecte le délai de prévenance, les indisponibilités et Google Agenda", () => {
    store.openDay("2026-11-02");
    store.openDay(DAY);
    store.blockedPeriods.push({ start: at(DAY, 11), end: at(DAY, 12) });
    store.busyIntervals.push({ start: at(DAY, 17), end: at(DAY, 18) });
    const days = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW).days;
    expect(days.find((d: { date: string }) => d.date === "2026-11-02").slots).toHaveLength(0);
    const status = Object.fromEntries(days.find((d: { date: string }) => d.date === DAY).slots.map((s: { start: string; status: string }) => [s.start, s.status]));
    expect(status["11:00"]).toBe("unavailable");
    expect(status["17:00"]).toBe("unavailable");
    expect(status["12:00"]).toBe("available");
  });

  it("ne révèle aucune donnée client", () => {
    store.openDay(DAY);
    request();
    const r = JSON.stringify(gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW));
    expect(r).not.toContain("Léa");
    expect(r).not.toContain("example.com");
    expect(r).toContain('"held"');
  });
});

describe("demande de réservation", () => {
  it("crée une demande « En attente », bloque le créneau et envoie les deux e-mails (sans confirmer)", () => {
    store.openDay(DAY);
    const r = request();
    expect(r.ok).toBe(true);
    const b = store.findByRef(r.reference)!;
    expect(b.statusCode).toBe("PENDING");
    expect(b.status).toBe("En attente");
    expect(b.start).toBe("14:00");
    expect(b.end).toBe("16:00");
    expect(store.events.get(r.reference)?.status).toBe("PENDING");
    const client = store.sent.find((m) => m.to === "lea@example.com")!;
    expect(client.html).toContain("Votre créneau est en attente de confirmation par SOFTLINEBY.CLA");
    expect(client.subject).not.toMatch(/confirmé/i);
    expect(store.sent.find((m) => m.to === "artist@example.com")?.replyTo).toBe("lea@example.com");
    const day = gas.apiAvailability(store, { month: "2026-11", duration: 60 }, NOW).days.find((d: { date: string }) => d.date === DAY);
    expect(day.slots.find((s: { start: string }) => s.start === "15:00").status).toBe("held");
  });

  it("refuse une seconde demande sur un créneau qui chevauche (aucune double réservation)", () => {
    store.openDay(DAY);
    expect(request().ok).toBe(true);
    expect(request({ email: "b@example.com", start: "15:00", durationMinutes: 60 }).code).toBe("SLOT_HELD");
    expect(request({ email: "c@example.com", start: "13:00", durationMinutes: 120 }).code).toBe("SLOT_HELD");
    expect(store.rows).toHaveLength(1);
  });

  it("valide les données et bloque les robots", () => {
    store.openDay(DAY);
    expect(request({ email: "pas-un-email" }).fieldErrors.email).toBe("invalid_email");
    expect(request({ projectDescription: "court" }).fieldErrors.projectDescription).toBe("too_short");
    expect(request({ consent: false }).fieldErrors.consent).toBe("consent_required");
    expect(request({ website: "http://spam" }).code).toBe("SPAM");
    expect(request({ startedAt: NOW - 500 }).code).toBe("SPAM");
    expect(request({ start: "19:00", durationMinutes: 120 }).code).toBe("OUTSIDE_RANGE");
  });

  it("enregistre les images de référence en privé", () => {
    store.openDay(DAY);
    const r = request({ references: [{ type: "image/jpeg", data: Buffer.from("x").toString("base64"), name: "a.jpg" }] });
    expect(store.findByRef(r.reference)?.references).toContain("drive.google.com");
    expect(request({ email: "z@example.com", start: "11:00", durationMinutes: 60, references: [{ type: "text/html", data: "PGgxPg==" }] }).fieldErrors.references).toBe("file_type");
  });

  it("une panne d'e-mail ou de Google Agenda ne fait pas perdre la demande", () => {
    store.openDay(DAY);
    store.mailDown = true;
    store.calendarDown = true;
    const r = request();
    expect(r.ok).toBe(true);
    expect(store.findByRef(r.reference)?.history).toContain("non vérifié");
    expect(store.failedMails).toHaveLength(2);
    store.mailDown = false;
    expect(gas.maintenance(store, NOW + 3_600_000).mailsRetried).toBe(2);
  });
});

describe("décisions de l'artiste (colonne « ➜ Décision »)", () => {
  it("Accepter confirme, peut allonger la durée en vérifiant les conflits, et envoie le .ics", () => {
    store.openDay(DAY);
    const a = request({ start: "11:00", durationMinutes: 60 }).reference;
    request({ email: "o@example.com", start: "13:00", durationMinutes: 60 });
    store.findByRef(a)!.finalHours = 3;
    expect(() => gas.decide(store, a, "Accepter", NOW)).toThrow(/chevauche/);
    store.findByRef(a)!.finalHours = 2;
    gas.decide(store, a, "Accepter", NOW);
    const b = store.findByRef(a)!;
    expect(b.statusCode).toBe("CONFIRMED");
    expect(b.end).toBe("13:00");
    expect(b.decision).toBe("");
    const mail = store.sent.find((m) => /confirmé/.test(m.subject))!;
    expect(mail.attachments?.[0]?.name).toBe(`${a}.ics`);
    expect(() => gas.decide(store, a, "Accepter", NOW)).toThrow(/En attente/);
  });

  it("Refuser libère le créneau", () => {
    store.openDay(DAY);
    const a = request().reference;
    store.findByRef(a)!.clientMessage = "Agenda complet ce jour-là";
    gas.decide(store, a, "Refuser", NOW);
    expect(statusOf(a)).toBe("DECLINED");
    expect(store.sent.at(-1)?.html).toContain("Agenda complet");
    expect(request({ email: "x@example.com" }).ok).toBe(true);
  });

  it("Proposer un autre créneau : confirmé seulement si le client accepte via son lien", () => {
    store.openDay(DAY);
    const a = request().reference;
    const b = store.findByRef(a)!;
    b.newDate = "12/11/2026";
    b.newTime = "16:00";
    gas.decide(store, a, "Proposer le nouveau créneau", NOW);
    expect(statusOf(a)).toBe("RESCHEDULE_PROPOSED");
    const mail = store.sent.find((m) => /nouveau créneau/i.test(m.subject))!;
    const token = /token=([a-f0-9]+)/.exec(mail.html)![1]!;
    expect(mail.html).toContain("/fr/booking/response/?token=");

    const view = gas.apiProposal(store, { token }, NOW);
    expect(view).toMatchObject({ ok: true, firstName: "Léa" });
    expect(view).not.toHaveProperty("email");
    expect(request({ email: "free@example.com" }).ok).toBe(true); // l'ancien créneau est libéré

    expect(gas.apiRespond(store, { token, choice: "accept" }, NOW).status).toBe("CONFIRMED");
    expect(store.findByRef(a)?.start).toBe("16:00");
    expect(gas.apiRespond(store, { token, choice: "accept" }, NOW).code).toBe("NOT_FOUND"); // lien à usage unique
  });

  it("un jeton invalide ne donne accès à rien", () => {
    expect(gas.apiProposal(store, { token: "x".repeat(40) }, NOW).code).toBe("EXPIRED");
  });

  it("Proposer sans date ni heure donne un message clair", () => {
    store.openDay(DAY);
    const a = request().reference;
    expect(() => gas.decide(store, a, "Proposer le nouveau créneau", NOW)).toThrow(/Nouvelle date/);
  });

  it("Annuler puis tenter d'accepter : transitions cohérentes et historique", () => {
    store.openDay(DAY);
    const a = request().reference;
    gas.decide(store, a, "Annuler le rendez-vous", NOW);
    expect(statusOf(a)).toBe("CANCELLED");
    expect(() => gas.decide(store, a, "Accepter", NOW)).toThrow();
    expect(String(store.findByRef(a)?.history)).toMatch(/Demande reçue[\s\S]*Annulée/);
    expect(store.events.has(a)).toBe(false);
  });
});

describe("automatismes", () => {
  it("une demande sans décision expire et libère le créneau", () => {
    store.openDay(DAY);
    const a = request().reference;
    const later = NOW + 73 * 3_600_000;
    expect(gas.maintenance(store, later).expired).toBe(1);
    expect(statusOf(a)).toBe("EXPIRED");
    expect(store.sent.at(-1)?.subject).toMatch(/expiré/);
    expect(request({ email: "n@example.com" }, later).ok).toBe(true);
  });

  it("purge RGPD : images supprimées puis données anonymisées après les délais", () => {
    store.openDay(DAY);
    const a = request({ references: [{ type: "image/png", data: "eA==" }] }).reference;
    gas.decide(store, a, "Accepter", NOW);
    gas.maintenance(store, Date.parse("2027-04-01T10:00:00Z"));
    expect(statusOf(a)).toBe("COMPLETED");
    expect(store.files).toHaveLength(0);
    gas.maintenance(store, Date.parse("2029-01-01T10:00:00Z"));
    expect(store.findByRef(a)?.email).toBe("anonymise@invalid");
  });
});

describe("contact", () => {
  it("enregistre le message, prévient l'artiste (reply-to client) et accuse réception", () => {
    const r = gas.apiContact(
      store,
      { firstName: "Ana", lastName: "B", email: "ana@example.com", locale: "en", subject: "Question", message: "Bonjour, une question.", consent: true, startedAt: NOW - 10_000 },
      NOW,
    );
    expect(r.ok).toBe(true);
    expect(store.messages).toHaveLength(1);
    expect(store.sent[0]?.replyTo).toBe("ana@example.com");
    expect(store.sent[1]?.subject).toMatch(/received your message/);
  });
});

describe("e-mails", () => {
  it("échappent le contenu saisi par les clients", () => {
    store.openDay(DAY);
    request({ firstName: "<script>alert(1)</script>" });
    for (const m of store.sent) {
      expect(m.html).not.toContain("<script>alert");
    }
  });

  it("utilisent la langue du client", () => {
    store.openDay(DAY);
    request({ locale: "nl" });
    expect(store.sent.find((m) => m.to === "lea@example.com")?.subject).toMatch(/Aanvraag ontvangen/);
    expect(store.sent.find((m) => m.to === "lea@example.com")?.html).toContain("dinsdag 10 november 2026");
  });
});
