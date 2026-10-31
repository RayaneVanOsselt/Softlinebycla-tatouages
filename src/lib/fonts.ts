import { Cormorant_Garamond, Nunito_Sans } from "next/font/google";

// Polices auto-hébergées au build par next/font : aucune requête vers Google depuis le navigateur (RGPD).
export const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Sans-serif humaniste proche du mot-symbole du logo (style Avenir). */
export const nunito = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});
