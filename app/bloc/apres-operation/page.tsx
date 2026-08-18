'use client'
import { Suspense } from "react";

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { patientService } from '@/lib/api'
import { useOperationRealtime } from '@/lib/hooks/useOperationRealtime'
import RealtimeUpdateBanner from '@/components/bloc/layout/RealtimeUpdateBanner'
import ErreurChargementBanner from '@/components/bloc/layout/ErreurChargementBanner'
import { useRole } from '@/lib/hooks/useRole'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader'
import BackButton from '@/components/bloc/layout/BackButton'
import PasserButton from '@/components/bloc/layout/PasserButton'
import Radio from '@/components/ui/Radio'
import ConfirmationRecapModal, { RecapSection } from '@/components/ui/ConfirmationRecapModal'
import { useDraftAutosave, chargerBrouillon, effacerBrouillon, type Brouillon } from '@/lib/hooks/useDraftAutosave'

export default function ApresOperationPage() {
  return (
    <RoleGate allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.MAJOR]} message="Vous n'avez pas accès à la check-list après intervention.">
      <Suspense fallback={<div>Chargement...</div>}>
        <ApresOperationPageContent />
      </Suspense>
    </RoleGate>
  );
  }

function ApresOperationPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get('patientId') || ''
  const patientNom = searchParams.get('patientNom') || 'Patient'
  const intervention = searchParams.get('intervention') || ''
  const [patient, setPatient] = useState<any>(null)
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [erreurPatient, setErreurPatient] = useState(false)

  const chargerPatient = () => {
    if (!patientId) { setLoadingPatient(false); return }
    setLoadingPatient(true)
    setErreurPatient(false)
    patientService.getById(patientId).then(setPatient).catch((err) => { console.error(err); setErreurPatient(true) }).finally(() => setLoadingPatient(false))
  }

  useEffect(() => { chargerPatient() }, [patientId])

  const [form, setForm] = useState<{
    dateCreation: string
    interventionEnregistree: boolean | null
    compteFinalCorrect: boolean | null
    etiquetageVerifie: boolean | null
    signalementsEffectues: boolean | null
  }>({
    dateCreation: new Date().toISOString().split('T')[0],
    // Aucune réponse pré-cochée : chaque item doit être choisi activement.
    interventionEnregistree: null, compteFinalCorrect: null, etiquetageVerifie: null,
    signalementsEffectues: null,
  })
  const [loading, setLoading] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [majDistante, setMajDistante] = useState(false)
  const { on } = useOperationRealtime(patientId)
  const { peutValiderChecklistApresOp, roleName } = useRole()

  useEffect(() => on('checklist-apres-op:maj', () => setMajDistante(true)), [on])

  // Filet de sécurité contre la perte de saisie en cliquant "Retour" avant validation.
  const brouillonKey = patientId ? `checklist-apres-brouillon:${patientId}` : null
  useDraftAutosave(brouillonKey, form)
  const [brouillonTrouve, setBrouillonTrouve] = useState<Brouillon<typeof form> | null>(null)
  useEffect(() => {
    if (!brouillonKey) return
    const brouillon = chargerBrouillon<typeof form>(brouillonKey)
    if (brouillon) setBrouillonTrouve(brouillon)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brouillonKey])
  const restaurerBrouillon = () => {
    if (!brouillonTrouve) return
    setForm(brouillonTrouve.data)
    setBrouillonTrouve(null)
  }

  const reponsesIncompletes = form.interventionEnregistree === null || form.compteFinalCorrect === null
    || form.etiquetageVerifie === null || form.signalementsEffectues === null

  const handleOuvrirRecap = () => {
    if (!peutValiderChecklistApresOp) {
      alert('❌ La check-list après intervention est réservée à l\'anesthésiste.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : ''))
      return
    }
    if (reponsesIncompletes) {
      alert('❌ Répondez à chaque item Oui/Non avant de valider.')
      return
    }
    setShowRecap(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Cette check-list EST le check de sortie du bloc (titre de l'écran) — sa validation par
      // l'anesthésiste transfère donc toujours le patient en salle de réveil, sans case à cocher
      // à part : il n'y a pas de cas où on validerait cette sortie sans transfert.
      await apiClient.post('/checklists-apres-op', { patientId, ...form, transfertSalleReveil: true })
      setShowRecap(false)
      if (brouillonKey) effacerBrouillon(brouillonKey)
      alert('✅ Check-list après intervention enregistrée ! Complétez maintenant le protocole anesthésique et les instructions post-opératoires.')
      router.push(`/bloc/protocole-anesthesique?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}&intervention=${encodeURIComponent(intervention)}`)
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
    finally { setLoading(false) }
  }

  const sectionsRecap: RecapSection[] = [
    {
      titre: "Confirmation orale par l'équipe",
      icone: 'record_voice_over',
      champs: [
        { label: 'Intervention enregistrée', valeur: form.interventionEnregistree === true ? 'Oui' : form.interventionEnregistree === false ? 'Non/N/A' : '' },
        { label: 'Compte final compresses/aiguilles/instruments', valeur: form.compteFinalCorrect === true ? 'Oui' : form.compteFinalCorrect === false ? 'Non/N/A' : '' },
        { label: 'Étiquetage des prélèvements vérifié', valeur: form.etiquetageVerifie === true ? 'Oui' : form.etiquetageVerifie === false ? 'Non/N/A' : '' },
        { label: 'Signalement dysfonctionnements/événements', valeur: form.signalementsEffectues === true ? 'Oui' : form.signalementsEffectues === false ? 'Non/N/A' : '' },
      ],
    },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <BackButton />
        <PasserButton onClick={restaurerBrouillon} disabled={!brouillonTrouve} />
      </div>

      <h1 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight mb-4">Check-list après intervention – Check de sortie du bloc</h1>

      <PatientIdentityHeader patient={patient || { nom: patientNom }} loading={loadingPatient} intervention={intervention} patientId={patientId} />

      <RealtimeUpdateBanner visible={majDistante} onRecharger={() => window.location.reload()} />
      <ErreurChargementBanner visible={erreurPatient} onRecharger={chargerPatient} />

      {!peutValiderChecklistApresOp && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          La check-list après intervention est réservée à l'anesthésiste{roleName ? ` (votre rôle actuel est : ${roleName})` : ''}. Vous pouvez consulter cet écran mais pas l'enregistrer.
        </div>
      )}

      {/* Check-list Form */}
      <div className="grid grid-cols-1 gap-6">
        <section className="bg-surface-container-low rounded-3xl p-8 border border-primary-container/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">1</div>
            <h3 className="text-lg font-bold font-headline text-on-surface">Confirmation orale par l'équipe</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'interventionEnregistree', label: 'Intervention enregistrée' },
              { key: 'compteFinalCorrect', label: 'Compte final des compresses, aiguilles, instruments correct' },
              { key: 'etiquetageVerifie', label: 'Étiquetage des prélèvements/pièces opératoires vérifié' },
              { key: 'signalementsEffectues', label: 'Signalement des dysfonctionnements matériels et événements indésirables' },
            ].map(item => (
              <div key={item.key} className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-outline-variant/10">
                <span className="font-medium text-on-surface">{item.label}</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio size="lg" name={item.key}
                      checked={form[item.key as keyof typeof form] === true} onChange={() => setForm({...form, [item.key]: true})} />
                    <span className="text-sm font-semibold">Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio size="lg" name={item.key}
                      checked={form[item.key as keyof typeof form] === false} onChange={() => setForm({...form, [item.key]: false})} />
                    <span className="text-sm font-semibold">Non/N/A</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Action */}
      <div className="mt-10 flex justify-end pt-6 border-t border-outline-variant/10">
        <button onClick={handleOuvrirRecap} disabled={loading || !peutValiderChecklistApresOp}
          title={!peutValiderChecklistApresOp ? 'Réservé à l\'anesthésiste' : undefined}
          className="px-8 py-4 bg-primary text-white font-headline font-bold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
          <span>{loading ? 'Enregistrement...' : !peutValiderChecklistApresOp ? 'Accès non autorisé' : 'Valider et enregistrer'}</span>
          <span className="material-symbols-outlined">save_as</span>
        </button>
      </div>

      <ConfirmationRecapModal
        open={showRecap}
        titre="Check-list après intervention"
        sousTitre="Check de sortie du bloc — relisez avant de confirmer"
        sections={sectionsRecap}
        onAnnuler={() => setShowRecap(false)}
        onConfirmer={handleSubmit}
        confirmEnCours={loading}
        labelConfirmer="Confirmer et enregistrer"
      />
    </div>
  )
  }
