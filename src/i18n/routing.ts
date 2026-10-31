import { defineRouting } from "next-intl/routing";
import { localizedPathnames } from "./paths";

export const routing = defineRouting({
  locales: ["fr", "nl", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
  // Détection initiale via l'en-tête Accept-Language, puis préférence mémorisée (cookie fonctionnel NEXT_LOCALE).
  localeDetection: true,
  pathnames: localizedPathnames,
});

export type Locale = (typeof routing.locales)[number];
