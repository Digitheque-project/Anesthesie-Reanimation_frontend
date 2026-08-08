'use client'

import { useCallback, useEffect } from 'react'
import { connecterOperationSocket, rejoindreOperation, quitterOperation } from '@/lib/realtime/operation-socket'

// Rejoint automatiquement la "room" temps réel du patient au montage (quitte au démontage), et
// expose `on(event, handler)` pour s'abonner aux évènements diffusés par le backend
// (moment:cree, constante:ajoutee, checklist-pendant-op:maj, ...). Utilisé par les écrans de
// la phase per-opératoire pour refléter en direct les actions faites depuis un autre poste.
export function useOperationRealtime(patientId: string | undefined) {
  useEffect(() => {
    if (!patientId) return
    rejoindreOperation(patientId)
    return () => quitterOperation(patientId)
  }, [patientId])

  const on = useCallback((event: string, handler: (payload: any) => void) => {
    const socket = connecterOperationSocket()
    socket?.on(event, handler)
    return () => { socket?.off(event, handler) }
  }, [])

  return { on }
}
