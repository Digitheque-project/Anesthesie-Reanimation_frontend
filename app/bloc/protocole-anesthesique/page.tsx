'use client'
import { Suspense } from "react";

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { useOperationRealtime } from '@/lib/hooks/useOperationRealtime'
import RealtimeUpdateBanner from '@/components/bloc/layout/RealtimeUpdateBanner'
import ErreurChargementBanner from '@/components/bloc/layout/ErreurChargementBanner'
import { useRole } from '@/lib/hooks/useRole'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import { patientService } from '@/lib/api'
import { aSaPropreSalleDeReveil } from '@/lib/programme-non-operatoire'
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader'
import BackButton from '@/components/bloc/layout/BackButton'
import PasserButton from '@/components/bloc/layout/PasserButton'
import InstructionsPostOpForm, { DEFAULT_INSTRUCTIONS_POST_OP, InstructionsPostOpData, depuisProtocole, versPayloadProtocole } from '@/components/bloc/protocole/InstructionsPostOpForm'
import ConfirmationRecapModal, { RecapSection } from '@/components/ui/ConfirmationRecapModal'
import { useDraftAutosave, chargerBrouillon, effacerBrouillon, type Brouillon } from '@/lib/hooks/useDraftAutosave'

// Page du protocole anesthésique : compte-rendu libre de l'anesthésiste + Instructions
// Post-Opératoires (surveillance, drainages, prescriptions). Ouverte juste après validation de la
// check-list après intervention (voir app/bloc/apres-operation/page.tsx).
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
  const [erreurPatient, setErreurPatient] = useState(false)

  const chargerPatient = () => {
    if (!patientId) { setLoadingPatient(false); return }
    setLoadingPatient(true)
    setErreurPatient(false)
    patientService.getById(patientId).then(setPatient).catch((err) => { console.error(err); setErreurPatient(true) }).finally(() => setLoadingPatient(false))
  }

  useEffect(() => { chargerPatient() }, [patientId])

  const [dateOperation, setDateOperation] = useState(new Date().toISOString().split('T')[0])
  const [compteRenduAnesthesique, setCompteRenduAnesthesique] = useState('')
  const [personnelIntervention, setPersonnelIntervention] = useState('')
  const [instructions, setInstructions] = useState<InstructionsPostOpData>(DEFAULT_INSTRUCTIONS_POST_OP)
  const [prescriptionsConjointes, setPrescriptionsConjointes] = useState(false)
  const [protocoleId, setProtocoleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [majDistante, setMajDistante] = useState(false)
  const { on } = useOperationRealtime(patientId)
  const { estAnesthesiste, roleName } = useRole()

  useEffect(() => on('protocole-operatoire:maj', () => setMajDistante(true)), [on])

  // Filet de sécurité contre la perte de saisie en cliquant "Retour" avant validation.
  const brouillonKey = patientId ? `protocole-anesthesique-brouillon:${patientId}` : null
  const brouillonSnapshot = { dateOperation, compteRenduAnesthesique, personnelIntervention, instructions, prescriptionsConjointes }
  useDraftAutosave(brouillonKey, brouillonSnapshot)
  const [brouillonTrouve, setBrouillonTrouve] = useState<Brouillon<typeof brouillonSnapshot> | null>(null)
  useEffect(() => {
    if (!brouillonKey) return
    const brouillon = chargerBrouillon<typeof brouillonSnapshot>(brouillonKey)
    if (brouillon) setBrouillonTrouve(brouillon)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brouillonKey])
  const restaurerBrouillon = () => {
    if (!brouillonTrouve) return
    const d = brouillonTrouve.data
    setDateOperation(d.dateOperation)
    setCompteRenduAnesthesique(d.compteRenduAnesthesique)
    setPersonnelIntervention(d.personnelIntervention)
    setInstructions(d.instructions)
    setPrescriptionsConjointes(d.prescriptionsConjointes)
    setBrouillonTrouve(null)
  }

  // Préchargement : si un protocole anesthésique existe déjà pour ce patient aujourd'hui, on
  // récupère le compte-rendu et les Instructions Post-Op déjà saisies au lieu de repartir d'un
  // formulaire vide (sinon la sauvegarde ici écraserait les précédentes).
  useEffect(() => {
    if (!patientId) return
    apiClient.get('/protocoles-operatoires', { params: { patientId, limite: 1 } })
      .then(({ data }) => {
        const existant = data?.data?.[0]
        if (!existant) return
        setProtocoleId(existant.id)
        if (existant.compteRenduAnesthesique) setCompteRenduAnesthesique(existant.compteRenduAnesthesique)
        if (existant.personnelIntervention) setPersonnelIntervention(existant.personnelIntervention)
        setInstructions(depuisProtocole(existant))
        setPrescriptionsConjointes(!!existant.prescriptionsConjointes)
      })
      .catch(console.error)
  }, [patientId])

  const handleOuvrirRecap = () => {
    if (!estAnesthesiste) {
      alert('❌ Le protocole anesthésique est réservé à l\'anesthésiste.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : ''))
      return
    }
    setShowRecap(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        patientId, dateOperation,
        compteRenduAnesthesique,
        personnelIntervention,
        ...versPayloadProtocole(instructions),
        prescriptionsConjointes,
      }
      if (protocoleId) await apiClient.patch(`/protocoles-operatoires/${protocoleId}`, payload)
      else await apiClient.post('/protocoles-operatoires', payload)
      setShowRecap(false)
      if (brouillonKey) effacerBrouillon(brouillonKey)
      // Patient d'un service qui possède sa propre salle de réveil (Imagerie, Scanner) : l'acte
      // anesthésique est terminé, retour au service + archivage du dossier (SORTI) au lieu de la
      // salle de réveil du Bloc. Les patients d'Endoscopie/Urgence, surveillés par le même
      // anesthésiste du Bloc, suivent le flux complet et partent en salle de réveil du Bloc.
      if (aSaPropreSalleDeReveil(patient?.serviceOrigine)) {
        try {
          await patientService.retourServiceOrigine(patientId)
          alert('✅ Protocole anesthésique enregistré ! Patient renvoyé à son service d\'origine et dossier archivé.')
          router.push('/bloc/archives')
        } catch (err: any) {
          // Le protocole EST enregistré (la requête précédente a réussi) mais le patient n'est
          // PAS archivé : ne jamais dire le contraire ni rediriger vers les archives où il
          // n'apparaîtra pas. Il reste visible en salle de réveil du Bloc en attendant.
          console.error(err)
          alert('⚠️ Protocole enregistré, mais le retour du patient à son service d\'origine a échoué : ' + (err.response?.data?.message || err.message || 'erreur inconnue') + '\nLe patient reste visible dans la salle de réveil du Bloc en attendant de réessayer.')
          router.push(`/bloc/salle-de-reveil?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}`)
        }
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

  const drainageValeur = (actif: boolean, mode: string) => actif ? (mode === 'ASPIRATION' ? 'Actif (aspiratif)' : mode === 'REDON' ? 'Actif (Redon)' : 'Actif (siphonnage)') : ''

  const sectionsRecap: RecapSection[] = [
    {
      titre: 'Protocole Anesthésique',
      icone: 'clinical_notes',
      champs: [
        { label: 'Compte-rendu anesthésique', valeur: compteRenduAnesthesique },
        { label: "Personnel pendant l'intervention", valeur: personnelIntervention },
      ],
    },
    {
      titre: 'Surveillance',
      icone: 'monitor_heart',
      champs: [
        { label: 'TA (Tension)', valeur: instructions.surveillance.ta.coche ? 'Oui' : '' },
        { label: 'Pouls', valeur: instructions.surveillance.pouls.coche ? 'Oui' : '' },
        { label: 'FR (Respiration)', valeur: instructions.surveillance.fr.coche ? 'Oui' : '' },
        { label: 'Température', valeur: instructions.surveillance.temperature.coche ? 'Oui' : '' },
        { label: 'Diurèse', valeur: instructions.surveillance.diurese.coche ? 'Oui' : '' },
        { label: 'Autres', valeur: instructions.surveillance.autres.coche ? 'Oui' : '' },
      ],
    },
    {
      titre: 'Drainages',
      icone: 'water_drop',
      champs: [
        { label: 'Sonde naso-gastrique', valeur: drainageValeur(instructions.drainages.sondeNasoGastrique.actif, instructions.drainages.sondeNasoGastrique.mode) },
        { label: 'Drain crâne', valeur: drainageValeur(instructions.drainages.drainCrane.actif, instructions.drainages.drainCrane.mode) },
        { label: 'Drain thorax', valeur: drainageValeur(instructions.drainages.drainThorax.actif, instructions.drainages.drainThorax.mode) },
        { label: 'Drain abdomen gauche', valeur: drainageValeur(instructions.drainages.drainAbdomenGauche.actif, instructions.drainages.drainAbdomenGauche.mode) },
        { label: 'Drain abdomen droit', valeur: drainageValeur(instructions.drainages.drainAbdomenDroit.actif, instructions.drainages.drainAbdomenDroit.mode) },
        { label: 'Membre - Sein - Autres', valeur: drainageValeur(instructions.drainages.membreSeinAutres.actif, instructions.drainages.membreSeinAutres.mode) },
      ],
    },
    {
      titre: 'Prescription à suivre',
      icone: 'prescriptions',
      champs: [
        { label: 'Perfusion bras gauche', valeur: [instructions.prescriptions.perfusionBrasGauche.valeur, instructions.prescriptions.perfusionBrasGauche.enY && `En Y : ${instructions.prescriptions.perfusionBrasGauche.enY}`].filter(Boolean).join(' — ') },
        { label: 'Perfusion bras droit', valeur: [instructions.prescriptions.perfusionBrasDroit.valeur, instructions.prescriptions.perfusionBrasDroit.enY && `En Y : ${instructions.prescriptions.perfusionBrasDroit.enY}`].filter(Boolean).join(' — ') },
        { label: 'Voie centrale', valeur: [instructions.prescriptions.voieCentrale.valeur, instructions.prescriptions.voieCentrale.enY && `En Y : ${instructions.prescriptions.voieCentrale.enY}`].filter(Boolean).join(' — ') },
        { label: 'Antibiotiques', valeur: instructions.prescriptions.antibiotiques },
        { label: 'Antalgiques', valeur: instructions.prescriptions.antalgiques },
        { label: 'Autres', valeur: instructions.prescriptions.autres },
      ],
    },
  ]

  return (
    <main className="p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <BackButton />
        <PasserButton onClick={restaurerBrouillon} disabled={!brouillonTrouve} />
      </div>
      <PatientIdentityHeader patient={patient || { nom: patientNom }} loading={loadingPatient} intervention="Protocole anesthésique" patientId={patientId} />
      <RealtimeUpdateBanner visible={majDistante} onRecharger={() => window.location.reload()} />
      <ErreurChargementBanner visible={erreurPatient} onRecharger={chargerPatient} />
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

          <label className="text-xs font-bold text-on-surface-variant mb-2 mt-4 block">Personnel pendant l'intervention</label>
          <textarea className="w-full h-24 bg-surface-container-low rounded-lg p-4 text-sm text-on-surface border-none resize-none leading-relaxed overflow-y-auto focus:ring-2 focus:ring-primary/20 focus:outline-none"
            placeholder="Chirurgien, aide opératoire, IBODE, IDE... noms du personnel ayant participé à l'intervention"
            value={personnelIntervention} onChange={e => setPersonnelIntervention(e.target.value)}></textarea>
        </section>

        {/* Colonne droite : Instructions post-opératoires */}
        <section className="w-full lg:w-[440px] lg:shrink-0 bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
          <h2 className="text-lg font-extrabold text-amber-900 tracking-tight flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-amber-600">priority_high</span>
            Instructions Post-opératoires
          </h2>
          <InstructionsPostOpForm value={instructions} onChange={setInstructions} />
          <div className="mt-5 pt-4 border-t border-amber-200/70 flex justify-end">
            <button onClick={handleOuvrirRecap} disabled={loading || !estAnesthesiste}
              title={!estAnesthesiste ? 'Réservé à l\'anesthésiste' : undefined}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-3 shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">save</span>
              <span>{loading ? 'Enregistrement...' : 'Valider et enregistrer'}</span>
            </button>
          </div>
        </section>
      </div>

      <ConfirmationRecapModal
        open={showRecap}
        titre="Protocole anesthésique"
        sousTitre="Compte-rendu et instructions post-opératoires — relisez avant de confirmer"
        sections={sectionsRecap}
        onAnnuler={() => setShowRecap(false)}
        onConfirmer={handleSubmit}
        confirmEnCours={loading}
        labelConfirmer="Confirmer et enregistrer"
      />
    </main>
  )
  }
