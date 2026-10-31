import type { Metadata } from "next";
import { basePath, siteUrl } from "@/lib/config";

export const metadata: Metadata = {
  title: "SOFTLINEBY.CLA",
  alternates: { canonical: `${siteUrl()}/fr/` },
  robots: { index: false, follow: true },
};

/** Adresse racine : redirigée vers /fr/, /nl/ ou /en/ (voir layout). Sans JavaScript : redirection vers le français + liens. */
export default function RootPage() {
  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${basePath}/fr/`} />
      </noscript>
      <main className="grid min-h-svh place-items-center bg-ivory p-6 text-center text-chocolate">
        <p className="space-x-4 text-sm tracking-[0.2em] uppercase">
          <a href={`${basePath}/fr/`}>Français</a>
          <a href={`${basePath}/nl/`}>Nederlands</a>
          <a href={`${basePath}/en/`}>English</a>
        </p>
      </main>
    </>
  );
}
