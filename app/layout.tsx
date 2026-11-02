import type { Metadata } from "next";
import "./globals.css";

import Script from "next/script";
export const metadata: Metadata = {
  title: "SIH Anesthésie-Réanimation",
  description: "Plateforme médicale CHU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
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
