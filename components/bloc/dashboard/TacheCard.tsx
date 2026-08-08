'use client'

import { useRouter } from 'next/navigation'

export interface TacheItem {
  label: string
  sublabel?: string
  urgent?: boolean
  href?: string
}

interface TacheCardProps {
  icon: string
  titre: string
  count: number
  accent: 'primary' | 'secondary' | 'tertiary' | 'error'
  items: TacheItem[]
  ctaLabel: string
  ctaHref: string
  emptyMessage: string
  loading?: boolean
}

const ACCENTS: Record<string, { bg: string; text: string; badge: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', badge: 'bg-primary text-white' },
  secondary: { bg: 'bg-secondary/10', text: 'text-secondary', badge: 'bg-secondary text-white' },
  tertiary: { bg: 'bg-amber-100', text: 'text-amber-700', badge: 'bg-amber-500 text-white' },
  error: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-600 text-white' },
}

export default function TacheCard({ icon, titre, count, accent, items, ctaLabel, ctaHref, emptyMessage, loading }: TacheCardProps) {
  const router = useRouter()
  const c = ACCENTS[accent]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden">
      <button onClick={() => router.push(ctaHref)} className="flex items-center justify-between p-4 pb-3 text-left hover:bg-surface-container/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <span className={`material-symbols-outlined text-xl ${c.text}`}>{icon}</span>
          </div>
          <h3 className="font-bold text-sm text-on-surface">{titre}</h3>
        </div>
        {!loading && (
          <span className={`min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-extrabold flex items-center justify-center ${count > 0 ? c.badge : 'bg-surface-container text-on-surface-variant'}`}>
            {count}
          </span>
        )}
      </button>

      <div className="px-4 pb-2 flex-1">
        {loading ? (
          <p className="text-xs text-on-surface-variant py-2">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">{emptyMessage}</p>
        ) : (
          <ul className="space-y-1">
            {items.slice(0, 4).map((item, i) => (
              <li key={i} className="border-b border-outline-variant/10 last:border-0">
                <button
                  onClick={() => item.href && router.push(item.href)}
                  disabled={!item.href}
                  className={`w-full flex items-center justify-between gap-2 text-xs py-1.5 rounded-md px-1 -mx-1 text-left transition-colors ${item.href ? 'hover:bg-surface-container/60 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="font-semibold text-on-surface truncate">{item.label}</span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    {item.urgent && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-black uppercase">Urgent</span>}
                    <span className="text-on-surface-variant">{item.sublabel}</span>
                    {item.href && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">chevron_right</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={() => router.push(ctaHref)}
        className={`w-full py-2.5 text-xs font-bold ${c.text} hover:bg-surface-container/50 transition-colors border-t border-outline-variant/10 flex items-center justify-center gap-1`}>
        {ctaLabel} <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </button>
    </div>
  )
}
