import { describe, expect, it } from "vitest";
import { emails, esc } from "@/lib/email/templates";
import { buildIcs } from "@/lib/email/ics";

const data = {
  reference: "SLC-ABC123",
  firstName: "<script>alert(1)</script>",
  lastName: "O'Brien",
  email: "x@example.com",
  locale: "nl" as const,
  startAt: new Date("2026-11-10T13:00:00Z"),
  endAt: new Date("2026-11-10T15:00:00Z"),
  durationMinutes: 120,
  projectDescription: "<img src=x onerror=alert(1)>",
};

describe("e-mails", () => {
  it("échappe tout contenu saisi par un client (aucune injection HTML)", () => {
    const m = emails.requestReceived(data, 72);
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain(esc("<script>alert(1)</script>"));
  });

  it("utilise la langue du client et affiche l'heure de Bruxelles", () => {
    const m = emails.requestReceived(data, 72);
    expect(m.subject).toMatch(/Aanvraag ontvangen/);
    expect(m.html).toContain("14:00 – 16:00");
    expect(m.text).toMatch(/nog geen bevestigde afspraak/);
  });

  it("l'accusé de réception ne présente jamais le rendez-vous comme confirmé", () => {
    const fr = emails.requestReceived({ ...data, locale: "fr", firstName: "Léa" }, 72);
    expect(fr.html).toContain("Votre créneau est en attente de confirmation par SOFTLINEBY.CLA");
    expect(fr.subject).not.toMatch(/confirmé/i);
  });

  it("la confirmation joint un fichier agenda valide", () => {
    const ics = buildIcs({ uid: "a@b", start: data.startAt, end: data.endAt, summary: "Test, ok", description: "x" });
    expect(ics).toContain("DTSTART:20261110T130000Z");
    expect(ics).toContain("SUMMARY:Test\\, ok");
    const m = emails.confirmed({ ...data, locale: "en" }, ics);
    expect(m.attachments?.[0]?.filename).toBe("SLC-ABC123.ics");
  });
});
