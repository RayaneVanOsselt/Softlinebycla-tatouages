import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type Locale = "fr" | "nl" | "en";
export type Localized = Partial<Record<Locale, string>>;

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "DECLINED",
  "RESCHEDULE_PROPOSED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuts qui occupent un créneau (empêchent toute autre demande sur la même plage). */
export const BLOCKING_STATUSES = ["PENDING", "RESCHEDULE_PROPOSED", "CONFIRMED"] as const satisfies readonly BookingStatus[];

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => (Buffer.isBuffer(value) ? value : Buffer.from(value)),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ───────────────────────────── Réservations ───────────────────────────── */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    projectDescription: text("project_description").notNull(),
    placement: text("placement"),
    approximateSize: text("approximate_size"),
    style: text("style"),
    comment: text("comment"),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
    finalDurationMinutes: integer("final_duration_minutes"),
    /** Plage actuellement réservée/proposée (UTC). */
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    /** Plage demandée initialement par le client. */
    requestedStartAt: timestamp("requested_start_at", { withTimezone: true }).notNull(),
    requestedEndAt: timestamp("requested_end_at", { withTimezone: true }).notNull(),
    status: text("status").$type<BookingStatus>().notNull().default("PENDING"),
    /** Au-delà de cette date, une demande PENDING / RESCHEDULE_PROPOSED expire et libère le créneau. */
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    calendarEventId: text("calendar_event_id"),
    /** false si Google Agenda n'a pas pu être consulté au moment de la demande. */
    calendarChecked: boolean("calendar_checked").notNull().default(false),
    responseTokenHash: text("response_token_hash"),
    adminNotes: text("admin_notes"),
    clientMessage: text("client_message"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookings_reference_idx").on(t.reference),
    uniqueIndex("bookings_response_token_idx").on(t.responseTokenHash),
    index("bookings_status_start_idx").on(t.status, t.startAt),
    index("bookings_start_idx").on(t.startAt),
    index("bookings_email_idx").on(t.email),
    check("bookings_range_check", sql`${t.endAt} > ${t.startAt}`),
    check(
      "bookings_status_check",
      sql`${t.status} in ('PENDING','CONFIRMED','DECLINED','RESCHEDULE_PROPOSED','CANCELLED','EXPIRED','COMPLETED')`,
    ),
  ],
);
// La contrainte d'exclusion anti-chevauchement (EXCLUDE USING gist) est ajoutée en SQL dans drizzle/0001_*.sql

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    fromStatus: text("from_status").$type<BookingStatus>(),
    toStatus: text("to_status").$type<BookingStatus>(),
    actor: text("actor").$type<"client" | "admin" | "system">().notNull(),
    note: text("note"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId, t.createdAt)],
);

export const bookingAttachments = pgTable(
  "booking_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_attachments_booking_idx").on(t.bookingId)],
);

/* ──────────────────────────── Disponibilités ──────────────────────────── */

/** Un enregistrement = un créneau ouvert (date locale Europe/Brussels + minute de début). Absence = fermé. */
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date", { mode: "string" }).notNull(),
    startMinute: smallint("start_minute").notNull(),
    updatedBy: text("updated_by"),
    ...timestamps,
  },
  (t) => [uniqueIndex("availability_date_minute_idx").on(t.date, t.startMinute)],
);

export const blockedPeriods = pgTable(
  "blocked_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocked_periods_range_idx").on(t.startAt, t.endAt), check("blocked_range_check", sql`${t.endAt} > ${t.startAt}`)],
);

/* ────────────────────────────── Portfolio ─────────────────────────────── */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: jsonb("name").$type<Localized>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: jsonb("title").$type<Localized>().notNull(),
    description: jsonb("description").$type<Localized>().notNull().default({}),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    year: smallint("year"),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("projects_slug_idx").on(t.slug), index("projects_order_idx").on(t.published, t.sortOrder)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"image" | "video">().notNull(),
    url: text("url").notNull(),
    /** Clé de stockage (Vercel Blob) pour pouvoir supprimer le fichier. Null pour les médias du dépôt. */
    storageKey: text("storage_key"),
    posterUrl: text("poster_url"),
    alt: jsonb("alt").$type<Localized>().notNull().default({}),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurDataUrl: text("blur_data_url"),
    focalX: smallint("focal_x").notNull().default(50),
    focalY: smallint("focal_y").notNull().default(50),
    sortOrder: integer("sort_order").notNull().default(0),
    visibility: text("visibility").$type<"public" | "private">().notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_project_idx").on(t.projectId, t.sortOrder)],
);

/* ─────────────────────────────── Contact ──────────────────────────────── */

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    status: text("status").$type<"NEW" | "READ" | "ARCHIVED">().notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

/* ──────────────────────── Tâches de synchronisation ───────────────────── */

export type JobType = "email" | "calendar.sync" | "sheets.sync";
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").$type<JobType>().notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").$type<JobStatus>().notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(8),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("jobs_dedupe_idx").on(t.dedupeKey),
    index("jobs_status_run_idx").on(t.status, t.runAt),
    index("jobs_booking_idx").on(t.bookingId),
  ],
);

/* ───────────────────────── Authentification admin ─────────────────────── */

export const adminLoginTokens = pgTable(
  "admin_login_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admin_login_tokens_hash_idx").on(t.tokenHash)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admin_sessions_hash_idx").on(t.tokenHash)],
);

/* ──────────────────────────── Divers ──────────────────────────── */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
