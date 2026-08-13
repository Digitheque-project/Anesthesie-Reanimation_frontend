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
import { estServiceNonOperatoire } from '@/lib/programme-non-operatoire'
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
      // Patient d'un service non-opératoire (Endoscopie, Urgence, Imagerie) : l'acte anesthésique
      // est terminé, le service d'origine possède sa propre salle de réveil — retour au service +
      // archivage du dossier (SORTI) au lieu de la salle de réveil du Bloc.
      if (estServiceNonOperatoire(patient?.serviceOrigine)) {
        try {
          await patientService.retourServiceOrigine(patientId)
        } catch (err: any) {
          console.error(err)
          alert('⚠️ Protocole enregistré, mais le retour du patient à son service d\'origine a échoué : ' + (err.response?.data?.message || err.message || 'erreur inconnue'))
        }
        alert('✅ Protocole anesthésique enregistré ! Patient renvoyé à son service d\'origine et dossier archivé.')
        router.push('/bloc/archives')
      } else {
        alert('✅ Protocole anesthésique enregistré ! Redirection vers la salle de réveil.')
        router.push(`/bloc/salle-de-reveil?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}`)
      }
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
    finally { setLoading(false) }
  }

  return (
    <main className="p-6">
      <BackButton className="mb-3" />
      <PatientIdentityHeader patient={patient || { nom: patientNom }} loading={loadingPatient} intervention="Protocole anesthésique" patientId={patientId} />
      <RealtimeUpdateBanner visible={majDistante} onRecharger={() => window.location.reload()} />
      {!estAnesthesiste && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Le protocole anesthésique est réservé à l'anesthésiste{roleName ? ` (votre rôle actuel est : ${roleName})` : ''}. Vous pouvez consulter cet écran mais pas l'enregistrer.
        </div>
      )}
      <div className="mt-4 flex flex-col lg:flex-row gap-6 items-start">
        {/* Colonne gauche : Protocole anesthésique — zone compacte (compte-rendu à hauteur fixe,
            scroll interne) pour ne plus occuper tout l'écran */}
        <section className="w-full lg:flex-1 lg:min-w-0 bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">clinical_notes</span>
              Protocole Anesthésique
            </h2>
            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Édition Libre</span>
          </div>
          <label className="text-xs font-bold text-on-surface-variant mb-2 block">Compte-rendu anesthésique</label>
          <textarea className="w-full h-56 bg-surface-container-low rounded-lg p-4 text-sm text-on-surface border-none resize-none leading-relaxed overflow-y-auto focus:ring-2 focus:ring-primary/20 focus:outline-none"
            placeholder="Saisissez ici la technique d'anesthésie réalisée, les produits/doses administrés et les éventuels incidents per-opératoires..."
            value={compteRenduAnesthesique} onChange={e => setCompteRenduAnesthesique(e.target.value)}></textarea>
        </section>

        {/* Colonne droite : Instructions post-opératoires */}
        <section className="w-full lg:w-[440px] lg:shrink-0 bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
          <h2 className="text-lg font-extrabold text-amber-900 tracking-tight flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-amber-600">priority_high</span>
            Instructions Post-opératoires
          </h2>
          <InstructionsPostOpForm value={instructions} onChange={setInstructions} />
          <div className="mt-5 pt-4 border-t border-amber-200/70 flex justify-end">
            <button onClick={handleSubmit} disabled={loading || !estAnesthesiste}
              title={!estAnesthesiste ? 'Réservé à l\'anesthésiste' : undefined}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-3 shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">save</span>
              <span>{loading ? 'Enregistrement...' : 'Valider et enregistrer'}</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  )
  }
