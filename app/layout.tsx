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
        {/* Onglet caché : toute interrogation répétée (toutes les 5 s ou plus) ne
            tourne plus qu'une fois toutes les 2 minutes, et reprend normalement au
            retour sur l'onglet. Tous les postes du CHU sortent par la même adresse
            IP : cumulées, ces interrogations faisaient bloquer la passerelle par le
            pare-feu de l'hébergeur (test « Just a moment… », 429) — connexion,
            envois et messagerie impossibles. Les horloges (1 s) ne sont pas touchées. */}
        <Script id="chu-onglet-cache" strategy="beforeInteractive">
          {`(function(){if(window.__chuOngletCache)return;window.__chuOngletCache=1;var origine=window.setInterval,PAS_CACHE=120000;window.setInterval=function(action,ms){if(typeof action!=='function'||!(ms>=5000))return origine.apply(window,arguments);var args=[].slice.call(arguments,2),dernier=0;return origine.call(window,function(){var t=Date.now();if(document.hidden&&t-dernier<PAS_CACHE)return;dernier=t;return action.apply(this,args);},ms);};})();`}
        </Script>
        {/* Messagerie du CHU : bulle en bas à droite (service-messagerie, via la passerelle). */}
        {process.env.NEXT_PUBLIC_GATEWAY_URL ? (
          // Chargée par un petit script qui réessaie : si la passerelle refuse le
          // chargement (blocage momentané), la bulle n'était jamais affichée.
          <Script id="chu-messagerie" strategy="afterInteractive">
            {`(function(){var src=${JSON.stringify(`${process.env.NEXT_PUBLIC_GATEWAY_URL.replace(/\/+$/, "")}/messagerie/widget.js?auto`)},essai=0;function charger(){var s=document.createElement("script");s.src=src+(essai?"&essai="+essai:"");s.async=true;s.onerror=function(){s.remove();if(++essai<8)setTimeout(charger,Math.min(60000,5000*essai));};document.body.appendChild(s);}charger();})();`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
