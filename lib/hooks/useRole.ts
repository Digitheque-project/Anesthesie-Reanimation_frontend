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

  // Le Major remplace totalement l'anesthésiste (même rôle clinique, décision validée) : toutes
  // les capacités réservées à l'anesthésiste lui sont aussi ouvertes — miroir de
  // agitCommeAnesthesiste côté backend. Son identité reste MAJOR (traçabilité), il n'est jamais
  // « promu » en ANESTHESISTE.
  const agitCommeAnesthesiste =
    role === RoleClinique.ANESTHESISTE || role === RoleClinique.MAJOR

  return {
    roleName,
    role,
    estResponsableCpa: role === RoleClinique.RESPONSABLE_CPA,
    estAnesthesiste: agitCommeAnesthesiste,
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
    peutValiderSortieReveil: agitCommeAnesthesiste,
    // Check-list après intervention (Sign Out OMS) : réservée à l'anesthésiste (et au Major qui
    // le remplace), miroir de @RequireRoleClinique sur POST /checklists-apres-op côté backend.
    peutValiderChecklistApresOp: agitCommeAnesthesiste,
    // Saisir l'examen clinique CPA et décider APTE/INAPTE/REPORT : Anesthésiste, Responsable
    // CPA ou Major (miroir de @RequireRoleClinique sur POST/PATCH /cpa côté backend).
    peutDeciderAptitudeCpa:
      role === RoleClinique.ANESTHESISTE || role === RoleClinique.RESPONSABLE_CPA || role === RoleClinique.MAJOR,
    // Anesthésiste connecté (ou Major qui le remplace) : auto-attribué comme anesthésiste depuis
    // sa session. Seul le Responsable CPA doit désigner explicitement l'anesthésiste ayant
    // réalisé la consultation.
    estAnesthesisteConnecte: agitCommeAnesthesiste,
  }
}
