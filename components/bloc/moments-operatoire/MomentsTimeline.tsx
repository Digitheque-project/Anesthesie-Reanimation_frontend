'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { useOperationRealtime } from '@/lib/hooks/useOperationRealtime'
import { useRole } from '@/lib/hooks/useRole'
import type { CategorieMoment } from '@/lib/data/catalogue-moments-operatoires'

// Séparation stricte par rôle — miroir de MomentsOperatoireService côté backend. Pendant
// l'opération, l'IBODE n'a aucune interface propre : tous les boutons (toutes catégories) sont
// réservés à l'anesthésiste. L'IBODE retrouve une interface partagée avec l'anesthésiste plus
// tard, en salle de réveil (voir salle-de-reveil/suivi). Les autres rôles (Responsable CPA,
// Major) consultent l'historique mais ne déclenchent/créent rien ici.
const CATEGORIES_AUTORISEES: Record<string, CategorieMoment[]> = {
  ANESTHESISTE: ['ANESTHESIE', 'CHIRURGIE', 'DIVERS'],
}

const TITRES_CATEGORIE: Record<CategorieMoment, string> = {
  ANESTHESIE: 'Anesthésie',
  CHIRURGIE: 'Chirurgie',
  DIVERS: 'Divers',
}

type CatalogueEntry = { id: string; categorie: CategorieMoment; label: string; creeParNom: string | null; createdAt: string }

type MomentOperatoire = {
  id: string
  label: string
  categorie: CategorieMoment
  estPersonnalise: boolean
  horodatage: string
  auteurNom: string
  auteurRole: string
  annule: boolean
  annuleParNom?: string | null
}

type Toast = { key: number; label: string; heureAffichee: string; promesse: Promise<MomentOperatoire | null> }

const formatHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Identité visuelle par catégorie : chaque bouton porte la couleur et l'icône de sa famille de
// moments, pour repérer d'un coup d'œil anesthésie / chirurgie / divers dans la chronologie.
const CATEGORIE_STYLE: Record<CategorieMoment, {
  icone: string; texte: string; anneau: string; puce: string; chip: string; chipHover: string; point: string;
}> = {
  ANESTHESIE: {
    icone: 'monitor_heart',
    texte: 'text-blue-700',
    anneau: 'ring-blue-200',
    puce: 'bg-blue-100 text-blue-700',
    chip: 'border-blue-200 bg-blue-50/60 text-blue-800',
    chipHover: 'hover:bg-blue-100 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/10',
    point: 'bg-blue-500',
  },
  CHIRURGIE: {
    icone: 'content_cut',
    texte: 'text-red-700',
    anneau: 'ring-red-200',
    puce: 'bg-red-100 text-red-700',
    chip: 'border-red-200 bg-red-50/60 text-red-800',
    chipHover: 'hover:bg-red-100 hover:border-red-400 hover:shadow-md hover:shadow-red-500/10',
    point: 'bg-red-500',
  },
  DIVERS: {
    icone: 'category',
    texte: 'text-secondary',
    anneau: 'ring-secondary-container/40',
    puce: 'bg-secondary/10 text-secondary',
    chip: 'border-secondary/20 bg-secondary/5 text-secondary',
    chipHover: 'hover:bg-secondary/10 hover:border-secondary hover:shadow-md hover:shadow-secondary/10',
    point: 'bg-secondary',
  },
}

