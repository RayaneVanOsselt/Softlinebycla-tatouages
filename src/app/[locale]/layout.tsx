import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import type { ReactNode } from "react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Intro, introBootScript } from "@/components/site/Intro";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/config";
import { cormorant, nunito } from "@/lib/fonts";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: "#FBF8F3",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: "SOFTLINEBY.CLA", template: "%s · SOFTLINEBY.CLA" },
    description: t("siteDescription"),
    applicationName: "SOFTLINEBY.CLA",
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} className={`no-js ${cormorant.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body>
        <Script id="intro-boot" strategy="beforeInteractive">
          {introBootScript}
        </Script>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only-focusable fixed top-3 left-3 z-[200] rounded-full bg-chocolate px-5 py-3 text-sm font-semibold text-ivory"
          >
            {t("skip")}
          </a>
          <Intro />
          <Header />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
