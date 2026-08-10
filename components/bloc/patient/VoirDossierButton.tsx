'use client'

import { useState } from 'react'
import DossierPatientModal from '@/components/clinical/dossier-patient/DossierPatientModal'

type Props = {
  patientId: string | null | undefined
  /** "button" (par défaut, en-tête d'écran patient), "icon" (colonne Action d'un tableau) ou
   * "link" (texte souligné compact). */
  variant?: 'button' | 'icon' | 'link'
  className?: string
  chuId?: string
  serviceId?: string
  hospitalisationId?: string
}

// Bouton "voir dossier patient" réutilisable — ouvre le dossier intégré (identité, statut/CPA à
// jour, parcours) dans une modale en surimpression plutôt que de naviguer vers une page dédiée :
// un médecin qui consulte le dossier en pleine saisie d'un formulaire (CPA, prescription...) ne
// perd ainsi jamais ce qu'il était en train d'écrire, puisque l'écran d'où il vient n'est jamais
// démonté. Un seul composant pour toute l'appli évite de dupliquer cette logique partout (voir
// consultation-cpa/page.tsx et PatientsListTable.tsx, qui utilisaient déjà cette cible avant
// l'introduction de ce composant).
export default function VoirDossierButton({
  patientId,
  variant = 'button',
  className = '',
  chuId,
  serviceId,
  hospitalisationId,
}: Props) {
  const [open, setOpen] = useState(false)
  if (!patientId) return null

  const modale = (
    <DossierPatientModal
      open={open}
      onClose={() => setOpen(false)}
      patientId={patientId}
      chuId={chuId}
      serviceId={serviceId}
      hospitalisationId={hospitalisationId}
    />
  )

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Voir le dossier patient à jour"
          aria-label="Voir le dossier patient à jour"
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors ${className}`}
        >
          <span className="material-symbols-outlined text-lg">folder_shared</span>
        </button>
        {modale}
      </>
    )
  }

  if (variant === 'link') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline ${className}`}
        >
          <span className="material-symbols-outlined text-sm">folder_shared</span> Voir dossier
        </button>
        {modale}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors ${className}`}
      >
        <span className="material-symbols-outlined text-base">folder_shared</span> Voir dossier patient
      </button>
      {modale}
    </>
  )
}
