'use client'

import { useState } from 'react'
import CalendrierAgenda from '@/components/bloc/planning/CalendrierAgenda'

interface ModalPlanifierRDVProps {
  isOpen: boolean
  onClose: () => void
  onValider: (data: any) => void
  patientNom: string
  intervention: string
  estUrgent: boolean
}

export default function ModalPlanifierRDV({
  isOpen, onClose, onValider, patientNom, intervention, estUrgent
}: ModalPlanifierRDVProps) {
  const [typeRDV, setTypeRDV] = useState<'CPA' | 'VERIFICATION_VEILLE'>('CPA')
  const [dateRDV, setDateRDV] = useState(estUrgent ? new Date().toISOString().split('T')[0] : '')
  const [heureRDV, setHeureRDV] = useState(estUrgent ? new Date().toTimeString().split(' ')[0].substring(0,5) : '')
  const [lieuRDV, setLieuRDV] = useState(estUrgent ? 'Bloc Opératoire - Urgence' : '')

  if (!isOpen) return null

  const handleSubmit = () => {
    onValider({ typeRDV, dateRDV, heureRDV, lieuRDV })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
        <h3 className="text-xl font-extrabold mb-2">📅 Planifier Rendez-vous</h3>
        <p className="text-sm text-gray-500 mb-6">
          Patient : <strong>{patientNom}</strong> — {intervention}
        </p>

        <div className="space-y-4">
          {/* Type de RDV */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">Type de consultation</label>
            <div className="flex gap-2">
              <button onClick={() => setTypeRDV('CPA')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                  typeRDV === 'CPA' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                CPA (Consultation Pré-Anesthésique)
              </button>
              <button onClick={() => setTypeRDV('VERIFICATION_VEILLE')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                  typeRDV === 'VERIFICATION_VEILLE' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                Vérification veille
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-600 block">Date *</label>
              <CalendrierAgenda type={typeRDV} onSelectDate={setDateRDV} />
            </div>
            <input type="date" value={dateRDV} onChange={e => setDateRDV(e.target.value)} min={new Date().toISOString().split('T')[0]}
              className="w-full border rounded-lg p-2 text-sm" required />
          </div>

          {/* Heure */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Heure *</label>
            <input type="time" value={heureRDV} onChange={e => setHeureRDV(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm" required />
          </div>

          {/* Lieu */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Lieu</label>
            <input type="text" value={lieuRDV} onChange={e => setLieuRDV(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm" placeholder="Salle de consultation (optionnel)..." />
          </div>

        </div>

        {estUrgent && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-bold">
            ⚡ Patient URGENT — Le RDV sera fixé immédiatement
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2 border rounded-lg text-sm font-bold hover:bg-gray-100">Annuler</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">
            {estUrgent ? '⚡ Fixer Immédiatement' : 'Valider '}
          </button>
        </div>
      </div>
    </div>
  )
}
