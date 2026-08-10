'use client';

import { useEffect, useRef } from 'react';
import { connecterNotificationsTempsReel } from '@/lib/notifications/socket';

// Rafraîchit une liste "à traiter" dès qu'un évènement temps réel arrive sur le canal partagé
// (même WebSocket que la cloche de notifications) — CPA validée, RDV planifié, vérification
// veille faite, nouvelle prescription... Ne déclenche jamais aucune mutation : on relit
// simplement l'état réel côté serveur, en plus (pas à la place) de useRefetchOnFocus qui reste
// le filet de secours si la connexion WebSocket est momentanément coupée.
export function useRefetchOnRealtimeUpdate(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const socket = connecterNotificationsTempsReel();
    if (!socket) return;

    const onNotification = () => callbackRef.current();
    socket.on('notification', onNotification);
    return () => { socket.off('notification', onNotification); };
  }, []);
}
