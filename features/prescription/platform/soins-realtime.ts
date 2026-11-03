"use client";

import { io, type Socket } from "socket.io-client";
import { gatewayUrl } from "./gateway";

// Origine de la passerelle (le socket des prescriptions y est relayé).
const PRESCRIPTION_API_URL = gatewayUrl();
import { getActiveSession } from "@/features/prescription/platform/session-store";

/**
 * Temps réel des soins / traitements, SANS aucun rafraîchissement périodique.
 *
 * Trois canaux complémentaires, tous événementiels :
 *   1. WebSocket (socket.io) sur le namespace "/notifications" déjà exposé par
 *      l'API prescription : propage l'événement aux AUTRES utilisateurs du
 *      même service (le serveur rediffuse dans la room `service:<id>`).
 *   2. BroadcastChannel : propage l'événement aux autres onglets du même
 *      navigateur, même si le socket n'est pas disponible.
 *   3. Événement DOM : met à jour instantanément les composants de l'onglet
 *      courant (compteur du plan de lit, aperçu rapide, soin/traitement).
 *
 * Une seule capture de retard est faite au retour de l'onglet au premier plan
 * (visibilitychange), ce qui évite tout polling tout en restant cohérent après
 * une perte de connexion.
 */

export type SoinsMajDetail = {
  /** Patient concerné (si connu) : permet de ne recharger que ce qu'il faut. */
  patientId?: string;
  serviceId?: string;
  /** "validation" | "arret" | "terminaison" | ... (informatif) */
  reason?: string;
};

export const SOINS_MAJ_EVENT = "clinical:soins-updated";

const CHANNEL_NAME = "clinical-soins";
const SOCKET_EVENT_IN = "soins.updated";
const SOCKET_EVENT_OUT = "soins:updated";
// Alerte d'execution diffusee par le back 5 min avant chaque echeance.
const SOCKET_EVENT_RAPPEL = "soin.rappel";

let channel: BroadcastChannel | null = null;
let socket: Socket | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (socket) return socket;
  try {
    const session: any = getActiveSession();
    socket = io(`${PRESCRIPTION_API_URL}/notifications`, {
      transports: ["websocket"],
      query: {
        service: session?.serviceId || "",
        userId: session?.claims?.userId || "",
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  } catch {
    socket = null;
  }
  return socket;
}

/**
 * À appeler après toute modification d'un soin / traitement : validation,
 * arrêt d'un soin, terminaison d'une prescription.
 */
export function notifierMajSoins(detail: SoinsMajDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SOINS_MAJ_EVENT, { detail }));
  try {
    getChannel()?.postMessage(detail);
  } catch {
    /* canal indisponible : les autres canaux suffisent */
  }
  try {
    getSocket()?.emit(SOCKET_EVENT_OUT, detail);
  } catch {
    /* socket indisponible : l'UI locale est déjà à jour */
  }
}

/**
 * S'abonne aux changements de soins. Retourne la fonction de désabonnement.
 */
export function subscribeSoinsMaj(
  callback: (detail: SoinsMajDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onDom = (event: Event) => {
    callback(((event as CustomEvent)?.detail as SoinsMajDetail) || {});
  };
  window.addEventListener(SOINS_MAJ_EVENT, onDom);

  const chan = getChannel();
  const onMessage = (event: MessageEvent) => {
    callback((event?.data as SoinsMajDetail) || {});
  };
  chan?.addEventListener("message", onMessage);

  const sock = getSocket();
  const onSocket = (payload: SoinsMajDetail) => callback(payload || {});
  sock?.on(SOCKET_EVENT_IN, onSocket);

  // Rattrapage unique au retour de l'onglet au premier plan (pas de polling).
  const onVisible = () => {
    if (document.visibilityState === "visible") callback({});
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.removeEventListener(SOINS_MAJ_EVENT, onDom);
    chan?.removeEventListener("message", onMessage);
    sock?.off(SOCKET_EVENT_IN, onSocket);
    document.removeEventListener("visibilitychange", onVisible);
  };
}


/**
 * Alerte "soin imminent" emise par le back 5 minutes avant l'heure prevue.
 *
 * Contrairement a subscribeSoinsMaj, il n'y a ni BroadcastChannel ni evenement
 * DOM : l'alerte vient uniquement du serveur, qui la diffuse a la room du
 * service. Le composant SoinRappelAlerte l'affiche en popup (3 s) avec un son
 * different de celui des notifications.
 */
export type SoinRappelDetail = {
  priseId?: string;
  patientId?: string;
  categorie?: string;
  libelle?: string;
  dose?: string | null;
  voie?: string | null;
  /** Heure prevue du soin (ISO). */
  heurePrevue?: string;
  /** Delai restant annonce par le serveur (minutes). */
  dansMinutes?: number;
};

export function subscribeRappelSoin(
  callback: (detail: SoinRappelDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const sock = getSocket();
  const onSocket = (payload: SoinRappelDetail) => callback(payload || {});
  sock?.on(SOCKET_EVENT_RAPPEL, onSocket);

  return () => {
    sock?.off(SOCKET_EVENT_RAPPEL, onSocket);
  };
}
