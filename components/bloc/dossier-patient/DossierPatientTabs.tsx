'use client'

import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton'

interface DossierPatientTabsProps {
  patientId: string
}

// Accès au vrai dossier patient (Service Clinique) : les données cliniques détaillées
// (observations, diagnostics, suivis...) ne sont pas synchronisées avec le Bloc pour les
// patients issus des prescriptions — la barre d'onglets affichait donc uniquement des zones
// vides. On garde simplement le bouton qui ouvre le dossier réel en surimpression.
export default function DossierPatientTabs({ patientId }: DossierPatientTabsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4">
        <VoirDossierButton
          patientId={patientId}
          variant="primary"
          className="w-full"
        />
      </div>
    </div>
  )
}
