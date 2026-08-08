'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  decoderToken,
  estExpire,
  trouverAccesService,
  stockerToken,
  obtenirSessionValide,
  redirigerVersLogin,
} from '@/lib/auth/central-session'

// Aucun utilisateur ne doit pouvoir accéder à l'application sans être passé par le
// portail de connexion central. Ce composant :
// 1. Capture le ?accessToken=... déposé par le portail lors de la redirection post-login
// 2. Valide qu'il donne bien accès à CE service et n'est pas expiré
// 3. Sinon, renvoie immédiatement vers le portail de connexion central
export default function AuthGate({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenDansUrl = params.get('accessToken')

    if (tokenDansUrl) {
      const payload = decoderToken(tokenDansUrl)
      if (payload && !estExpire(payload) && trouverAccesService(payload)) {
        stockerToken(tokenDansUrl)
        params.delete('accessToken')
        const reste = params.toString()
        router.replace(reste ? `${pathname}?${reste}` : pathname)
        setPret(true)
        return
      }
      redirigerVersLogin()
      return
    }

    if (obtenirSessionValide()) {
      setPret(true)
    } else {
      redirigerVersLogin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!pret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant font-medium">Vérification de la session…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
