/**
 * Configuration centrale. Les secrets restent côté serveur : seules les variables
 * préfixées NEXT_PUBLIC_ sont exposées au navigateur.
 */

const env = (key: string) => {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
};

const bool = (key: string, fallback: boolean) => {
  const v = env(key);
  if (v === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
};

const parseHm = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const brand = {
  name: "SOFTLINEBY.CLA",
  shortName: "softlineby.cla",
  colors: {
    lightBrown: "#98755B",
    cream: "#E2D1C2",
    darkChocolate: "#442913",
    sand: "#D4BBAC",
    nutBrown: "#5C3422",
    ivory: "#FBF8F3", // papier du logo officiel
    ink: "#14100D", // trait du logo officiel
  },
} as const;

export const locales = ["fr", "nl", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "fr";

export function siteUrl() {
  const explicit = env("NEXT_PUBLIC_SITE_URL") ?? env("SITE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL") ?? env("VERCEL_URL");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const bookingConfig = {
  timezone: env("TIMEZONE") ?? "Europe/Brussels",
  /** Plage autorisée pour les disponibilités (pas des horaires d'ouverture publics). */
  dayStartMinute: parseHm(env("AVAILABLE_TIME_START"), 11 * 60),
  dayEndMinute: parseHm(env("AVAILABLE_TIME_END"), 20 * 60),
  slotMinutes: Number(env("BOOKING_SLOT_MINUTES") ?? 60) || 60,
  /** Exigence produit : jamais de confirmation automatique, quelle que soit la variable. */
  automaticConfirmation: false as const,
  defaultAvailabilityClosed: true as const,
};

if (bool("AUTOMATIC_BOOKING_CONFIRMATION", false)) {
  console.warn("[config] AUTOMATIC_BOOKING_CONFIRMATION=true ignoré : chaque demande est validée manuellement.");
}

export const publicFlags = {
  addressEnabled: bool("PUBLIC_ADDRESS_ENABLED", false),
  phoneEnabled: bool("PUBLIC_PHONE_ENABLED", false),
};

export function adminEmails(): string[] {
  return (env("ADMIN_EMAILS") ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function smtpConfig() {
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASSWORD")?.replace(/\s+/g, ""); // les mots de passe d'application Gmail sont affichés avec des espaces
  if (!user || !pass) return undefined;
  const port = Number(env("SMTP_PORT") ?? 465);
  return {
    host: env("SMTP_HOST") ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    user,
    pass,
    fromName: env("EMAIL_FROM_NAME") ?? brand.name,
    fromAddress: env("EMAIL_FROM") ?? user,
  };
}

export function googleConfig() {
  const clientEmail = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = env("GOOGLE_PRIVATE_KEY");
  if (!clientEmail || !rawKey) return undefined;
  // Vercel conserve les « \n » littéraux : on les convertit en vrais retours à la ligne.
  const privateKey = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  return {
    clientEmail,
    privateKey,
    calendarId: env("GOOGLE_CALENDAR_ID"),
    extraBusyCalendarIds: (env("GOOGLE_BUSY_CALENDAR_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    sheetsId: env("GOOGLE_SHEETS_ID"),
    sheetsTab: env("GOOGLE_SHEETS_TAB") ?? "Réservations",
  };
}

/** Secret serveur pour signer/hacher les jetons (sessions, IP, liens). */
export function authSecret() {
  const s = env("AUTH_SECRET");
  if (s) return s;
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB) {
    throw new Error("AUTH_SECRET manquant : ajoutez-le dans les variables d'environnement Vercel.");
  }
  return "dev-only-insecure-secret-change-me";
}

export function cronSecret() {
  return env("CRON_SECRET");
}

export function blobEnabled() {
  return Boolean(env("BLOB_READ_WRITE_TOKEN"));
}

/** Valeurs initiales des e-mails (modifiables ensuite dans l'administration). */
export function envContactEmail() {
  return env("CONTACT_EMAIL");
}
export function envBookingNotificationEmail() {
  return env("BOOKING_NOTIFICATION_EMAIL") ?? env("CONTACT_EMAIL");
}

export function envSocialDefaults() {
  return {
    instagram: env("SOCIAL_INSTAGRAM") ?? "",
    tiktok: env("SOCIAL_TIKTOK") ?? "",
    pinterest: env("SOCIAL_PINTEREST") ?? "",
  };
}
