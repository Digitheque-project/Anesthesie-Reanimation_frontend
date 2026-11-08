'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { connecterNotificationsTempsReel, type NotificationTempsReel } from '@/lib/notifications/socket'

// État des surveillances, UNE source pour tout le front : l'échéance vient du serveur (dernière
// mesure + intervalle), jamais du moment où la page a été ouverte. Chaque poste déclenche au
// même instant, corrigé de l'écart entre son horloge et celle du serveur.

export type Surveillance = {
  activiteId: string
  patientId: string
  statut: string
  intervalleMin: number
  active: boolean
  /** Échéance, en heure locale de ce poste (ms). */
  prochaine: number
  nom?: string | null
  prenom?: string | null
}

const RAFRAICHISSEMENT_MS = 10000

let etat: Surveillance[] = []
let minuterie: ReturnType<typeof setInterval> | null = null
let echeance: ReturnType<typeof setTimeout> | null = null
let retirerSocket: (() => void) | null = null
const abonnes = new Set<() => void>()

const prevenir = () => abonnes.forEach((f) => f())

function programmerEcheance() {
  if (echeance) clearTimeout(echeance)
  echeance = null
  const maintenant = Date.now()
  const futures = etat.filter((s) => s.active && s.prochaine > maintenant).map((s) => s.prochaine)
  if (futures.length) echeance = setTimeout(prevenir, Math.min(...futures) - maintenant + 50)
}

export async function rafraichirSurveillances() {
  try {
    const { data } = await apiClient.get('/activites-per-op/surveillances/etat')
    const ecart = new Date(data.maintenant).getTime() - Date.now()
    etat = (Array.isArray(data.surveillances) ? data.surveillances : []).map((s: any) => ({
      ...s,
      prochaine: new Date(s.prochaine).getTime() - ecart,
    }))
    programmerEcheance()
    prevenir()
  } catch (err) {
    // On garde le dernier état connu : une coupure ne doit pas faire taire une alerte.
    console.error(err)
  }
}

export async function modifierSurveillance(
  activiteId: string,
  modif: { intervalleMin?: number; active?: boolean; acquitter?: boolean },
) {
  await apiClient.patch(`/activites-per-op/${activiteId}/surveillance`, modif)
  await rafraichirSurveillances()
}

function abonner(f: () => void) {
  abonnes.add(f)
  if (abonnes.size === 1) {
    void rafraichirSurveillances()
    minuterie = setInterval(() => void rafraichirSurveillances(), RAFRAICHISSEMENT_MS)
    const socket = connecterNotificationsTempsReel()
    if (socket) {
      const surNotification = (n: NotificationTempsReel) => {
        if (n.type === 'surveillance_echue') void rafraichirSurveillances()
      }
      socket.on('notification', surNotification)
      retirerSocket = () => socket.off('notification', surNotification)
    }
  }
  return () => {
    abonnes.delete(f)
    if (abonnes.size) return
    if (minuterie) clearInterval(minuterie)
    if (echeance) clearTimeout(echeance)
    retirerSocket?.()
    minuterie = echeance = retirerSocket = null
  }
}

export function estEchue(s: Surveillance) {
  return s.active && s.prochaine <= Date.now()
}

export function useSurveillances() {
  const [, setTic] = useState(0)
  useEffect(() => abonner(() => setTic((t) => t + 1)), [])
  return etat
}
