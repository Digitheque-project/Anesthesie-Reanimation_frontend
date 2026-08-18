'use client'

import { useRouter } from 'next/navigation'
import { libelleUrgence, styleUrgence, niveauUrgenceNotification } from '@/lib/urgence'
import { formaterNomPatient } from '@/lib/patient'

interface TableauNotificationsProps {
  notifications: any[]
  peutPlanifier: boolean
  onPlanifier: (notif: any) => void
  onActionUrgent: (notif: any) => void
  onVoirDossier: (notif: any) => void
}

export default function TableauNotifications({
  notifications,
  peutPlanifier,
  onPlanifier,
  onActionUrgent,
  onVoirDossier
}: TableauNotificationsProps) {
  const router = useRouter()

  // `estUrgent` est désormais calculé sur l'échelle commune (voir lib/urgence.ts) pour les deux
  // origines — inutile de rattraper au cas par cas le niveau 3, qu'il manquait autrefois.
  const estPatientTresUrgent = (notif: any) => Boolean(notif.estUrgent)
  // TRÈS URGENT déclenche la VPA directe ; URGENT/NORMAL restent sur la planification CPA
  // classique — seul l'affichage (libellé/couleur) distingue les 3 niveaux.

  const formatDateIntervention = (notif: any) => {
    if (!notif.dateIntervention) return null
    return new Date(notif.dateIntervention).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-outline-variant/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-xs font-semibold uppercase text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 text-left">Heure</th>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Intervention</th>
              <th className="px-4 py-3 text-left">Opération prévue</th>
              <th className="px-4 py-3 text-left">Service source</th>
              <th className="px-4 py-3 text-left">Urgent</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {notifications.map((n, idx) => {
              const estTresUrgent = estPatientTresUrgent(n)
              const niveau = niveauUrgenceNotification(n)
              return (
                <tr
                  key={n.id || idx}
                  onClick={() => onVoirDossier(n)}
                  className="hover:bg-primary/5 transition cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-sm">{n.heure || n.heurePrescription || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-on-surface">
                      {n.patientNom || formaterNomPatient(n.patient)}
                      {estTresUrgent && (
                        <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${styleUrgence(niveau).badge}`}>
                          ⚡ {libelleUrgence(niveau)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{n.intervention || n.motif || '-'}</td>
                  <td className="px-4 py-3">
                    {formatDateIntervention(n) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        <span className="material-symbols-outlined text-sm">event</span>
                        {formatDateIntervention(n)}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Non communiquée</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(n.sourceServiceName || n.serviceSourceNom) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                        {n.sourceServiceName || n.serviceSourceNom}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Non communiqué</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${styleUrgence(niveau).badge} ${niveau === 'TRES_URGENT' ? 'animate-pulse' : ''}`}>
                      {libelleUrgence(niveau)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (estTresUrgent) {
                          // Patient très urgent → VPA direct
                          onActionUrgent(n)
                        } else {
                          // Patient normal → Planifier CPA
                          onPlanifier(n)
                        }
                      }}
                      disabled={!estTresUrgent && !peutPlanifier}
                      title={!estTresUrgent && !peutPlanifier ? "Planification réservée au Responsable CPA, au Major ou à l'Anesthésiste" : undefined}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        estTresUrgent
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                          : 'bg-primary text-white hover:bg-primary-dark'
                      }`}
                    >
                      {estTresUrgent ? '⚡ VPA Direct' : '📋 Planifier CPA'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
