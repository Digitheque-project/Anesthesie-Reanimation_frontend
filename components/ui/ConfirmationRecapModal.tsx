'use client'

import { useEffect } from 'react'

export interface RecapChamp {
  label: string
  valeur: string
}

export interface RecapSection {
  titre: string
  icone?: string
  champs: RecapChamp[]
}

interface ConfirmationRecapModalProps {
  open: boolean
  titre: string
  sousTitre?: string
  sections: RecapSection[]
  onAnnuler: () => void
  onConfirmer: () => void
  confirmEnCours?: boolean
  labelConfirmer?: string
  labelAnnuler?: string
}

// Popup de confirmation générique : relit en lecture seule ce qui va être enregistré (jamais
// modifiable ici — pour corriger, on annule et on repart au formulaire) avant l'appel API réel.
// Un seul composant pour tous les écrans à formulaire/checklist de l'appli (voir
// salle-de-reveil/suivi, le premier écran à avoir introduit ce geste), pour que l'utilisateur
// retrouve toujours la même interaction avant de valider quoi que ce soit.
export default function ConfirmationRecapModal({
  open,
  titre,
  sousTitre,
  sections,
  onAnnuler,
  onConfirmer,
  confirmEnCours = false,
  labelConfirmer = 'Confirmer et enregistrer',
  labelAnnuler = 'Annuler',
}: ConfirmationRecapModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmEnCours) onAnnuler()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onAnnuler, confirmEnCours])

  if (!open) return null

  // Une valeur vide (jamais renseignée) n'a rien à apporter à une relecture avant enregistrement
  // — elle est simplement omise plutôt que d'afficher un tiret pour chaque champ facultatif non
  // rempli d'un formulaire qui peut en compter plusieurs dizaines.
  const sectionsRemplies = sections
    .map((s) => ({ ...s, champs: s.champs.filter((c) => c.valeur.trim() !== '') }))
    .filter((s) => s.champs.length > 0)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !confirmEnCours) onAnnuler()
      }}
    >
      <div className="flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* En-tête */}
        <div className="shrink-0 bg-gradient-to-r from-primary to-primary-container px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
              <span className="material-symbols-outlined text-white text-2xl">fact_check</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-white tracking-tight truncate">{titre}</h3>
              <p className="text-xs text-white/80 font-medium">{sousTitre || 'Relisez avant de confirmer — rien n\'est encore enregistré'}</p>
            </div>
          </div>
        </div>

        {/* Corps : relecture, rien n'est éditable ici */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4 bg-surface-container-lowest/40">
          {sectionsRemplies.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic text-center py-8">Aucune information saisie pour l'instant.</p>
          ) : (
            sectionsRemplies.map((section) => (
              <div key={section.titre} className="rounded-2xl bg-white border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-primary-fixed/30 border-b border-outline-variant/10">
                  {section.icone && <span className="material-symbols-outlined text-primary text-lg">{section.icone}</span>}
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-primary">{section.titre}</h4>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {section.champs.map((champ) => (
                    <div key={champ.label} className="rounded-xl bg-surface-container-low px-3.5 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant mb-0.5">{champ.label}</p>
                      <p className="text-sm font-semibold text-on-surface whitespace-pre-wrap break-words">{champ.valeur}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pied : la seule action qui enregistre réellement */}
        <div className="shrink-0 flex gap-3 px-7 py-5 border-t border-outline-variant/10 bg-white">
          <button
            type="button"
            onClick={onAnnuler}
            disabled={confirmEnCours}
            className="flex-1 py-3 border-2 border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            {labelAnnuler}
          </button>
          <button
            type="button"
            onClick={onConfirmer}
            disabled={confirmEnCours}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">{confirmEnCours ? 'progress_activity' : 'check_circle'}</span>
            {confirmEnCours ? 'Enregistrement...' : labelConfirmer}
          </button>
        </div>
      </div>
    </div>
  )
}
