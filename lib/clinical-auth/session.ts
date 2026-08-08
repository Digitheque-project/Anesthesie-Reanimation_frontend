import { obtenirSessionValide } from '@/lib/auth/central-session'

// Équivalent (non-hook) de getActiveSession() (front-clinique/src/lib/auth/session-store.ts),
// pour les fichiers portés qui l'appellent hors composant React (ex. PrescriptionModule.tsx
// dans un useMemo).
export interface ActiveSession {
  claims: { userId: string; name: string; firstname: string; email: string }
  currentService: { serviceId: string; serviceName: string; roleName: string } | null
  chuId: string | null
}

export function getActiveSession(): ActiveSession | null {
  const session = obtenirSessionValide()
  if (!session) return null
  const { payload, acces } = session
  return {
    claims: { userId: payload.userId, name: payload.name, firstname: payload.firstname, email: payload.email },
    currentService: { serviceId: acces.serviceId, serviceName: acces.serviceName, roleName: acces.roleName },
    chuId: acces.chu?.id ?? null,
  }
}
