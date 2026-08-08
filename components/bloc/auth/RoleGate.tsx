'use client'

import { ReactNode } from 'react'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import { RoleClinique, matchRoleClinique } from '@/lib/auth/role-clinique'

interface RoleGateProps {
  allowedRoles: RoleClinique[]
  message?: string
  children: ReactNode
}

// Bloque l'accès à une page entière (pas juste un bouton) pour les rôles qui n'en ont pas
// besoin dans leur métier — ex. le Chirurgien ne doit pas voir la CPA. À placer à l'intérieur
// d'AuthGate (donc après résolution de la session), pas avant : ce composant lit la session
// de façon synchrone au rendu (pas d'effet), en confiance sur le fait qu'AuthGate n'a laissé
// passer que des sessions valides.
export default function RoleGate({ allowedRoles, message, children }: RoleGateProps) {
  const session = typeof window !== 'undefined' ? obtenirSessionValide() : null
  const role = matchRoleClinique(session?.acces.roleName)

  if (role && allowedRoles.includes(role)) {
    return <>{children}</>
  }

  return (
    <main className="p-4">
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-xl border shadow-sm p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-amber-500 mb-3 block">block</span>
        <h1 className="text-xl font-extrabold text-on-surface mb-2">Accès non autorisé</h1>
        <p className="text-sm text-on-surface-variant">
          {message || "Cette page n'est pas accessible pour votre rôle."}
          {session?.acces.roleName ? ` (votre rôle : ${session.acces.roleName})` : ''}
        </p>
      </div>
    </main>
  )
}
