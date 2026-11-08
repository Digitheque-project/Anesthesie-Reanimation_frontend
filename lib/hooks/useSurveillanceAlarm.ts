'use client'

import { useCallback } from 'react'
import { estEchue, modifierSurveillance, rafraichirSurveillances, useSurveillances } from '@/lib/surveillance/etat'

// Réglages et état d'UNE surveillance, partagés par tous les postes (enregistrés au serveur).
// La sonnerie elle-même est jouée sur toutes les pages par AlarmeSurveillance.
export function useSurveillanceAlarm(activiteId: string | null) {
  const s = useSurveillances().find((x) => x.activiteId === activiteId)

  const modifier = useCallback(
    (modif: Parameters<typeof modifierSurveillance>[1]) => {
      if (activiteId) modifierSurveillance(activiteId, modif).catch(console.error)
    },
    [activiteId],
  )

  return {
    intervalMin: s?.intervalleMin ?? 5,
    setIntervalMin: (intervalleMin: number) => modifier({ intervalleMin }),
    actif: s?.active ?? true,
    sonne: !!s && estEchue(s),
    acquitter: () => modifier({ acquitter: true }),
    demarrer: () => modifier({ active: true }),
    arreter: () => modifier({ active: false }),
    rafraichir: () => void rafraichirSurveillances(),
  }
}
