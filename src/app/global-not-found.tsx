import type { Metadata } from "next";
import { basePath } from "@/lib/config";
import { cormorant, nunito } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404 · SOFTLINEBY.CLA", robots: { index: false } };

/** Page 404 (GitHub Pages affiche 404.html pour toute adresse inconnue). */
export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${cormorant.variable} ${nunito.variable}`}>
      <body className="bg-ivory text-chocolate">
        <main className="paper-grain grid min-h-svh place-items-center px-6 text-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/brand/monogram-ink.png`} alt="SOFTLINEBY.CLA" width={277} height={364} className="mx-auto h-28 w-auto opacity-70" />
            <p className="eyebrow mt-10 justify-center">404</p>
            <h1 className="display-l mt-5">Cette page s’est effacée</h1>
            <p className="lead mx-auto mt-6 max-w-md">Deze pagina bestaat niet · This page does not exist.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href={`${basePath}/fr/`} className="btn btn-primary">
                Accueil
              </a>
              <a href={`${basePath}/nl/`} className="btn btn-ghost">
                Home (NL)
              </a>
              <a href={`${basePath}/en/`} className="btn btn-ghost">
                Home (EN)
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
