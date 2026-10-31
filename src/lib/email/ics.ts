import { brand } from "../config";

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fichier iCalendar (RFC 5545) joint à l'e-mail de confirmation. */
export function buildIcs(input: { uid: string; start: Date; end: Date; summary: string; description: string; sequence?: number; cancelled?: boolean }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brand.name}//Booking//FR`,
    "CALSCALE:GREGORIAN",
    `METHOD:${input.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(input.start)}`,
    `DTEND:${fmt(input.end)}`,
    `SEQUENCE:${input.sequence ?? 0}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `STATUS:${input.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Repli des lignes à 75 octets
  return lines
    .map((line) => {
      const out: string[] = [];
      let rest = line;
      while (rest.length > 73) {
        out.push(rest.slice(0, 73));
        rest = " " + rest.slice(73);
      }
      out.push(rest);
      return out.join("\r\n");
    })
    .join("\r\n");
}
