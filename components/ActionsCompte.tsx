"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * « Notifications » et « Changer de service », placés au-dessus de Déconnexion.
 * Même fichier dans chaque front : les services viennent du jeton de l'agent, et le
 * centre de notifications commun est celui de la bulle de messagerie.
 */

interface ServiceJeton {
  serviceId: string;
  serviceName?: string;
  roleName?: string;
  baseUrl?: string | null;
}
interface Charge {
  userId?: string;
  exp?: number;
  services?: ServiceJeton[];
}

const FORME_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function charge(jeton: string): Charge | null {
  try {
    const b64 = jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b64)))) as Charge;
  } catch {
    return null;
  }
}

function jetonsDans(valeur: string | null, profondeur = 0): string[] {
  if (!valeur || profondeur > 3) return [];
  const v = valeur.trim().replace(/^Bearer\s+/i, "");
  if (FORME_JWT.test(v)) return [v];
  if (!v.startsWith("{") && !v.startsWith("[")) return [];
  try {
    const trouves: string[] = [];
    const parcourir = (o: unknown, p: number) => {
      if (p > 4 || o === null) return;
      if (typeof o === "string") trouves.push(...jetonsDans(o, profondeur + 1));
      else if (typeof o === "object") Object.values(o as Record<string, unknown>).forEach((x) => parcourir(x, p + 1));
    };
    parcourir(JSON.parse(v), 0);
    return trouves;
  } catch {
    return [];
  }
}

/** Jeton valide de l'agent, là où ce front le range (le plus durable l'emporte). */
function trouverJeton(): string | null {
  const candidats: string[] = [];
  for (const stockage of [window.sessionStorage, window.localStorage]) {
    try {
      for (let i = 0; i < stockage.length; i++) {
        const cle = stockage.key(i);
        if (cle) candidats.push(...jetonsDans(stockage.getItem(cle)));
      }
    } catch {
      /* stockage inaccessible */
    }
  }
  for (const morceau of document.cookie.split(";")) {
    const i = morceau.indexOf("=");
    if (i <= 0) continue;
    try {
      candidats.push(...jetonsDans(decodeURIComponent(morceau.slice(i + 1))));
    } catch {
      /* cookie non décodable */
    }
  }
  const maintenant = Date.now() / 1000;
  let meilleur: { jeton: string; exp: number } | null = null;
  for (const j of candidats) {
    const c = charge(j);
    if (!c?.userId || !Array.isArray(c.services) || !c.services.length) continue;
    const exp = c.exp ?? Infinity;
    if (exp > maintenant && (!meilleur || exp > meilleur.exp)) meilleur = { jeton: j, exp };
  }
  return meilleur?.jeton ?? null;
}

/** Service en cours ici ; plusieurs services peuvent partager un front (Clinique). */
function serviceCourant(services: ServiceJeton[]): string | null {
  const ici = services.filter((s) => {
    try {
      return !!s.baseUrl && new URL(s.baseUrl).origin === window.location.origin;
    } catch {
      return false;
    }
  });
  if (ici.length <= 1) return ici[0]?.serviceId ?? null;
  let demande = new URLSearchParams(window.location.search).get("serviceId");
  if (!demande) {
    try {
      demande = window.localStorage.getItem("selectedServiceId");
    } catch {
      /* stockage inaccessible */
    }
  }
  return ici.find((s) => s.serviceId === demande)?.serviceId ?? ici[0].serviceId;
}

const STYLE_MENU = `
.chu-cs-item{display:block;width:100%;text-align:left;padding:12px 16px;font-size:13px;font-weight:600;color:#374151;background:#fff;border:0;border-bottom:1px solid #f9fafb;cursor:pointer;font-family:inherit}
.chu-cs-item:last-child{border-bottom:0}
.chu-cs-item:hover{background:#CFE9EF;color:#005b82}
.chu-cs-role{display:block;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
`;

