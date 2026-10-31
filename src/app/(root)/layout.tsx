import Script from "next/script";
import type { ReactNode } from "react";
import { basePath } from "@/lib/config";
import "../globals.css";

/** Choix de la langue : préférence mémorisée, sinon langue du navigateur, sinon français. */
const redirect = `(function(){var b=${JSON.stringify(basePath)};var l='fr';try{var s=localStorage.getItem('slc-locale');if(s==='fr'||s==='nl'||s==='en'){l=s}else{var n=(navigator.languages||[navigator.language||'fr']);for(var i=0;i<n.length;i++){var c=String(n[i]).slice(0,2).toLowerCase();if(c==='fr'||c==='nl'||c==='en'){l=c;break}}}}catch(e){}location.replace(b+'/'+l+'/');})();`;

export default function RootRedirectLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Script id="locale-redirect" strategy="beforeInteractive">
          {redirect}
        </Script>
        {children}
      </body>
    </html>
  );
}
