'use client'

import { useEffect, useRef, useState } from 'react'
import { demarrerAlarmeRepetee } from '@/lib/notifications/sound'

// Alarme de surveillance locale au poste (pas synchronisée réseau — chaque professionnel gère
// sa propre surveillance). Intervalle configurable (défaut 5 min), calculé par un setTimeout
// recalculé depuis le dernier acquittement plutôt qu'un compteur qui dérive.
export function useSurveillanceAlarm(intervalMinDefaut = 5) {
  const [intervalMin, setIntervalMin] = useState(intervalMinDefaut)
  const [actif, setActif] = useState(true)
  const [sonne, setSonne] = useState(false)
  const [dernierAckAt, setDernierAckAt] = useState<number>(() => Date.now())
  const arreterSonnerie = useRef<() => void>(() => {})

  useEffect(() => {
    if (!actif) return
    const delai = Math.max(dernierAckAt + intervalMin * 60_000 - Date.now(), 0)
    const timeout = setTimeout(() => {
      setSonne(true)
      arreterSonnerie.current = demarrerAlarmeRepetee()
    }, delai)
    return () => clearTimeout(timeout)
  }, [actif, intervalMin, dernierAckAt])

  useEffect(() => () => arreterSonnerie.current(), [])

  const acquitter = () => {
    arreterSonnerie.current()
    setSonne(false)
    setDernierAckAt(Date.now())
  }

  const demarrer = () => {
    setActif(true)
    setDernierAckAt(Date.now())
  }

  const arreter = () => {
    arreterSonnerie.current()
    setSonne(false)
    setActif(false)
  }

  return { intervalMin, setIntervalMin, actif, sonne, acquitter, demarrer, arreter }
}
