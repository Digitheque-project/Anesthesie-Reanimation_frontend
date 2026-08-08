'use client'

import { useRouter } from 'next/navigation'
import { libelleUrgence, styleUrgence } from '@/lib/urgence'

export interface LignePlanning {
  priorite: 'TRES_URGENT' | 'URGENT' | 'NORMAL'
  nom: string
  intervention: string
  responsable?: string
  heure?: string
  actionLabel: string
  href: string
  actionLabel2?: string
  href2?: string
}

interface GroupePlanningTableProps {
  icon: string
  titre: string
  accent: 'primary' | 'secondary' | 'tertiary' | 'quaternary'
  lignes: LignePlanning[]
  loading?: boolean
  emptyMessage: string
}

const ACCENTS: Record<string, { headerBg: string; text: string; badge: string; actionBg: string }> = {
  primary: { headerBg: 'bg-primary/5', text: 'text-primary', badge: 'bg-primary text-on-primary', actionBg: 'bg-primary/5 hover:bg-primary/10' },
  secondary: { headerBg: 'bg-secondary/5', text: 'text-secondary', badge: 'bg-secondary text-on-secondary', actionBg: 'bg-secondary/5 hover:bg-secondary/10' },
  tertiary: { headerBg: 'bg-tertiary/5', text: 'text-tertiary', badge: 'bg-tertiary text-on-tertiary', actionBg: 'bg-tertiary/5 hover:bg-tertiary/10' },
  quaternary: { headerBg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-600 text-white', actionBg: 'bg-amber-50 hover:bg-amber-100' },
}

export default function GroupePlanningTable({ icon, titre, accent, lignes, loading, emptyMessage }: GroupePlanningTableProps) {
  const router = useRouter()
  const c = ACCENTS[accent]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
      <div className={`${c.headerBg} px-6 py-3 border-b border-outline-variant/10 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined ${c.text}`}>{icon}</span>
          <h3 className={`font-bold ${c.text} text-sm uppercase tracking-widest`}>{titre}</h3>
        </div>
        <span className={`${c.badge} px-2 py-0.5 rounded text-[10px] font-bold`}>
          {loading ? '…' : `${lignes.length} patient${lignes.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-on-surface-variant px-6 py-6">Chargement...</p>
      ) : lignes.length === 0 ? (
        <p className="text-xs text-on-surface-variant px-6 py-6">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-3">Priorité</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Intervention</th>
                <th className="px-6 py-3">Responsable</th>
                <th className="px-6 py-3">Heure</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {lignes.map((l, i) => (
                <tr key={i} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <span className={`${styleUrgence(l.priorite).fondPlein} text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase`}>{libelleUrgence(l.priorite)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <b className="text-on-surface">{l.nom}</b>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{l.intervention || '—'}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{l.responsable || '—'}</td>
                  <td className={`px-6 py-4 font-bold ${l.priorite === 'NORMAL' ? 'text-on-surface' : styleUrgence(l.priorite).texte}`}>
                    {l.heure || '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => router.push(l.href)}
                      className={`${c.text} ${c.actionBg} px-3 py-1 rounded-lg text-[10px] font-bold transition-colors`}>
                      {l.actionLabel}
                    </button>
                    {l.href2 && (
                      <button onClick={() => router.push(l.href2!)}
                        className="text-on-surface-variant bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors border border-outline-variant/20">
                        {l.actionLabel2}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
