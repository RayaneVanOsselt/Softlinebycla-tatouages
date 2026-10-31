import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Executor } from "./db";
import { settings } from "./db/schema";
import { envBookingNotificationEmail, envContactEmail, envSocialDefaults } from "./config";

const localized = z.object({ fr: z.string().max(4000).optional(), nl: z.string().max(4000).optional(), en: z.string().max(4000).optional() });
const url = z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(300)]);

export const bookingSettingsSchema = z.object({
  /** Durée pendant laquelle une demande en attente bloque le créneau. */
  pendingHoldHours: z.coerce.number().int().min(6).max(24 * 14),
  /** Délai de réponse du client à une proposition de nouveau créneau. */
  proposalHoldHours: z.coerce.number().int().min(6).max(24 * 14),
  /** Délai minimum entre la demande et le rendez-vous. */
  minNoticeHours: z.coerce.number().int().min(0).max(24 * 30),
  /** Jusqu'à combien de jours à l'avance on peut demander un rendez-vous. */
  maxAdvanceDays: z.coerce.number().int().min(7).max(365),
  /** Durée maximale qu'un client peut sélectionner. */
  maxDurationHours: z.coerce.number().int().min(1).max(9),
  /** Suppression automatique des images de référence après le rendez-vous. */
  attachmentRetentionDays: z.coerce.number().int().min(7).max(730),
  /** Anonymisation des demandes après ce délai. */
  dataRetentionMonths: z.coerce.number().int().min(3).max(120),
});
export type BookingSettings = z.infer<typeof bookingSettingsSchema>;

export const contactSettingsSchema = z.object({
  contactEmail: z.union([z.literal(""), z.email().max(200)]),
  bookingNotificationEmail: z.union([z.literal(""), z.email().max(200)]),
  contactAutoReply: z.boolean(),
});
export type ContactSettings = z.infer<typeof contactSettingsSchema>;

export const socialSettingsSchema = z.object({
  instagram: url,
  tiktok: url,
  pinterest: url,
  facebook: url,
  youtube: url,
});
export type SocialSettings = z.infer<typeof socialSettingsSchema>;

export const contentSettingsSchema = z.object({
  heroTitle: localized,
  heroText: localized,
  manifesto: localized,
  aboutIntro: localized,
  aboutBody: localized,
  aboutApproach: localized,
  ctaTitle: localized,
  ctaText: localized,
});
export type ContentSettings = z.infer<typeof contentSettingsSchema>;

export const legalSettingsSchema = z.object({
  businessName: z.string().max(200),
  legalForm: z.string().max(200),
  enterpriseNumber: z.string().max(60),
  vatNumber: z.string().max(60),
  registeredAddress: z.string().max(400),
  privacyEmail: z.union([z.literal(""), z.email().max(200)]),
  extraLegalText: localized,
  extraPrivacyText: localized,
  reviewedAt: z.string().max(40),
});
export type LegalSettings = z.infer<typeof legalSettingsSchema>;

const emptyLocalized = {};

export const settingDefaults = {
  booking: {
    pendingHoldHours: 72,
    proposalHoldHours: 72,
    minNoticeHours: 24,
    maxAdvanceDays: 120,
    maxDurationHours: 6,
    attachmentRetentionDays: 120,
    dataRetentionMonths: 24,
  } satisfies BookingSettings,
  contact: (): ContactSettings => ({
    contactEmail: envContactEmail() ?? "",
    bookingNotificationEmail: envBookingNotificationEmail() ?? "",
    contactAutoReply: true,
  }),
  social: (): SocialSettings => ({ ...envSocialDefaults(), facebook: "", youtube: "" }),
  content: {
    heroTitle: emptyLocalized,
    heroText: emptyLocalized,
    manifesto: emptyLocalized,
    aboutIntro: emptyLocalized,
    aboutBody: emptyLocalized,
    aboutApproach: emptyLocalized,
    ctaTitle: emptyLocalized,
    ctaText: emptyLocalized,
  } satisfies ContentSettings,
  legal: {
    businessName: "",
    legalForm: "",
    enterpriseNumber: "",
    vatNumber: "",
    registeredAddress: "",
    privacyEmail: "",
    extraLegalText: emptyLocalized,
    extraPrivacyText: emptyLocalized,
    reviewedAt: "",
  } satisfies LegalSettings,
};

const schemas = {
  booking: bookingSettingsSchema,
  contact: contactSettingsSchema,
  social: socialSettingsSchema,
  content: contentSettingsSchema,
  legal: legalSettingsSchema,
} as const;

export type SettingKey = keyof typeof schemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof schemas)[K]>;

function defaultsFor<K extends SettingKey>(key: K): SettingValue<K> {
  const d = settingDefaults[key];
  return (typeof d === "function" ? d() : structuredClone(d)) as SettingValue<K>;
}

export async function getSetting<K extends SettingKey>(key: K, db?: Executor): Promise<SettingValue<K>> {
  const exec = db ?? (await getDb());
  const [row] = await exec.select().from(settings).where(eq(settings.key, key)).limit(1);
  const base = defaultsFor(key);
  if (!row) return base;
  const merged = { ...base, ...(row.value as object) };
  const parsed = schemas[key].safeParse(merged);
  return (parsed.success ? parsed.data : base) as SettingValue<K>;
}

export async function saveSetting<K extends SettingKey>(key: K, value: unknown, db?: Executor): Promise<SettingValue<K>> {
  const exec = db ?? (await getDb());
  const parsed = schemas[key].parse(value) as SettingValue<K>;
  await exec
    .insert(settings)
    .values({ key, value: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: parsed, updatedAt: new Date() } });
  return parsed;
}

/** Texte administrable localisé, avec repli sur la valeur par défaut fournie. */
export function pickLocalized(value: Partial<Record<string, string>> | undefined, locale: string, fallback: string) {
  const v = value?.[locale]?.trim();
  return v ? v : fallback;
}
