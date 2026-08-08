'use client'

import { useEffect, useMemo, useState } from 'react'
import { obtenirSessionValide } from '@/lib/auth/central-session'

// Équivalent de front-clinique/src/hooks/use-session.ts, adapté à la session centrale de
// blocope-front (lib/auth/central-session.ts). Contrairement à front-clinique, blocope-front
// est un service unique (bloc opératoire) : pas de sélection multi-services via ?serviceId=/
// localStorage — le service actif est toujours celui résolu par obtenirSessionValide().
export interface Session {
  isAuthenticated: boolean
  userId: string | null
  fullName: string | null
  email: string | null
  serviceId: string | null
  chuId: string | null
  roleName: string | null
  permissions: string[]
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (...permissions: string[]) => boolean
  hasAllPermissions: (...permissions: string[]) => boolean
}

const SESSION_VIDE: Session = {
  isAuthenticated: false,
  userId: null,
  fullName: null,
  email: null,
  serviceId: null,
  chuId: null,
  roleName: null,
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
}

export function useSession(): Session {
  const [version, setVersion] = useState(0)

  // obtenirSessionValide() lit localStorage : on ne peut la résoudre qu'après le montage
  // (évite un mismatch SSR/CSR), et on la recalcule si un autre onglet/flow change le token.
  useEffect(() => {
    const onStorage = () => setVersion((v) => v + 1)
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return useMemo<Session>(() => {
    if (typeof window === 'undefined') return SESSION_VIDE
    const session = obtenirSessionValide()
    if (!session) return SESSION_VIDE

    const { payload, acces } = session
    const permissions = acces.permissions || []
    const permissionSet = new Set(permissions)
    const fullName = [payload.name, payload.firstname].filter(Boolean).join(' ').trim() || null

    return {
      isAuthenticated: true,
      userId: payload.userId ?? null,
      fullName,
      email: payload.email ?? null,
      serviceId: acces.serviceId ?? null,
      chuId: acces.chu?.id ?? null,
      roleName: acces.roleName ?? null,
      permissions,
      hasPermission: (permission) => permissionSet.has(permission),
      hasAnyPermission: (...perms) => perms.some((p) => permissionSet.has(p)),
      hasAllPermissions: (...perms) => perms.every((p) => permissionSet.has(p)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
}
