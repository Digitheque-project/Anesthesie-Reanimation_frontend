'use client'
import { Suspense } from "react";

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { useOperationRealtime } from '@/lib/hooks/useOperationRealtime'
import RealtimeUpdateBanner from '@/components/bloc/layout/RealtimeUpdateBanner'
import { useRole } from '@/lib/hooks/useRole'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import { patientService } from '@/lib/api'
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader'
import BackButton from '@/components/bloc/layout/BackButton'
import InstructionsPostOpForm, { DEFAULT_INSTRUCTIONS_POST_OP, InstructionsPostOpData, depuisProtocole, versPayloadProtocole } from '@/components/bloc/protocole/InstructionsPostOpForm'

// Équivalent, côté anesthésiste, de la page "Protocole Opératoire" du chirurgien : compte-rendu
// libre de l'anesthésiste ("Protocole Anesthésique") + Instructions Post-Opératoires, partagées
// avec le chirurgien (même enregistrement ProtocoleOperatoire côté backend). Ouverte juste après
// validation de la check-list après intervention (voir app/bloc/apres-operation/page.tsx).
export default function ProtocoleAnesthesiquePage() {
  return (
    <RoleGate allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.MAJOR]} message="Vous n'avez pas accès au protocole anesthésique.">
      <Suspense fallback={<div>Chargement...</div>}>
        <ProtocoleAnesthesiquePageContent />
      </Suspense>
    </RoleGate>
  );
  }

function ProtocoleAnesthesiquePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get('patientId') || ''
  const patientNom = searchParams.get('patientNom') || 'Patient'
  const [patient, setPatient] = useState<any>(null)
  const [loadingPatient, setLoadingPatient] = useState(true)

  useEffect(() => {
    if (!patientId) { setLoadingPatient(false); return }
    patientService.getById(patientId).then(setPatient).catch(console.error).finally(() => setLoadingPatient(false))
  }, [patientId])

  const [dateOperation, setDateOperation] = useState(new Date().toISOString().split('T')[0])
  const [compteRenduAnesthesique, setCompteRenduAnesthesique] = useState('')
  const [instructions, setInstructions] = useState<InstructionsPostOpData>(DEFAULT_INSTRUCTIONS_POST_OP)
  const [prescriptionsConjointes, setPrescriptionsConjointes] = useState(false)
  const [protocoleId, setProtocoleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [majDistante, setMajDistante] = useState(false)
  const { on } = useOperationRealtime(patientId)
  const { estAnesthesiste, roleName } = useRole()

  useEffect(() => on('protocole-operatoire:maj', () => setMajDistante(true)), [on])

  // Préchargement : si le chirurgien a déjà créé l'enregistrement (Protocole Opératoire) pour ce
  // patient aujourd'hui, on récupère ses Instructions Post-Op déjà saisies au lieu de repartir
  // d'un formulaire vide (sinon la sauvegarde ici écraserait les siennes).
  useEffect(() => {
    if (!patientId) return
    apiClient.get('/protocoles-operatoires', { params: { patientId, limite: 1 } })
      .then(({ data }) => {
        const existant = data?.data?.[0]
        if (!existant) return
        setProtocoleId(existant.id)
        if (existant.compteRenduAnesthesique) setCompteRenduAnesthesique(existant.compteRenduAnesthesique)
        setInstructions(depuisProtocole(existant))
        setPrescriptionsConjointes(!!existant.prescriptionsConjointes)
      })
      .catch(console.error)
  }, [patientId])

  const handleSubmit = async () => {
    if (!estAnesthesiste) {
      alert('❌ Le protocole anesthésique est réservé à l\'anesthésiste.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : ''))
      return
    }
    setLoading(true)
    try {
      const payload = {
        patientId, dateOperation,
        compteRenduAnesthesique,
        ...versPayloadProtocole(instructions),
        prescriptionsConjointes,
      }
      if (protocoleId) await apiClient.patch(`/protocoles-operatoires/${protocoleId}`, payload)
      else await apiClient.post('/protocoles-operatoires', payload)
      alert('✅ Protocole anesthésique enregistré ! Redirection vers la salle de réveil.')
      router.push(`/bloc/salle-de-reveil?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}`)
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
    finally { setLoading(false) }
  }

  return (
    <main className="p-6 h-full overflow-y-auto">
      <BackButton className="mb-3" />
      <PatientIdentityHeader patient={patient || { nom: patientNom }} loading={loadingPatient} intervention="Protocole anesthésique" patientId={patientId} />
      <RealtimeUpdateBanner visible={majDistante} onRecharger={() => window.location.reload()} />
      {!estAnesthesiste && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Le protocole anesthésique est réservé à l'anesthésiste{roleName ? ` (votre rôle actuel est : ${roleName})` : ''}. Vous pouvez consulter cet écran mais pas l'enregistrer.
        </div>
      )}
      <div className="flex gap-6">
      {/* Colonne gauche : Protocole */}
      <section className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Protocole Anesthésique</h2>
          <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold uppercase">Édition Libre</span>
        </div>
        <div className="flex-1 bg-surface-container-lowest rounded-xl shadow-sm flex flex-col p-6 ring-1 ring-black/5">
          <label className="text-sm font-bold text-on-surface-variant mb-3 block">Compte-rendu anesthésique</label>
          <textarea className="flex-1 w-full bg-surface-container-low rounded-lg p-4 text-on-surface border-none resize-none leading-relaxed"
            placeholder="Saisissez ici la technique d'anesthésie réalisée, les produits/doses administrés et les éventuels incidents per-opératoires..."
            value={compteRenduAnesthesique} onChange={e => setCompteRenduAnesthesique(e.target.value)}></textarea>
        </div>
      </section>

      {/* Colonne droite : Instructions */}
      <section className="w-[500px] flex flex-col space-y-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
        <h2 className="text-2xl font-extrabold text-amber-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600">priority_high</span>
          Instructions Post-opératoires
        </h2>
        <InstructionsPostOpForm value={instructions} onChange={setInstructions} />

        {/* Valider */}
        <div className="flex justify-end pt-4 pb-8">
          <button onClick={handleSubmit} disabled={loading || !estAnesthesiste}
            title={!estAnesthesiste ? 'Réservé à l\'anesthésiste' : undefined}
            className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined">save</span>
            <span>{loading ? 'Enregistrement...' : 'Valider et enregistrer'}</span>
          </button>
        </div>
      </section>
      </div>
    </main>
  )
  }
