import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "nl", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
