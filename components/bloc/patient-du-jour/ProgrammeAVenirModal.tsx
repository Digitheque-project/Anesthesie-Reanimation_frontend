'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { patientService, notificationService } from '@/lib/api'
import { estServiceNonOperatoire } from '@/lib/programme-non-operatoire'
import { formaterNomPatient } from '@/lib/patient'
import { styleUrgence } from '@/lib/urgence'

interface PatientAVenir {
  id: string
  realId: string
  nom: string
  prenom: string
  operation: string
  etat: string
  chirurgien: string
  dateIntervention: string
  salle: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** true = Programme non-chirurgical (Imagerie, Endoscopie, Urgence...), false = Programme opératoire du Bloc.
   * Sert de vue par défaut à l'ouverture — l'utilisateur peut ensuite basculer entre les deux
   * via les onglets internes (voir `vue`), utile depuis les écrans (Fil de travail, Salle de
   * réveil) qui ne sont pas eux-mêmes limités à un seul flux. */
  nonOperatoire?: boolean
  /** Sélectionne ce jour sur l'écran d'origine et ferme la popup — pour sauter directement à la
   * date d'un patient repéré ici sans devoir naviguer jour par jour depuis le calendrier normal. */
  onChoisirDate?: (date: string) => void
}

const formaterDateGroupe = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  const libelle = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

// Vue d'ensemble de tout le programme à venir (aujourd'hui inclus), toutes dates confondues,
// triée du plus proche au plus loin — sans ça, il fallait naviguer jour par jour dans le
// calendrier normal pour se faire une idée de la charge de travail des prochains jours.
export default function ProgrammeAVenirModal({ open, onClose, nonOperatoire = false, onChoisirDate }: Props) {
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<PatientAVenir[]>([])
  // Vue affichée (chirurgical / non-chirurgical) — initialisée depuis `nonOperatoire` à chaque
  // ouverture, mais bascule librement ensuite via les onglets internes : les écrans qui ne sont
  // pas eux-mêmes limités à un seul flux (Fil de travail, Salle de réveil) ont besoin des deux.
  const [vueNonOperatoire, setVueNonOperatoire] = useState(nonOperatoire)

  useEffect(() => {
    if (open) setVueNonOperatoire(nonOperatoire)
  }, [open, nonOperatoire])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      patientService.getAll({ statut: 'PRET_POUR_BLOC', limite: 200 }),
      patientService.getAll({ statut: 'EN_COURS_OPERATION', limite: 200 }),
      notificationService.getAll(1, 100),
    ])
      .then(([pretRes, encoursRes, notifsRes]) => {
        const notifsData = notifsRes.data || []
        const aujourdhui = new Date().toISOString().split('T')[0]
        const data = [...(pretRes.data || []), ...(encoursRes.data || [])]
          .filter((p: any) => (vueNonOperatoire ? estServiceNonOperatoire(p.serviceOrigine) : !estServiceNonOperatoire(p.serviceOrigine)))
          .filter((p: any) => p.dateIntervention && new Date(p.dateIntervention).toISOString().split('T')[0] >= aujourdhui)

        const liste: PatientAVenir[] = data.map((p: any) => {
          const notif = notifsData.find((n: any) => n.patientId === p.id || n.patient?.id === p.id)
          return {
            id: p.idDossier || p.id,
            realId: p.id,
            nom: p.nom,
            prenom: p.prenom,
            operation: notif?.intervention || p.libelle || 'Non spécifiée',
            etat: p.niveauUrgence === 'TRES_URGENT' ? 'TRES_URGENT' : p.niveauUrgence === 'URGENT' ? 'URGENT' : 'NORMAL',
            chirurgien: notif?.chirurgien?.nom || notif?.chirurgienNom || p.chirurgien_nom || '',
            dateIntervention: p.dateIntervention,
            salle: p.salleOperation || '',
          }
        }).sort((a, b) => new Date(a.dateIntervention).getTime() - new Date(b.dateIntervention).getTime())

        setPatients(liste)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, vueNonOperatoire])

  const groupes = useMemo(() => {
    const map = new Map<string, PatientAVenir[]>()
    for (const p of patients) {
      const cle = new Date(p.dateIntervention).toISOString().split('T')[0]
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle)!.push(p)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [patients])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 bg-gradient-to-r from-primary to-primary-container px-6 py-5 flex items-center gap-3">
          <span className="material-symbols-outlined text-white text-2xl">calendar_month</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-white tracking-tight">Programme à venir</h3>
            <p className="text-xs text-white/80 font-medium">Tous les patients à opérer, du plus proche au plus loin</p>
          </div>
          <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Bascule chirurgical / non-chirurgical — utile depuis les écrans qui voient les deux
            flux (Fil de travail, Salle de réveil) ; sans effet gênant pour les écrans déjà
            limités à un seul flux, qui n'ont qu'à l'ignorer. */}
        <div className="shrink-0 flex gap-1.5 px-6 py-3 bg-surface-container-lowest border-b border-outline-variant/10">
          <button type="button" onClick={() => setVueNonOperatoire(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!vueNonOperatoire ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}>
            Programme opératoire
          </button>
          <button type="button" onClick={() => setVueNonOperatoire(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${vueNonOperatoire ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}>
            Programme non-chirurgical
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-surface-container-lowest/40">
          {loading ? (
            <p className="text-sm text-on-surface-variant text-center py-10">Chargement...</p>
          ) : groupes.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic text-center py-10">Aucun patient à opérer dans les prochains jours.</p>
          ) : (
            groupes.map(([date, patientsDuJour]) => (
              <div key={date} className="rounded-2xl bg-white border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-3 bg-primary-fixed/30 border-b border-outline-variant/10">
                  <h4 className="text-sm font-extrabold text-primary">
                    {date === new Date().toISOString().split('T')[0] ? "Aujourd'hui" : formaterDateGroupe(date)}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">
                      {patientsDuJour.length} patient{patientsDuJour.length > 1 ? 's' : ''}
                    </span>
                    {onChoisirDate && (
                      <button type="button" onClick={() => { onChoisirDate(date); onClose() }}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors">
                        Voir ce jour
                      </button>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {patientsDuJour.map((p) => (
                    <div key={p.realId} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${p.etat === 'NORMAL' ? 'bg-primary-fixed text-primary' : `${styleUrgence(p.etat).fondClair} ${styleUrgence(p.etat).texte}`}`}>
                        {p.nom?.charAt(0)}{p.prenom?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-on-surface truncate">{formaterNomPatient(p)}</p>
                        <p className="text-xs text-on-surface-variant truncate">{p.operation}{p.chirurgien ? ` — Dr ${p.chirurgien}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-on-surface">
                          {new Date(p.dateIntervention).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {p.salle && <p className="text-[10px] text-on-surface-variant">{p.salle}</p>}
                      </div>
                      {p.etat !== 'NORMAL' && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styleUrgence(p.etat).point} animate-pulse`} title={p.etat === 'TRES_URGENT' ? 'Très urgent' : 'Urgent'} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
