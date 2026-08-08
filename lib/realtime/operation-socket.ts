import { io, Socket } from 'socket.io-client'
import { lireTokenStocke } from '@/lib/auth/central-session'

// Connexion WebSocket dédiée à NOTRE backend (bloc opératoire), distincte de
// lib/notifications/socket.ts qui cible le service de notifications externe. Sert à
// synchroniser en temps réel les postes travaillant sur le même patient pendant l'opération
// (moments opératoires, constantes, checklists).
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const API_BASE = API_URL.replace(/\/bloc\/api\/?$/, '')

let socket: Socket | null = null

export function connecterOperationSocket(): Socket | null {
  if (typeof window === 'undefined' || !API_BASE) return null
  const token = lireTokenStocke()
  if (!token) return null
  if (socket?.connected) return socket

  socket = io(`${API_BASE}/bloc/ws/operation`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 3000,
  })

  return socket
}

export function rejoindreOperation(patientId: string) {
  connecterOperationSocket()?.emit('rejoindre-operation', { patientId })
}

export function quitterOperation(patientId: string) {
  socket?.emit('quitter-operation', { patientId })
}

export function deconnecterOperationSocket() {
  socket?.disconnect()
  socket = null
}
