/**
 * Exécute apps-script/Code.gs dans Node (machine virtuelle isolée) avec des doublures minimales
 * des services Google. Utilisé par les tests et par le serveur de démonstration local (npm run mock-api).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{ name: string; type: string; content: string }>;
}

type Gas = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function formatDate(date: Date, tz: string, pattern: string) {
  if (pattern !== "yyyy-MM-dd HH:mm u") throw new Error(`Motif non pris en charge : ${pattern}`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const u = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday as string];
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${u}`;
}

export function loadGas(): Gas {
  const code = fs.readFileSync(path.join(process.cwd(), "apps-script/Code.gs"), "utf8");
  const Utilities = {
    formatDate,
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: "sha256" },
    Charset: { UTF_8: "utf8" },
    computeDigest: (_alg: string, value: string) => [...crypto.createHash("sha256").update(value, "utf8").digest()].map((b) => (b > 127 ? b - 256 : b)),
    base64Decode: (s: string) => [...Buffer.from(s, "base64")],
  };
  const ctx = vm.createContext({ Utilities, console, JSON, Math, Date, encodeURIComponent });
  vm.runInContext(code, ctx, { filename: "Code.gs" });
  return ctx as Gas;
}

export interface MemoryBooking {
  [key: string]: unknown;
  ref: string;
  row: number;
}

/** Implémentation en mémoire de l'interface de stockage utilisée par Code.gs (SheetStore en production). */
export class MemoryStore {
  rows: MemoryBooking[] = [];
  open: Record<string, Record<number, boolean>> = {};
  blockedPeriods: Array<{ start: number; end: number }> = [];
  busyIntervals: Array<{ start: number; end: number }> = [];
  calendarDown = false;
  mailDown = false;
  sent: Mail[] = [];
  failedMails: Mail[] = [];
  events = new Map<string, { start: string; end: string; status: string }>();
  messages: Array<Record<string, unknown>> = [];
  journal: Array<{ kind: string; ref: string; result: string }> = [];
  files: string[] = [];
  counters = new Map<string, number>();
  cfg: Record<string, unknown> = {
    notifyEmail: "artist@example.com",
    siteUrl: "https://rayanevanosselt.github.io/Softlinebycla-tatouages",
    allOpen: true,
    pendingHoldHours: 72,
    proposalHoldHours: 72,
    minNoticeHours: 24,
    maxAdvanceDays: 120,
    maxDurationHours: 6,
    attachmentRetentionDays: 120,
    dataRetentionMonths: 24,
    useMainCalendar: true,
    contactAutoReply: true,
  };

  settings() {
    return this.cfg;
  }
  withLock<T>(fn: () => T): T {
    return fn();
  }
  bookings() {
    return this.rows;
  }
  findByRef(ref: string) {
    return this.rows.find((b) => b.ref === ref) ?? null;
  }
  insert(b: MemoryBooking) {
    b.row = this.rows.length + 2;
    this.rows.push(b);
  }
  save(b: MemoryBooking) {
    const i = this.rows.findIndex((x) => x.ref === b.ref);
    if (i < 0) throw new Error("ligne inconnue");
    this.rows[i] = b;
  }
  rowUrl(b: MemoryBooking) {
    return `https://docs.google.com/spreadsheets/d/test#range=A${b.row}`;
  }
  openMap(from: string, to: string) {
    return Object.fromEntries(Object.entries(this.open).filter(([d]) => d >= from && d <= to));
  }
  blocked(from: number, to: number) {
    return this.blockedPeriods.filter((p) => p.start < to && p.end > from);
  }
  busy(from: number, to: number) {
    if (this.calendarDown) return { intervals: [], checked: false };
    return { intervals: this.busyIntervals.filter((p) => p.start < to && p.end > from), checked: true };
  }
  calendarConfigured() {
    return true;
  }
  syncEvent(b: MemoryBooking) {
    const terminal = ["DECLINED", "CANCELLED", "EXPIRED"].includes(String(b.statusCode));
    if (terminal) this.events.delete(b.ref);
    else this.events.set(b.ref, { start: String(b.startIso), end: String(b.endIso), status: String(b.statusCode) });
    b.eventId = terminal ? b.eventId : `evt-${b.ref}`;
  }
  saveFiles(b: MemoryBooking, files: unknown[]) {
    const ids = files.map((_, i) => `${b.ref}-file-${i}`);
    this.files.push(...ids);
    return { ids, links: ids.map((id) => `https://drive.google.com/file/d/${id}`) };
  }
  deleteFiles(ids: string[]) {
    this.files = this.files.filter((f) => !ids.includes(f));
  }
  sendMail(m: Mail, ref: string, kind: string) {
    if (this.mailDown) {
      this.failedMails.push(m);
      this.journal.push({ kind, ref, result: "Échec" });
      return false;
    }
    this.sent.push(m);
    this.journal.push({ kind, ref, result: "Envoyé" });
    return true;
  }
  retryMails() {
    if (this.mailDown) return 0;
    const n = this.failedMails.length;
    this.sent.push(...this.failedMails);
    this.failedMails = [];
    return n;
  }
  log(kind: string, ref: string, _to: string, result: string) {
    this.journal.push({ kind, ref, result });
  }
  addMessage(m: Record<string, unknown>, now: number) {
    this.messages.push({ ...m, at: now });
  }
  purgeMessages(cut: number) {
    const before = this.messages.length;
    this.messages = this.messages.filter((m) => Number(m.at) >= cut);
    return before - this.messages.length;
  }
  extendAvailability() {}
  rateLimit(key: string, max: number) {
    const n = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, n);
    return n <= max;
  }
  newToken() {
    return crypto.randomBytes(32).toString("hex");
  }
  hash(s: string) {
    return crypto.createHash("sha256").update(`test|${s}`).digest("hex");
  }

  /** Ouvre les heures (par défaut 11:00–19:00) d'un jour. */
  openDay(date: string, hours = [11, 12, 13, 14, 15, 16, 17, 18, 19]) {
    this.open[date] = Object.fromEntries(hours.map((h) => [h * 60, true]));
  }
}
