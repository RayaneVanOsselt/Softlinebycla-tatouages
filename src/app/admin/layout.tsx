import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cormorant, nunito } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Admin SOFTLINEBY.CLA" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${nunito.variable}`} data-intro="skip">
      <body className="bg-ivory text-chocolate">{children}</body>
    </html>
  );
}
