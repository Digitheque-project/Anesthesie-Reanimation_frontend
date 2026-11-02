'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Repeat } from 'lucide-react'
import { obtenirSessionValide, type ServiceAcces } from '@/lib/auth/central-session'

/**
 * « Changer de service », comme dans la consultation externe : les autres services de
 * l'agent (lus dans son jeton) ; le service cible lit le jeton via ?accessToken=.
 * Affiché seulement si l'agent a accès à au moins deux services.
 */
export default function BoutonChangerService() {
  const [ouvert, setOuvert] = useState(false)
  const [session, setSession] = useState<ReturnType<typeof obtenirSessionValide>>(null)
  // Lu après montage : la session vit dans le navigateur (pas au rendu serveur).
  useEffect(() => setSession(obtenirSessionValide()), [])

  const autres: ServiceAcces[] = (session?.payload.services ?? []).filter(
    (s) => s.serviceId !== session?.acces.serviceId && s.baseUrl,
  )
  if (!session || autres.length === 0) return null

  const aller = (baseUrl: string) => {
    const sep = baseUrl.includes('?') ? '&' : '?'
    window.location.assign(`${baseUrl}${sep}accessToken=${encodeURIComponent(session.token)}`)
  }

  return (
    <div className="relative self-start sm:self-auto">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-[#005b82] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#004a6b]"
      >
        <Repeat className="h-4 w-4" />
        Changer de service
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {ouvert && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOuvert(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl">
            {autres.map((s) => (
              <button
                key={s.serviceId}
                type="button"
                onClick={() => aller(s.baseUrl)}
                className="w-full border-b border-gray-50 px-4 py-3 text-left text-[13px] font-semibold text-gray-700 transition-colors last:border-0 hover:bg-[#CFE9EF] hover:text-[#005b82]"
              >
                {s.serviceName || 'Service'}
                {s.roleName && (
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.roleName}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
