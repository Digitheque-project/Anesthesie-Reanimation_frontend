'use client';

import { useEffect, useRef } from 'react';

// Les listes "à traiter" (Fil de travail, Prescriptions, Programme opératoire...) ne se
// rafraîchissent qu'au montage — un rafraîchissement périodique avait déjà été essayé puis
// retiré (il faisait clignoter/réordonner la liste sans que l'utilisateur l'ait demandé, voir
// app/bloc/notification-cpa/page.tsx). Mais sans AUCUN rafraîchissement, un patient traité
// (CPA validée, RDV planifié, vérification veille faite...) dans un autre onglet, ou via le
// cache de navigation du routeur Next.js (retour arrière qui restaure la page sans la
// remonter), reste visible dans la liste alors qu'il ne devrait plus y être — l'utilisateur ne
// voit son vrai statut qu'après un F5 manuel.
//
// Compromis : on ne re-fetch QUE quand l'onglet redevient visible/actif (changement d'onglet,
// retour sur la fenêtre, navigation arrière) — jamais en arrière-plan, jamais en boucle. Aucune
// mutation n'est déclenchée ici : on relit simplement l'état réel côté serveur, qui n'a changé
// que si une vraie validation a eu lieu ailleurs (entrer puis quitter un écran de traitement
// sans valider ne modifie aucun statut, donc un re-fetch dans ce cas ne change rien à la liste).
export function useRefetchOnFocus(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const surReprise = () => {
      if (document.visibilityState === 'visible') callbackRef.current();
    };
    window.addEventListener('focus', surReprise);
    document.addEventListener('visibilitychange', surReprise);
    return () => {
      window.removeEventListener('focus', surReprise);
      document.removeEventListener('visibilitychange', surReprise);
    };
  }, []);
}
