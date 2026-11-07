"use client";

import { useSyncExternalStore } from "react";

// Point vert « serveur prêt » / orange « connexion en cours » (comme la
// consultation externe). L'état vient du script chu-etat-serveur du layout,
// qui observe les vraies requêtes de l'appli vers le serveur.
function abonner(rappel: () => void) {
  window.addEventListener("chu-serveur", rappel);
  return () => window.removeEventListener("chu-serveur", rappel);
}

function lire(): boolean {
  return !!(window as unknown as { __chuServeur?: { pret: boolean } }).__chuServeur?.pret;
}

export default function PointServeur({ className = "" }: { className?: string }) {
  const pret = useSyncExternalStore(abonner, lire, () => false);
  return (
    <span
      title={pret ? "Serveur prêt" : "Connexion au serveur en cours..."}
      aria-label={pret ? "Serveur prêt" : "Connexion au serveur en cours"}
      className={className}
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: 9999,
        flexShrink: 0,
        verticalAlign: "middle",
        marginRight: 6,
        background: pret ? "#10b981" : "#fb923c",
        boxShadow: "0 0 0 2px #fff",
      }}
    />
  );
}
