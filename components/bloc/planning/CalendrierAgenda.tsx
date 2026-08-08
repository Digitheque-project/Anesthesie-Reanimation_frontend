'use client'

import { useEffect, useRef, useState } from 'react'
import { planningService } from '@/lib/api'
import { obtenirSessionValide } from '@/lib/auth/central-session'

interface CalendrierAgendaProps {
  /** Type de RDV à afficher (CPA, vérification veille...) — filtre les créneaux comme le reste de l'app. */
  type?: 'CPA' | 'VERIFICATION_VEILLE'
  /** Si fourni, cliquer un jour rempli sélectionne cette date (ex. pré-remplir un input date). */
  onSelectDate?: (dateISO: string) => void
}

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Petit agenda mensuel, coloré par jour selon la charge déjà planifiée pour l'utilisateur
// connecté — pour qu'il sache d'un coup d'œil, avant de fixer un nouveau rendez-vous, quels
// jours sont déjà chargés plutôt que de le découvrir après coup. Réutilisable sur tout écran de
// planification (CPA, vérification veille, RDV...).
export default function CalendrierAgenda({ type, onSelectDate }: CalendrierAgendaProps) {
  const [ouvert, setOuvert] = useState(false)
  const [mois, setMois] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [creneaux, setCreneaux] = useState<any[]>([])
  const [chargement, setChargement] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const session = obtenirSessionValide()
  const nomUtilisateur = session ? `${session.payload.firstname} ${session.payload.name}`.trim().toLowerCase() : ''

  useEffect(() => {
    if (!ouvert) return
    const onClickDehors = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', onClickDehors)
    return () => document.removeEventListener('mousedown', onClickDehors)
  }, [ouvert])

  useEffect(() => {
    if (!ouvert) return
    setChargement(true)
    // Construit la date locale "YYYY-MM-DD" à la main plutôt que via toISOString() (conversion
    // UTC) : dans un fuseau en avance sur UTC (ex. Madagascar, UTC+3), minuit local convertit en
    // UTC retombe sur la veille — le dernier jour du mois (voire tout le mois selon l'heure)
    // disparaissait silencieusement de l'agenda.
    const versISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const debut = versISO(mois)
    const fin = versISO(new Date(mois.getFullYear(), mois.getMonth() + 1, 0))
    planningService.getPlanningSemaine(debut, fin, type)
      .then((data: any) => setCreneaux(Array.isArray(data) ? data : []))
      .catch(() => setCreneaux([]))
      .finally(() => setChargement(false))
  }, [ouvert, mois, type])

  const parJour = new Map<string, { total: number; aMoi: number }>()
  for (const c of creneaux) {
    const jour = String(c.date).split('T')[0]
    const entree = parJour.get(jour) || { total: 0, aMoi: 0 }
    entree.total += 1
    if (nomUtilisateur && String(c.responsable || '').trim().toLowerCase() === nomUtilisateur) entree.aMoi += 1
    parJour.set(jour, entree)
  }

  const premierJourSemaine = (new Date(mois.getFullYear(), mois.getMonth(), 1).getDay() + 6) % 7 // lundi = 0
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate()
  const aujourdhui = new Date().toISOString().split('T')[0]

  const cases: (number | null)[] = [...Array(premierJourSemaine).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)]

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setOuvert(o => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Voir mon agenda">
        <span className="material-symbols-outlined text-lg">calendar_month</span>
      </button>

      {ouvert && (
        <div className="absolute z-50 top-11 right-0 w-72 bg-white rounded-xl shadow-xl border border-outline-variant/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setMois(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-1 rounded hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-xs font-bold uppercase tracking-wide">{mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => setMois(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-1 rounded hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {JOURS.map((j, i) => <div key={i} className="text-center text-[9px] font-bold text-on-surface-variant">{j}</div>)}
          </div>

          <div className={`grid grid-cols-7 gap-1 ${chargement ? 'opacity-40' : ''}`}>
            {cases.map((jour, i) => {
              if (jour == null) return <div key={i} />
              const dateISO = `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
              const info = parJour.get(dateISO)
              const estAujourdhui = dateISO === aujourdhui
              const couleur = !info ? '' : info.aMoi > 0 ? 'bg-primary text-white font-bold' : 'bg-amber-100 text-amber-800 font-bold'
              return (
                <button key={i} type="button" disabled={!onSelectDate}
                  onClick={() => onSelectDate?.(dateISO)}
                  title={info ? `${info.total} rendez-vous${info.aMoi ? ` (dont ${info.aMoi} à vous)` : ''}` : 'Aucun rendez-vous'}
                  className={`aspect-square rounded-md text-[11px] flex items-center justify-center transition-colors ${couleur || 'text-on-surface-variant hover:bg-surface-container-low'} ${estAujourdhui ? 'ring-2 ring-primary/50' : ''} ${onSelectDate ? 'cursor-pointer' : 'cursor-default'}`}>
                  {jour}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-outline-variant/10 text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />À vous</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />Autres RDV</span>
          </div>
        </div>
      )}
    </div>
  )
}
