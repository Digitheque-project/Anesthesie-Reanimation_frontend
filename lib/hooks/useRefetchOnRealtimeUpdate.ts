'use client';

import { useEffect, useRef } from 'react';
import { connecterNotificationsTempsReel } from '@/lib/notifications/socket';

// Rafraîchit une liste "à traiter" dès qu'un évènement temps réel arrive sur le canal partagé
// (même WebSocket que la cloche de notifications) — CPA validée, RDV planifié, vérification
// veille faite, nouvelle prescription... Ne déclenche jamais aucune mutation : on relit
// simplement l'état réel côté serveur, en plus (pas à la place) de useRefetchOnFocus qui reste
// le filet de secours si la connexion WebSocket est momentanément coupée.
//
// Filet anti-rafale : le service Prescriptions (source de test en particulier) peut émettre une
// pluie de `new_prescription` (~1/s), et le service Notification re-diffuse aussi chaque
// évènement reçu. Sans garde, chaque évènement déclencherait un rechargement (liste + loading)
// à chaque seconde. On ne recharge donc qu'une seule fois par petite fenêtre (debounce), et on
// ignore purement et simplement les évènements déjà vus (même notificationId) pour ne pas
// recharger deux fois pour le même fait.
const REFETCH_DEBOUNCE_MS = 3000;

export function useRefetchOnRealtimeUpdate(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const socket = connecterNotificationsTempsReel();
    if (!socket) return;

    const idsDejaVus = new Set<string>();
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

    const recharger = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current();
      }, REFETCH_DEBOUNCE_MS);
    };

    const onNotification = (notif: any) => {
      const id = notif?.id || notif?.data?.notificationId;
      if (id) {
        if (idsDejaVus.has(id)) return;
        idsDejaVus.add(id);
        // Set borné : on ne garde que les ids récents, pour ne pas grossir sans limite.
        if (idsDejaVus.size > 1000) {
          const premier = idsDejaVus.values().next().value;
          if (premier) idsDejaVus.delete(premier);
        }
      }
      recharger();
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