export function ActionsCompte({
  className,
  classeLibelle,
  taille = 18,
  icones = false,
}: {
  /** Style d'une ligne du menu du front. */
  className: string;
  classeLibelle?: string;
  taille?: number;
  /** Menu replié ou en-tête : icônes seules. */
  icones?: boolean;
}) {
  const [jeton, setJeton] = useState<string | null>(null);
  const [autres, setAutres] = useState<ServiceJeton[]>([]);
  const [menu, setMenu] = useState<{ gauche: number; bas?: number; haut?: number } | null>(null);
  const bouton = useRef<HTMLButtonElement | null>(null);

  // Lu après montage : le jeton vit dans le navigateur.
  useEffect(() => {
    const j = trouverJeton();
    const services = (j ? charge(j)?.services : null) ?? [];
    const courant = serviceCourant(services);
    const vus = new Set<string>();
    setJeton(j);
    setAutres(
      services.filter((s) => {
        if (s.serviceId === courant || !s.baseUrl || vus.has(s.serviceId)) return false;
        vus.add(s.serviceId);
        return true;
      }),
    );
  }, []);

  if (!jeton) return null;

  const basculer = () => {
    if (menu) return setMenu(null);
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    const gauche = Math.max(8, Math.min(r.left, window.innerWidth - 272));
    setMenu(r.top > window.innerHeight / 2 ? { gauche, bas: window.innerHeight - r.top + 8 } : { gauche, haut: r.bottom + 8 });
  };

  // ?serviceId= : sans lui, un front partagé (Clinique) ouvre le premier service du jeton.
  const aller = (s: ServiceJeton) => {
    const url = new URL(s.baseUrl as string);
    url.searchParams.set("accessToken", jeton);
    url.searchParams.set("serviceId", s.serviceId);
    window.location.href = url.toString();
  };

  const icone = (chemin: React.ReactNode) => (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {chemin}
    </svg>
  );

  return (
    <>
      <button
        type="button"
        className={className}
        title="Notifications"
        aria-label="Notifications"
        onClick={() => window.dispatchEvent(new Event("chu-notifications-ouvrir"))}
      >
        {icone(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>)}
        {!icones && <span className={classeLibelle}>Notifications</span>}
      </button>
      {autres.length > 0 && (
        <button ref={bouton} type="button" className={className} title="Changer de service" aria-label="Changer de service" aria-expanded={!!menu} onClick={basculer}>
          {icone(<><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>)}
          {!icones && <span className={classeLibelle}>Changer de service</span>}
        </button>
      )}
      {menu &&
        createPortal(
          <>
            <style>{STYLE_MENU}</style>
            <div style={{ position: "fixed", inset: 0, zIndex: 2147483646 }} onClick={() => setMenu(null)} />
            <div
              style={{
                position: "fixed",
                left: menu.gauche,
                bottom: menu.bas,
                top: menu.haut,
                width: 256,
                maxHeight: "60vh",
                overflowY: "auto",
                background: "#fff",
                border: "1px solid #f3f4f6",
                borderRadius: 12,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,.25)",
                zIndex: 2147483647,
              }}
            >
              {autres.map((s) => (
                <button key={s.serviceId} type="button" className="chu-cs-item" onClick={() => aller(s)}>
                  {s.serviceName ?? "Service"}
                  {s.roleName ? <span className="chu-cs-role">{s.roleName}</span> : null}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/** À côté de la cloche du service : non lues des autres services, ouvre le centre commun. */
export function PastilleAutresServices() {
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    const lire = () => setNombre((window as unknown as { __chuNotifAutres?: number }).__chuNotifAutres ?? 0);
    lire();
    window.addEventListener("chu-notifications-autres", lire);
    return () => window.removeEventListener("chu-notifications-autres", lire);
  }, []);

  if (nombre === 0) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("chu-notifications-ouvrir"))}
      title="Voir les notifications de mes autres services"
      style={{
        whiteSpace: "nowrap",
        border: 0,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "inherit",
        color: "#fff",
        background: "#dc2626",
        cursor: "pointer",
      }}
    >
      {nombre > 99 ? "99+" : nombre} autre{nombre > 1 ? "s" : ""} service{nombre > 1 ? "s" : ""}
    </button>
  );
}
