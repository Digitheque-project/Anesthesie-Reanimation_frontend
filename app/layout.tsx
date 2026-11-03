import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

import Script from "next/script";

// Police de la consultation externe (unification des interfaces du CHU). --font-manrope
// était référencée dans globals.css sans jamais être chargée : le navigateur prenait sa
// police système.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
export const metadata: Metadata = {
  title: "SIH Anesthésie-Réanimation",
  description: "Plateforme médicale CHU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="antialiased">{children}
        {/* Messagerie du CHU : bulle en bas à droite (service-messagerie, via la passerelle). */}
        {process.env.NEXT_PUBLIC_GATEWAY_URL ? (
          <Script
            src={`${process.env.NEXT_PUBLIC_GATEWAY_URL.replace(/\/+$/, "")}/messagerie/widget.js?auto`}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
