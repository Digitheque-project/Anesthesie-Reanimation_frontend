'use client'

import { formaterNomPatient } from '@/lib/patient'
import { libelleUrgence, styleUrgence } from '@/lib/urgence'
import VoirDossierButton from './VoirDossierButton'

interface PatientIdentityHeaderProps {
  patient?: {
    nom?: string | null
    prenom?: string | null
    sexe?: string | null
    dateNaissance?: string | null
    chambre?: string | null
    idDossier?: string | null
    niveauUrgence?: string | null
  } | null
  /** Sous-titre optionnel (ex. intervention prévue, titre de la checklist en cours). */
  intervention?: string
  loading?: boolean
  /** Si fourni, affiche le bouton "Voir dossier patient" (dossier intégré, statut à jour). */
  patientId?: string | null
}

const calculerAge = (dateNaissance?: string | null): number | null => {
  if (!dateNaissance) return null
  const d = new Date(dateNaissance)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)))
}

// En-tête d'identité patient, réutilisé sur tous les écrans spécifiques à un patient
// (checklists, vérifications, salle de réveil, etc.) — calqué sur le meilleur exemple existant
// (app/bloc/dossier-patient/[id]/page.tsx), pour que l'équipe soignante voie toujours clairement
// de quel patient il s'agit, avec les mêmes informations partout.
export default function PatientIdentityHeader({ patient, intervention, loading, patientId }: PatientIdentityHeaderProps) {
  const age = calculerAge(patient?.dateNaissance)
  const urgence = patient?.niveauUrgence

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border mb-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {patient?.nom?.charAt(0)}{patient?.prenom?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-primary leading-tight">
              {loading ? 'Chargement...' : formaterNomPatient(patient)}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {age != null ? `${age} ans` : '—'} • {patient?.sexe || '—'}
              {patient?.idDossier ? ` • #${patient.idDossier}` : ''}
            </p>
            {intervention && <p className="text-sm font-semibold text-primary mt-0.5">{intervention}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {patient?.chambre && (
            <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold text-on-surface-variant">
              Chambre {patient.chambre}
            </span>
          )}
          {urgence && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styleUrgence(urgence).badge}`}>
              {libelleUrgence(urgence)}
            </span>
          )}
          {patientId && <VoirDossierButton patientId={patientId} variant="link" />}
        </div>
      </div>
    </div>
  )
}
