"use client";

import { useEffect, useState } from "react";

/**
 * Logo du CHU (services[].chu.logoUrl du jeton). Le service des fichiers exige
 * le jeton : une simple balise <img src=…> reçoit un 401 et affiche une image
 * cassée. On télécharge donc l'image avec le jeton et on renvoie une adresse
 * blob: locale ; null tant qu'elle n'est pas chargée ou si elle est absente.
 */
export function useLogoAuthentifie(url?: string | null, jeton?: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      return;
    }
    if (/^(data:|blob:)/i.test(url)) {
      setSrc(url);
      return;
    }
    // Sans jeton, le service des fichiers répond 401 : on attend qu'il soit lu.
    if (!jeton) {
      setSrc(null);
      return;
    }
    let objet: string | null = null;
    let annule = false;
    fetch(url, { headers: { Authorization: `Bearer ${jeton}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        if (annule) return;
        objet = URL.createObjectURL(b);
        setSrc(objet);
      })
      .catch(() => {
        if (!annule) setSrc(null);
      });
    return () => {
      annule = true;
      if (objet) URL.revokeObjectURL(objet);
    };
  }, [url, jeton]);

  return src;
}
