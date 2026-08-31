import { io, Socket } from 'socket.io-client'
import { lireTokenStocke } from '@/lib/auth/central-session'

// Connexion WebSocket dédiée à NOTRE backend (bloc opératoire), distincte de
// lib/notifications/socket.ts qui cible le service de notifications externe. Sert à
// synchroniser en temps réel les postes travaillant sur le même patient pendant l'opération
// (moments opératoires, constantes, checklists).
// Passe désormais par la gateway (NEXT_PUBLIC_GATEWAY_URL, voir lib/gateway.ts), même origine
// que le reste du front — À VÉRIFIER après déploiement : la gateway ne relaie explicitement les
// upgrades WebSocket que pour les services enregistrés avec ws:true (voir services.registry.ts
// côté gateway), et l'entrée "bloc" ne l'a pas encore. Si la connexion échoue, il faudra soit
// ajouter ws:true à cette entrée côté gateway, soit revenir à une URL directe pour ce seul canal.
const API_BASE = process.env.NEXT_PUBLIC_GATEWAY_URL || ''

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
