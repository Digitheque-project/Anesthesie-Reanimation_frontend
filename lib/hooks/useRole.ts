'use client'

import { useEffect, useState } from 'react'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import { RoleClinique, matchRoleClinique } from '@/lib/auth/role-clinique'

// Résout le rôle clinique de l'utilisateur connecté depuis la session SSO centrale (pas de
// fetch réseau, tout est déjà dans le token décodé côté client).
export function useRole() {
  const [roleName, setRoleName] = useState<string | null>(null)

  useEffect(() => {
    const session = obtenirSessionValide()
    setRoleName(session?.acces.roleName || null)
  }, [])

  const role = matchRoleClinique(roleName)

  return {
    roleName,
    role,
    estResponsableCpa: role === RoleClinique.RESPONSABLE_CPA,
    estAnesthesiste: role === RoleClinique.ANESTHESISTE,
    estChirurgien: role === RoleClinique.CHIRURGIEN,
    estIbode: role === RoleClinique.IBODE,
    estMajor: role === RoleClinique.MAJOR,
    // Planifier un RDV CPA : Responsable CPA, Major ou Anesthésiste (miroir de
    // @RequireRoleClinique sur POST /planning/reserver, PATCH /notifications-cpa/:id/planifier
    // et PATCH /demandes-cpa-externes/:id/planifier côté backend).
    peutPlanifierCpa:
      role === RoleClinique.RESPONSABLE_CPA ||
      role === RoleClinique.MAJOR ||
      role === RoleClinique.ANESTHESISTE,
    peutGererCreneaux: role === RoleClinique.MAJOR,
    peutValiderSortieReveil: role === RoleClinique.ANESTHESISTE,
    // Check-list après intervention (Sign Out OMS) : réservée à l'anesthésiste, miroir de
    // @RequireRoleClinique sur POST /checklists-apres-op côté backend.
    peutValiderChecklistApresOp: role === RoleClinique.ANESTHESISTE,
    // Saisir l'examen clinique CPA et décider APTE/INAPTE/REPORT : Anesthésiste, Responsable
    // CPA ou Major (miroir de @RequireRoleClinique sur POST/PATCH /cpa côté backend).
    peutDeciderAptitudeCpa:
      role === RoleClinique.ANESTHESISTE || role === RoleClinique.RESPONSABLE_CPA || role === RoleClinique.MAJOR,
    // Distingue l'anesthésiste connecté (auto-attribué depuis sa session) d'un Responsable
    // CPA/Major qui doit désigner explicitement l'anesthésiste ayant réalisé la consultation.
    estAnesthesisteConnecte: role === RoleClinique.ANESTHESISTE,
  }
}
