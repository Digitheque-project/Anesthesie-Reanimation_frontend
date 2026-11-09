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
        {/* Point « serveur prêt » de l'en-tête (comme la consultation externe) :
            déduit des vraies requêtes vers le serveur, jamais d'un ping dédié. */}
        {/* Prise en charge indépendante : la clé d'épisode du Bloc (« <id>~2 ») reste interne ; les
    appels vers les autres services (Accueil, Dossier, Prescriptions) partent avec le vrai id. */}
        <Script id="chu-episode" strategy="beforeInteractive">
          {`(function(){if(window.__chuEpisode)return;window.__chuEpisode=1;var re=/([A-Za-z0-9_-]{6,})~[0-9]+/g;function hors(u){return String(u).indexOf('/bloc/')<0;}function net(v){return typeof v==='string'?v.replace(re,'$1'):v;}var f=window.fetch;if(f){window.fetch=function(i,o){if(typeof i==='string'&&hors(i)){i=net(i);if(o&&typeof o.body==='string')o=Object.assign({},o,{body:net(o.body)});}return f.call(this,i,o);};}var X=XMLHttpRequest.prototype,op=X.open,se=X.send;X.open=function(m,u){this.__chuHors=hors(u);var a=[].slice.call(arguments);if(this.__chuHors)a[1]=net(u);return op.apply(this,a);};X.send=function(b){return se.call(this,this.__chuHors?net(b):b);};})();`}
        </Script>
        <Script id="chu-etat-serveur" strategy="beforeInteractive">
          {`(function(){if(window.__chuServeur)return;var etat={pret:false};window.__chuServeur=etat;function maj(ok){if(etat.pret===ok)return;etat.pret=ok;window.dispatchEvent(new Event('chu-serveur'));}function suivie(u){try{var url=new URL(String(u),location.href);if(url.pathname.indexOf('/messagerie/widget.js')>=0)return false;return url.origin!==location.origin||url.pathname.indexOf('/api/')===0;}catch(e){return false;}}function verdict(s){return s>0&&s<500&&s!==429;}var f=window.fetch;if(f){window.fetch=function(i){var u=typeof i==='string'?i:(i&&i.url)||String(i);var p=f.apply(this,arguments);if(suivie(u))p.then(function(r){maj(verdict(r.status));},function(e){if(!(e&&e.name==='AbortError'))maj(false);});return p;};}var X=XMLHttpRequest.prototype,op=X.open,se=X.send;X.open=function(m,u){this.__chuUrl=u;return op.apply(this,arguments);};X.send=function(){var x=this;if(suivie(x.__chuUrl)){x.addEventListener('abort',function(){x.__chuAbandon=1;});x.addEventListener('loadend',function(){if(!x.__chuAbandon)maj(verdict(x.status));});}return se.apply(this,arguments);};})();`}
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
