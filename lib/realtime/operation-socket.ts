import { io, Socket } from 'socket.io-client'
import { lireTokenStocke } from '@/lib/auth/central-session'

// Connexion WebSocket dédiée à NOTRE backend (bloc opératoire), distincte de
// lib/notifications/socket.ts qui cible le service de notifications externe. Sert à
// synchroniser en temps réel les postes travaillant sur le même patient pendant l'opération
// (moments opératoires, constantes, checklists).
// NEXT_PUBLIC_API_URL est la racine nue du backend (voir lib/api/client.ts, qui y ajoute le
// préfixe HTTP /bloc/api pour ses propres appels) — le WebSocket, lui, se connecte directement à
// la racine, sans ce préfixe.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

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
