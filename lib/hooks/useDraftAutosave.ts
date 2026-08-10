'use client';

import { useEffect } from 'react';

export interface Brouillon<T> {
  savedAt: number;
  data: T;
}

// Persiste un instantané de formulaire dans le localStorage du navigateur — filet de sécurité
// contre une coupure de courant, un crash ou une fermeture accidentelle de l'onglet en pleine
// saisie d'un formulaire long (CPA, vérification veille...). Écriture debouncée (pas à chaque
// frappe), et purement locale : aucun appel réseau, donc ça fonctionne même hors-ligne — la
// perte de connexion n'efface jamais ce qui a déjà été tapé.
export function useDraftAutosave<T>(
  storageKey: string | null,
  data: T,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const { enabled = true, debounceMs = 800 } = options ?? {};
  const signature = JSON.stringify(data);

  useEffect(() => {
    if (!storageKey || !enabled || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        const brouillon: Brouillon<T> = { savedAt: Date.now(), data: JSON.parse(signature) };
        window.localStorage.setItem(storageKey, JSON.stringify(brouillon));
      } catch {
        // Quota dépassé ou stockage indisponible (navigation privée stricte...) : la saisie en
        // cours continue normalement, seul le filet de secours est indisponible.
      }
    }, debounceMs);
    return () => clearTimeout(timer);
    // signature (JSON du contenu, pas la référence de l'objet) est la seule dépendance qui doit
    // vraiment redéclencher la sauvegarde — reconstruire `data` à chaque rendu ne doit pas
    // réarmer le minuteur indéfiniment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled, debounceMs, signature]);
}

export function chargerBrouillon<T>(storageKey: string): Brouillon<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as Brouillon<T>;
  } catch {
    return null;
  }
}

export function effacerBrouillon(storageKey: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}
