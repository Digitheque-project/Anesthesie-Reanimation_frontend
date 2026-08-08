'use client'

import PrescriptionModule from '@/features/prescription/PrescriptionModule'
import type { ServiceDestOverride } from '@/features/prescription/contexts/PrescriptionPanierContext'

interface PrescriptionCpaModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  serviceDestOverride?: ServiceDestOverride
}

// Ouvre le module de prescription (porté depuis front-clinique) en modal, depuis la CPA du
// bloc opératoire — pour que l'anesthésiste/responsable CPA/major puisse prescrire au cas où
// il en a besoin, avant la décision finale, sans quitter la page de consultation.
export default function PrescriptionCpaModal({ open, onClose, patientId, serviceDestOverride }: PrescriptionCpaModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-primary to-secondary shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white">
              <span className="material-symbols-outlined text-2xl">clinical_notes</span>
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-white">Prescrire pendant la CPA</h3>
              <p className="text-xs text-white/80 mt-0.5">
                {serviceDestOverride ? `Sera envoyée à ${serviceDestOverride.serviceName}` : 'Service d’origine du patient inconnu'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-5 bg-surface-container-lowest/40 flex-1">
          <PrescriptionModule patientId={patientId} serviceDestOverride={serviceDestOverride} />
        </div>
      </div>
    </div>
  )
}
