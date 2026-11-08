'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { navItems } from '@/components/bloc/layout/Sidebar'
import { RoleClinique } from '@/lib/auth/role-clinique'
import { useRole } from '@/lib/hooks/useRole'
import { demarrerAlarmeRepetee } from '@/lib/notifications/sound'
import { formaterNomPatient } from '@/lib/patient'
import { estEchue, modifierSurveillance, useSurveillances, type Surveillance } from '@/lib/surveillance/etat'
import { Icone } from '@/components/ui/Icone'

const ROLES_SILENCE = [RoleClinique.ANESTHESISTE, RoleClinique.IBODE, RoleClinique.MAJOR]

export const lienSurveillance = (s: Surveillance) =>
  `${s.statut === 'EN_SALLE_REVEIL' ? '/bloc/salle-de-reveil/suivi' : '/bloc/activite-pendant-operation'}?patientId=${encodeURIComponent(s.patientId)}`

export const lieuSurveillance = (s: Surveillance) => (s.statut === 'EN_SALLE_REVEIL' ? 'Salle de réveil' : 'En opération')

/** Surveillances échues pour le rôle connecté : celles des écrans auxquels il a accès. */
export function useSurveillancesEchues() {
  const { role } = useRole()
  const surveillances = useSurveillances()
  if (!role) return []
  return surveillances.filter((s) => {
    const rubrique = s.statut === 'EN_SALLE_REVEIL' ? '/bloc/salle-de-reveil' : '/bloc/patient-du-jour'
    return estEchue(s) && !navItems.find((i) => i.href === rubrique)?.rolesExclus?.includes(role)
  })
}

// Montée dans le cadre du Bloc : sonne et alerte sur toutes les pages, pas seulement sur l'écran
// du patient, jusqu'à la nouvelle mesure ou au silence.
export default function AlarmeSurveillance() {
  const router = useRouter()
  const { role } = useRole()
  const echues = useSurveillancesEchues()
  const sonne = echues.length > 0

  useEffect(() => {
    if (!sonne) return
    return demarrerAlarmeRepetee()
  }, [sonne])

  if (!sonne) return null

  return (
    <div className="sticky top-16 z-30 space-y-1 border-b border-red-200 bg-red-50 px-4 py-2" role="alert">
      {echues.map((s) => (
        <div key={s.activiteId} className="flex flex-wrap items-center gap-3">
          <Icone nom="notifications_active" className="text-[18px] text-red-600" />
          <p className="min-w-[220px] flex-1 text-[13px] font-bold text-red-800">
            Surveillance à faire — {formaterNomPatient(s)} ({lieuSurveillance(s)})
          </p>
          <button type="button" onClick={() => router.push(lienSurveillance(s))} className="rounded-lg bg-red-600 px-3 py-1 text-[12px] font-bold text-white hover:bg-red-700">
            Ouvrir
          </button>
          {role && ROLES_SILENCE.includes(role) && (
            <button
              type="button"
              onClick={() => modifierSurveillance(s.activiteId, { acquitter: true }).catch(console.error)}
              className="rounded-lg border border-red-300 bg-white px-3 py-1 text-[12px] font-bold text-red-700 hover:bg-red-100"
            >
              Silencer
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
