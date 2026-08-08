interface LigneUrgence {
  priorite: 'TRES_URGENT' | 'URGENT' | 'NORMAL'
}

export interface SectionResume {
  titre: string
  icon: string
  accent: 'primary' | 'secondary' | 'tertiary' | 'quaternary'
  lignes: LigneUrgence[]
}

interface EtatGlobalProps {
  sections: SectionResume[]
  loading?: boolean
}

const ACCENTS: Record<string, { bg: string; text: string; iconWrap: string }> = {
  primary: { bg: 'bg-primary/5', text: 'text-primary', iconWrap: 'bg-primary/10 text-primary' },
  secondary: { bg: 'bg-secondary/5', text: 'text-secondary', iconWrap: 'bg-secondary/10 text-secondary' },
  tertiary: { bg: 'bg-tertiary/5', text: 'text-tertiary', iconWrap: 'bg-tertiary/10 text-tertiary' },
  quaternary: { bg: 'bg-amber-50', text: 'text-amber-700', iconWrap: 'bg-amber-100 text-amber-700' },
}

// Un résumé par table (Prescription / CPA / Bloc / Salle de réveil) au lieu d'un seul total
// global — chacun reprend le compte par niveau d'urgence de la table correspondante plus bas
// sur le tableau de bord.
export default function EtatGlobalPatients({ sections, loading }: EtatGlobalProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {sections.map((section) => {
        const tresUrgent = section.lignes.filter((l) => l.priorite === 'TRES_URGENT').length
        const urgent = section.lignes.filter((l) => l.priorite === 'URGENT').length
        const normal = section.lignes.filter((l) => l.priorite === 'NORMAL').length
        const total = section.lignes.length
        const c = ACCENTS[section.accent]

        return (
          <div key={section.titre} className="bg-white rounded-xl shadow-sm border border-outline-variant/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconWrap}`}>
                <span className="material-symbols-outlined text-lg">{section.icon}</span>
              </span>
              <h4 className={`text-[11px] font-extrabold uppercase tracking-wider ${c.text}`}>{section.titre}</h4>
            </div>

            <p className="text-4xl font-black text-on-surface tracking-tighter mb-4">
              {loading ? '…' : total.toString().padStart(2, '0')}
            </p>

            <div className="space-y-1.5 pt-3 border-t border-slate-50">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600" />Très urgent</span>
                <span className="text-on-surface">{tresUrgent.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Urgent</span>
                <span className="text-on-surface">{urgent.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" />Normal</span>
                <span className="text-on-surface">{normal.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
