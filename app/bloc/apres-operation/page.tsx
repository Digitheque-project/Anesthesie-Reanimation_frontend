'use client'
import { Suspense } from "react";

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { patientService } from '@/lib/api'
import { useOperationRealtime } from '@/lib/hooks/useOperationRealtime'
import RealtimeUpdateBanner from '@/components/bloc/layout/RealtimeUpdateBanner'
import { useRole } from '@/lib/hooks/useRole'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader'
import BackButton from '@/components/bloc/layout/BackButton'

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

  useEffect(() => {
    if (!patientId) { setLoadingPatient(false); return }
    patientService.getById(patientId).then(setPatient).catch(console.error).finally(() => setLoadingPatient(false))
  }, [patientId])

  const [form, setForm] = useState<{
    dateCreation: string
    interventionEnregistree: boolean | null
    compteFinalCorrect: boolean | null
    etiquetageVerifie: boolean | null
    signalementsEffectues: boolean | null
    observationsParticulieres: string
  }>({
    dateCreation: new Date().toISOString().split('T')[0],
    // Aucune réponse pré-cochée : chaque item doit être choisi activement.
    interventionEnregistree: null, compteFinalCorrect: null, etiquetageVerifie: null,
    signalementsEffectues: null, observationsParticulieres: '',
  })
  const [loading, setLoading] = useState(false)
  const [majDistante, setMajDistante] = useState(false)
  const { on } = useOperationRealtime(patientId)
  const { peutValiderChecklistApresOp, roleName } = useRole()

  useEffect(() => on('checklist-apres-op:maj', () => setMajDistante(true)), [on])

  const reponsesIncompletes = form.interventionEnregistree === null || form.compteFinalCorrect === null
    || form.etiquetageVerifie === null || form.signalementsEffectues === null

  const handleSubmit = async () => {
    if (!peutValiderChecklistApresOp) {
      alert('❌ La check-list après intervention est réservée à l\'anesthésiste.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : ''))
      return
    }
    if (reponsesIncompletes) {
      alert('❌ Répondez à chaque item Oui/Non avant de valider.')
      return
    }
    setLoading(true)
    try {
      // Cette check-list EST le check de sortie du bloc (titre de l'écran) — sa validation par
      // l'anesthésiste transfère donc toujours le patient en salle de réveil, sans case à cocher
      // à part : il n'y a pas de cas où on validerait cette sortie sans transfert.
      await apiClient.post('/checklists-apres-op', { patientId, ...form, transfertSalleReveil: true })
      alert('✅ Check-list après intervention enregistrée ! Complétez maintenant le protocole anesthésique et les instructions post-opératoires.')
      router.push(`/bloc/protocole-anesthesique?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}&intervention=${encodeURIComponent(intervention)}`)
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
    finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <BackButton className="mb-4" />

      <h1 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight mb-4">Check-list après intervention – Check de sortie du bloc</h1>

      <PatientIdentityHeader patient={patient || { nom: patientNom }} loading={loadingPatient} intervention={intervention} patientId={patientId} />

      <RealtimeUpdateBanner visible={majDistante} onRecharger={() => window.location.reload()} />

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
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'interventionEnregistree', label: 'Intervention enregistrée' },
              { key: 'compteFinalCorrect', label: 'Compte final des compresses, aiguilles, instruments correct' },
              { key: 'etiquetageVerifie', label: 'Étiquetage des prélèvements/pièces opératoires vérifié' },
              { key: 'signalementsEffectues', label: 'Signalement des dysfonctionnements matériels et événements indésirables' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant/10">
                <span className="font-medium text-on-surface">{item.label}</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input className="w-7 h-7 text-primary rounded" type="radio" name={item.key}
                      checked={form[item.key as keyof typeof form] === true} onChange={() => setForm({...form, [item.key]: true})} />
                    <span className="text-sm font-semibold">Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input className="w-7 h-7 text-primary rounded" type="radio" name={item.key}
                      checked={form[item.key as keyof typeof form] === false} onChange={() => setForm({...form, [item.key]: false})} />
                    <span className="text-sm font-semibold">Non/N/A</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Observations */}
        <section className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary">edit_note</span>
            <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider">Observations Particulières</h3>
          </div>
          <textarea className="w-full min-h-[120px] rounded-2xl border-none bg-surface-container-low p-5 text-sm focus:ring-2 focus:ring-primary/10"
            placeholder="Saisissez ici les motifs de dérogation ou les incidents techniques notables..."
            value={form.observationsParticulieres} onChange={e => setForm({...form, observationsParticulieres: e.target.value})}></textarea>
        </section>
      </div>

      {/* Footer Action */}
      <div className="mt-10 flex justify-end pt-6 border-t border-outline-variant/10">
        <button onClick={handleSubmit} disabled={loading || !peutValiderChecklistApresOp}
          title={!peutValiderChecklistApresOp ? 'Réservé à l\'anesthésiste' : undefined}
          className="px-8 py-4 bg-primary text-white font-headline font-bold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
          <span>{loading ? 'Enregistrement...' : !peutValiderChecklistApresOp ? 'Accès non autorisé' : 'Valider et enregistrer'}</span>
          <span className="material-symbols-outlined">save_as</span>
        </button>
      </div>
    </div>
  )
  }
