'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { setSelectedServiceId } from '@/features/prescription/platform/session-store'
import { obtenirSessionValide } from '@/lib/auth/central-session'

/**
 * Prépare le module commun de prescription (celui de la consultation externe, « modèle de
 * Tovo ») pour le bloc : le service actif du module est celui d'Anesthésie-Réanimation, lu
 * dans la session du bloc — un agent qui a plusieurs services prescrit bien au nom du bloc.
 */
export default function ModulePrescriptionBloc({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false)
  useEffect(() => {
    const serviceId = obtenirSessionValide()?.acces.serviceId
    if (serviceId) setSelectedServiceId(serviceId)
    setPret(true)
  }, [])
  return pret ? <>{children}</> : null
}
