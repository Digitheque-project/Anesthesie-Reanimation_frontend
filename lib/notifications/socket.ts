import { io, Socket } from 'socket.io-client'
import { NOTIFICATION_WS_URL } from '@/lib/gateway'
import { obtenirSessionValide } from '@/lib/auth/central-session'

export interface NotificationTempsReel {
  id?: string
  title: string
  message: string
  type: string
  source: string
  data?: Record<string, unknown>
  createdAt?: string
}

let socket: Socket | null = null

// Connexion unique (partagée) au service central de notifications temps réel, filtrée sur
// notre serviceId. Le serveur pousse un évènement "notification" pour chaque appel à
// POST /notifications/service ciblant ce serviceId.
// serviceId n'est plus une variable d'environnement (NEXT_PUBLIC_SERVICE_ID pouvait devenir
// périmée sans redéploiement) : lu depuis le token de l'utilisateur déjà connecté à la place —
// voir lib/auth/central-session.ts, qui le résout par NOM (stable) plutôt que par id.
export function connecterNotificationsTempsReel(): Socket | null {
  if (typeof window === 'undefined' || !NOTIFICATION_WS_URL) return null
  const session = obtenirSessionValide()
  if (!session) return null
  if (socket?.connected) return socket

  socket = io(`${NOTIFICATION_WS_URL}/notifications`, {
    query: { serviceId: session.acces.serviceId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 3000,
  })

  return socket
}

export function deconnecterNotificationsTempsReel() {
  socket?.disconnect()
  socket = null
}