// Timeline des moments opératoires : un tap sur un bouton horodate immédiatement le moment
// (capture client, avant même la réponse réseau) et l'annonce via un toast bas d'écran avec
// annulation possible — pas de confirmation bloquante, la vitesse de saisie prime en
// situation réelle. Synchronisé en temps réel entre tous les postes connectés sur ce patient.
export default function MomentsTimeline({ patientId }: { patientId: string }) {
  const [moments, setMoments] = useState<MomentOperatoire[]>([])
  const [catalogue, setCatalogue] = useState<CatalogueEntry[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [nouveauLabel, setNouveauLabel] = useState('')
  const [ajoutEnCours, setAjoutEnCours] = useState(false)
  const toastSeq = useRef(0)
  const { on } = useOperationRealtime(patientId)
  const { role } = useRole()

  const categoriesAutorisees = useMemo(() => (role ? CATEGORIES_AUTORISEES[role] || [] : []), [role])
  const [categorieNouveauBouton, setCategorieNouveauBouton] = useState<CategorieMoment>('ANESTHESIE')
  useEffect(() => {
    if (categoriesAutorisees.length && !categoriesAutorisees.includes(categorieNouveauBouton)) {
      setCategorieNouveauBouton(categoriesAutorisees[0])
    }
  }, [categoriesAutorisees])

  const upsertMoment = (moment: MomentOperatoire) => {
    setMoments(prev => {
      const idx = prev.findIndex(m => m.id === moment.id)
      const next = idx === -1 ? [...prev, moment] : prev.map((m, i) => (i === idx ? moment : m))
      return next.sort((a, b) => a.horodatage.localeCompare(b.horodatage))
    })
  }

  useEffect(() => {
    if (!patientId) return
    apiClient.get('/moments-operatoires', { params: { patientId } })
      .then(({ data }) => setMoments(data || []))
      .catch(console.error)
  }, [patientId])

  useEffect(() => {
    apiClient.get('/moments-catalogue').then(({ data }) => setCatalogue(data || [])).catch(console.error)
  }, [])

  useEffect(() => on('moment:cree', (payload: any) => {
    if (payload?.patientId === patientId && payload?.moment) upsertMoment(payload.moment)
  }), [on, patientId])

  useEffect(() => on('moment:annule', (payload: any) => {
    if (payload?.patientId !== patientId) return
    setMoments(prev => prev.map(m => (m.id === payload.momentId ? { ...m, annule: true, annuleParNom: payload.annuleParNom } : m)))
  }), [on, patientId])

  const declencherMoment = (label: string, categorie: CategorieMoment) => {
    const horodatage = new Date().toISOString()
    const key = toastSeq.current++

    const promesse = apiClient
      .post('/moments-operatoires', { patientId, label, categorie, estPersonnalise: false, horodatage })
      .then(({ data }) => { upsertMoment(data); return data as MomentOperatoire })
      .catch((err) => { console.error(err); return null })

    setToasts(prev => [...prev, { key, label, heureAffichee: formatHeure(horodatage), promesse }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.key !== key)), 7000)
  }

  const annulerMoment = async (id: string) => {
    try {
      const { data } = await apiClient.patch(`/moments-operatoires/${id}/annuler`)
      upsertMoment(data)
    } catch (err) {
      console.error(err)
    }
  }

  const annulerDepuisToast = async (toast: Toast) => {
    setToasts(prev => prev.filter(t => t.key !== toast.key))
    const moment = await toast.promesse
    if (moment) annulerMoment(moment.id)
  }

  // Créer un nouveau bouton réutilisable dans le catalogue — action distincte de
  // "déclencher un moment" : le bouton devient disponible immédiatement, mais n'horodate rien
  // tant qu'il n'est pas ensuite cliqué comme les autres.
  const ajouterBouton = async () => {
    const label = nouveauLabel.trim()
    if (!label) return
    setAjoutEnCours(true)
    try {
      const { data } = await apiClient.post('/moments-catalogue', { categorie: categorieNouveauBouton, label })
      setCatalogue(prev => [data, ...prev])
      setNouveauLabel('')
    } catch (err) {
      console.error(err)
      alert("❌ Erreur lors de la création du bouton")
    } finally {
      setAjoutEnCours(false)
    }
  }

  const categoriesVisibles = categoriesAutorisees

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm space-y-5 h-full flex flex-col">
      <h2 className="text-lg font-bold font-headline text-primary flex items-center gap-2 shrink-0">
        <span className="material-symbols-outlined">timeline</span> Chronologie de l'opération
      </h2>

      {categoriesVisibles.length === 0 && (
        <p className="text-xs text-on-surface-variant italic">
          Votre rôle ne permet pas d'horodater de moment ici — consultez l'historique ci-dessous.
        </p>
      )}

      <div className="space-y-4 shrink-0">
        {categoriesVisibles.map((categorie) => {
          const style = CATEGORIE_STYLE[categorie]
          const entries = catalogue.filter((c) => c.categorie === categorie)
          return (
            <div key={categorie}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${style.puce}`}>
                  <span className="material-symbols-outlined text-sm">{style.icone}</span>
                </span>
                <h3 className={`text-[11px] font-extrabold uppercase tracking-widest ${style.texte}`}>
                  {TITRES_CATEGORIE[categorie]}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => declencherMoment(entry.label, categorie)}
                    className={`px-3.5 py-2 rounded-full border text-sm font-semibold transition-all active:scale-95 ${style.chip} ${style.chipHover}`}
                  >
                    {entry.label}
                  </button>
                ))}
                {entries.length === 0 && (
                  <p className="text-xs text-on-surface-variant italic">Aucun bouton pour l'instant — ajoutez-en un ci-dessous.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {categoriesVisibles.length > 0 && (
        <div className="flex gap-2 items-center pt-4 border-t border-outline-variant/20 shrink-0">
          <select
            value={categorieNouveauBouton}
            onChange={(e) => setCategorieNouveauBouton(e.target.value as CategorieMoment)}
            className="bg-surface-container-low border-none rounded-lg p-2 text-xs font-bold"
          >
            {categoriesVisibles.map((c) => (
              <option key={c} value={c}>{TITRES_CATEGORIE[c]}</option>
            ))}
          </select>
          <input
            value={nouveauLabel}
            onChange={(e) => setNouveauLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ajouterBouton()}
            placeholder="+ Créer un nouveau bouton…"
            className="flex-1 bg-white border border-outline-variant/40 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
          />
          <button type="button" onClick={ajouterBouton} disabled={ajoutEnCours} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60">
            <span className="material-symbols-outlined text-base">add</span> Créer
          </button>
        </div>
      )}

      <div className="flex flex-col">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 shrink-0">Historique</h3>
        {moments.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Aucun moment horodaté pour l'instant.</p>
        ) : (
          <ul className="space-y-1.5 overflow-y-auto max-h-80">
            {moments.map((m) => {
              const style = CATEGORIE_STYLE[m.categorie] || CATEGORIE_STYLE.DIVERS
              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg border ${m.annule ? 'opacity-40 line-through border-transparent' : 'bg-white border-outline-variant/20 shadow-sm'}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.point}`}></span>
                  <span className="font-mono text-xs font-bold text-on-surface-variant shrink-0">{formatHeure(m.horodatage)}</span>
                  <span className="font-semibold flex-1 truncate">{m.label}{m.estPersonnalise ? ' (perso.)' : ''}</span>
                  <span className="text-xs text-on-surface-variant hidden sm:inline">{m.auteurNom}</span>
                  {!m.annule && (
                    <button type="button" onClick={() => annulerMoment(m.id)} title="Annuler ce moment" className="text-error hover:bg-error/10 rounded-full p-1 transition-colors">
                      <span className="material-symbols-outlined text-base">undo</span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.key} className="bg-on-surface text-surface px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span>{t.label} — {t.heureAffichee}</span>
            <button type="button" onClick={() => annulerDepuisToast(t)} className="font-bold underline">Annuler</button>
          </div>
        ))}
      </div>
    </section>
  )
}
