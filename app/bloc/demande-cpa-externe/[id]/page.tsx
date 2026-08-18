'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import ModalPlanifierRDV from '@/components/bloc/notification-cpa/ModalPlanifierRDV'
import { useRole } from '@/lib/hooks/useRole'
import { libelleUrgence, styleUrgence, niveauUrgenceNotification, estEchelleUrgente } from '@/lib/urgence'
import { formaterNomPatient } from '@/lib/patient'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import BackButton from '@/components/bloc/layout/BackButton'
import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton'

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: 'En attente de planification',
  CPA_PLANIFIEE: 'CPA planifiée',
  CPA_REALISEE: 'CPA réalisée',
  VPA_PLANIFIEE: 'Vérification veille planifiée',
  VPA_REALISEE: 'Vérification veille réalisée',
  CONFIRMEE: 'Confirmée',
  REPORTEE: 'Reportée',
  ANNULEE: 'Annulée',
}

const formaterDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

export default function DemandeCpaExternePage() {
  return (
    <RoleGate
      allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.RESPONSABLE_CPA, RoleClinique.MAJOR]}
      message="Les demandes de CPA externes ne sont pas accessibles pour votre rôle."
    >
      <Suspense fallback={<main className="p-4">Chargement...</main>}>
        <DemandeCpaExternePageContent />
      </Suspense>
    </RoleGate>
  )
}

function DemandeCpaExternePageContent() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { peutPlanifierCpa, roleName } = useRole()

  const [demande, setDemande] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(false)
  const [showPlanifier, setShowPlanifier] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const charger = () => {
    setLoading(true)
    setErreur(false)
    // Le backend enrichit déjà la demande avec l'identité du service Accueil (nom/prénom).
    apiClient.get(`/demandes-cpa-externes/${id}`)
      .then(({ data }) => setDemande(data))
      .catch(() => setErreur(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (id) charger() }, [id])

  const handleValiderPlanification = async (formData: any) => {
    try {
      setSubmitting(true)
      const [h, m] = (formData.heureRDV || '09:00').split(':').map(Number)
      const fin = new Date()
      fin.setHours(h, m + 30)
      const heureFin = fin.toTimeString().split(' ')[0].substring(0, 5)

      await apiClient.patch(`/demandes-cpa-externes/${id}/planifier`, {
        type: formData.typeRDV || 'CPA',
        date: formData.dateRDV,
        heureDebut: formData.heureRDV,
        heureFin,
        salle: formData.lieuRDV,
      })

      alert('✅ Rendez-vous CPA planifié avec succès ! Le service demandeur a été notifié.')
      setShowPlanifier(false)
      charger()
    } catch (err: any) {
      alert('❌ Erreur : ' + (err.response?.data?.message || err.message || 'Erreur inconnue'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="p-4">Chargement de la demande...</main>
  if (erreur || !demande) return <main className="p-4">Demande introuvable</main>

  const niveau = niveauUrgenceNotification(demande)
  const style = styleUrgence(niveau)

  return (
    <main className="p-4 max-w-3xl">
      <BackButton className="mb-3" />

      <h1 className="text-3xl font-extrabold text-on-surface mb-2">📋 Demande de CPA externe</h1>
      <p className="text-sm text-on-surface-variant mb-4">
        Consultation Pré-Anesthésique demandée par un autre service — ce patient n'entre pas dans le programme opératoire du bloc.
      </p>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">info</span>
        On traite ici uniquement la CPA (ou la vérification veille) pour ce patient — il ne bascule pas automatiquement vers "Patient du jour".
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border mb-3">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-primary">{formaterNomPatient(demande)}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${style.badge}`}>{libelleUrgence(niveau)}</span>
            <VoirDossierButton patientId={demande.patientId} variant="icon" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Service demandeur</span>
            <p className="font-bold">{demande.sourceServiceName || demande.sourceServiceId}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Type d'anesthésie envisagé</span>
            <p className="font-bold">{demande.typeAnesthesie || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Date souhaitée pour l'acte</span>
            <p className="font-bold">{formaterDate(demande.dateExamenSouhaitee) || 'Non communiquée'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Reçue le</span>
            <p className="font-bold">{formaterDate(demande.createdAt) || '—'}</p>
          </div>
        </div>

        {demande.motif && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <span className="text-xs font-bold text-blue-700 uppercase">Motif de la demande</span>
            <p className="text-blue-900 mt-1">{demande.motif}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined">fact_check</span> Statut
        </h3>
        <p className="font-bold mb-3">{LIBELLE_STATUT[demande.statut] || demande.statut}</p>

        {demande.statut === 'EN_ATTENTE' && (
          <>
            {!peutPlanifierCpa && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                Planification réservée au Responsable CPA, au Major ou à l'Anesthésiste{roleName ? ` (votre rôle : ${roleName})` : ''}.
              </div>
            )}
            <button onClick={() => setShowPlanifier(true)} disabled={submitting || !peutPlanifierCpa}
              className="w-full sm:w-auto px-4 py-3 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">event_available</span>
              Planifier le rendez-vous CPA
            </button>
          </>
        )}

        {(demande.statut === 'CPA_PLANIFIEE' || demande.statut === 'VPA_PLANIFIEE') && (
          <button
            onClick={() => router.push(`/bloc/consultation-cpa?patientId=${demande.patientId}&patientNom=${encodeURIComponent(formaterNomPatient(demande))}&intervention=${encodeURIComponent(demande.motif || demande.typeAnesthesie || '')}`)}
            className="w-full sm:w-auto px-4 py-3 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">clinical_notes</span>
            Aller à la consultation CPA
          </button>
        )}
      </div>

      <ModalPlanifierRDV
        isOpen={showPlanifier}
        onClose={() => setShowPlanifier(false)}
        onValider={handleValiderPlanification}
        patientNom={formaterNomPatient(demande)}
        intervention={demande.motif || demande.typeAnesthesie || ''}
        estUrgent={estEchelleUrgente(demande.urgence)}
      />
    </main>
  )
}
