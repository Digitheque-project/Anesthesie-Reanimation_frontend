import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL || ''
const SERVICE_ID = process.env.NEXT_PUBLIC_SERVICE_ID || ''

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
export function connecterNotificationsTempsReel(): Socket | null {
  if (typeof window === 'undefined' || !SERVICE_ID || !WS_URL) return null
  if (socket?.connected) return socket

  socket = io(`${WS_URL}/notifications`, {
    query: { serviceId: SERVICE_ID },
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
