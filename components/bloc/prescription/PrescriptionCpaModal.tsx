'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  // La modale est rendue dans un portail attaché à <body> : le composant est posé dans un
  // conteneur `lg:sticky` de la CPA, et `position: sticky` crée un stacking context qui
  // piégeait le z-index de la modale (effectivement 0) — la Sidebar (z-50), la TopBar (z-40)
  // et le sommaire sticky (z-30) passaient donc au-dessus et masquaient la fenêtre.
  // Portée à la racine du document, elle couvre tout le viewport et domine tous ces éléments.
  useEffect(() => {
    if (!open) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
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

        {/* min-h-0 est indispensable : sans lui, le flex-1 ne peut pas rétrécir sous la
            hauteur de son contenu et la zone se fait rogner par le overflow-hidden de la modale
            (infos masquées, pire en zoom) au lieu de défiler. */}
        <div className="overflow-auto p-5 bg-surface-container-lowest/40 flex-1 min-h-0">
          <PrescriptionModule patientId={patientId} serviceDestOverride={serviceDestOverride} />
        </div>
      </div>
    </div>,
    document.body
  )
}
