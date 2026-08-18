'use client'
import { Suspense } from "react";

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { patientService } from '@/lib/api'
import { useRole } from '@/lib/hooks/useRole'
import Checkbox from '@/components/ui/Checkbox'
import Radio from '@/components/ui/Radio'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader'
import BackButton from '@/components/bloc/layout/BackButton'
import PasserButton from '@/components/bloc/layout/PasserButton'
import ErreurChargementBanner from '@/components/bloc/layout/ErreurChargementBanner'
import ConfirmationRecapModal, { RecapSection } from '@/components/ui/ConfirmationRecapModal'
import { useDraftAutosave, chargerBrouillon, effacerBrouillon, type Brouillon } from '@/lib/hooks/useDraftAutosave'

export default function ChecklistAvantOpPage() {
  return (
    <RoleGate allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.MAJOR]} message="Vous n'avez pas accès à la check-list avant opération.">
      <Suspense fallback={<div>Chargement...</div>}>
        <ChecklistAvantOpPageContent />
      </Suspense>
    </RoleGate>
  );
}

function ChecklistAvantOpPageContent() {
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
    identiteConfirmee: boolean | null
    interventionSiteConfirmes: boolean | null
    documentationDisponible: boolean | null
    installationConnue: boolean | null
    materielChirurgicalVerifie: boolean
    materielAnesthesiqueVerifie: boolean
    allergiePatient: boolean | null
    risqueIntubation: boolean | null
    risqueSaignement: boolean | null
    notesChirurgicales: string
    notesAnesthesiques: string
    notesIdeIbode: string
  }>({
    dateCreation: new Date().toISOString().split('T')[0],
    // Aucune réponse pré-cochée pour les items Oui/Non : l'utilisateur doit choisir activement
    // (le vert n'apparaît qu'après un clic), jamais "Non" par défaut.
    identiteConfirmee: null, interventionSiteConfirmes: null, documentationDisponible: null,
    installationConnue: null, materielChirurgicalVerifie: false, materielAnesthesiqueVerifie: false,
    allergiePatient: null, risqueIntubation: null, risqueSaignement: null,
    notesChirurgicales: '', notesAnesthesiques: '', notesIdeIbode: '',
  })
  const [loading, setLoading] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const { estAnesthesiste, roleName } = useRole()

  // Filet de sécurité contre la perte de saisie en cliquant "Retour" avant validation — même
  // mécanique que consultation-cpa/verification-veille (voir useDraftAutosave).
  const brouillonKey = patientId ? `checklist-avant-brouillon:${patientId}` : null
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

  // Tous les items de la checklist sont obligatoires : les 4 items Oui/Non, les 2 confirmations
  // de matériel (doivent être cochées), et les 3 points de vérification croisée (doivent être
  // activement répondus Oui/Non, jamais laissés sur une valeur par défaut).
  const reponsesIncompletes = form.identiteConfirmee === null || form.interventionSiteConfirmes === null
    || form.documentationDisponible === null || form.installationConnue === null
    || !form.materielChirurgicalVerifie || !form.materielAnesthesiqueVerifie
    || form.allergiePatient === null || form.risqueIntubation === null || form.risqueSaignement === null

  const ouiNon = (v: boolean | null) => v === true ? 'Oui' : v === false ? 'Non' : ''

  // Ouvre la relecture avant enregistrement — seuls le rôle et la complétude sont vérifiés ici ;
  // l'enregistrement réel n'a lieu que depuis la popup (voir handleSubmit).
  const handleOuvrirRecap = () => {
    if (!estAnesthesiste) {
      alert('❌ La check-list avant opération est réservée à l\'anesthésiste.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : ''))
      return
    }
    if (reponsesIncompletes) {
      alert('❌ Répondez à chaque item Oui/Non avant de valider la check-list.')
      return
    }
    setShowRecap(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Envoyer la checklist au backend
      await apiClient.post('/checklists-avant-op', { patientId, ...form })
      setShowRecap(false)
      if (brouillonKey) effacerBrouillon(brouillonKey)

      // Rediriger vers le Time Out (dernière pause d'équipe avant incision)
      router.push(`/bloc/verification-post-op?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}&intervention=${encodeURIComponent(intervention)}`)

    } catch (err: any) {
      console.error('❌ Erreur validation checklist:', err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
    finally { setLoading(false) }
  }

  const sectionsRecap: RecapSection[] = [
    {
      titre: 'Avant induction anesthésique',
      icone: 'timer_10_alt_1',
      champs: [
        { label: 'Identité du patient confirmée', valeur: ouiNon(form.identiteConfirmee) },
        { label: 'Intervention et site confirmés', valeur: ouiNon(form.interventionSiteConfirmes) },
        { label: 'Documentation disponible en salle', valeur: ouiNon(form.documentationDisponible) },
        { label: "Mode d'installation connu", valeur: form.installationConnue === true ? 'Oui' : form.installationConnue === false ? 'N/A' : '' },
        { label: 'Matériel chirurgical vérifié', valeur: form.materielChirurgicalVerifie ? 'Oui' : '' },
        { label: 'Matériel anesthésique vérifié', valeur: form.materielAnesthesiqueVerifie ? 'Oui' : '' },
        { label: 'Allergie du patient', valeur: ouiNon(form.allergiePatient) },
        { label: "Risque d'intubation difficile", valeur: ouiNon(form.risqueIntubation) },
        { label: 'Risque de saignement important', valeur: ouiNon(form.risqueSaignement) },
      ],
    },
    {
      titre: "Transmission d'équipe",
      icone: 'forum',
      champs: [
        { label: 'Notes chirurgicales', valeur: form.notesChirurgicales },
        { label: 'Notes anesthésiques', valeur: form.notesAnesthesiques },
        { label: 'Notes IDE / IBODE', valeur: form.notesIdeIbode },
      ],
    },
  ]

  return (
    <main className="p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <BackButton className="order-first" />
          <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Check-list avant opération</h1>
        </div>
        <PasserButton onClick={restaurerBrouillon} disabled={!brouillonTrouve} />
      </header>

      <PatientIdentityHeader patient={patient || { nom: patientNom }} loading={loadingPatient} intervention={intervention} patientId={patientId} />
      <ErreurChargementBanner visible={erreurPatient} onRecharger={chargerPatient} />

      {!estAnesthesiste && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          La check-list avant opération est réservée à l'anesthésiste{roleName ? ` (votre rôle actuel est : ${roleName})` : ''}. Vous pouvez consulter cet écran mais pas la valider.
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PHASE 1: AVANT INDUCTION */}
        <section className="bg-surface-container-low rounded-xl p-6 shadow-sm border-t-4 border-primary">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">timer_10_alt_1</span>
            </div>
            <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-wide">Avant Induction Anesthésique</h2>
          </div>
          <p className="text-xs italic text-on-surface-variant mb-6">Temps de pause avant anesthésie</p>
          <div className="space-y-4">
            {/* 1. Identity */}
            <div className="bg-white p-4 rounded-lg border border-outline-variant/10">
              <p className="text-sm font-bold text-primary mb-3">1- Identité du patient :</p>
              <p className="text-xs mb-3">- le patient a décliné son nom. Sinon par défaut, autre moyen de vérification de son identité</p>
              <div className="flex space-x-6">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Radio size="lg" name="identity_check" checked={form.identiteConfirmee === true} onChange={() => setForm({...form, identiteConfirmee: true})} /><span>Oui</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Radio size="lg" name="identity_check" checked={form.identiteConfirmee === false} onChange={() => setForm({...form, identiteConfirmee: false})} /><span>Non</span>
                </label>
              </div>
            </div>

            {/* 2. Intervention & Site */}
            <div className="bg-white p-4 rounded-lg border border-outline-variant/10">
              <p className="text-sm font-bold text-primary mb-3">2- L'intervention et site opération sont confirmés :</p>
              <p className="text-xs mb-2">- Idéalement par le patient et dans tous les cas, par le dossier ou procédure spécifique</p>
              <div className="flex space-x-6 mb-3">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Radio size="lg" name="site_confirme" checked={form.interventionSiteConfirmes === true} onChange={() => setForm({...form, interventionSiteConfirmes: true})} /> Oui</label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Radio size="lg" name="site_confirme" checked={form.interventionSiteConfirmes === false} onChange={() => setForm({...form, interventionSiteConfirmes: false})} /> Non</label>
              </div>
              <p className="text-xs mb-2">- La documentation clinique et para-clinique nécessaire est disponible en salle</p>
              <div className="flex space-x-6">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Radio size="lg" name="documentation_dispo" checked={form.documentationDisponible === true} onChange={() => setForm({...form, documentationDisponible: true})} /> Oui</label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Radio size="lg" name="documentation_dispo" checked={form.documentationDisponible === false} onChange={() => setForm({...form, documentationDisponible: false})} /> Non</label>
              </div>
            </div>

            {/* 3. Installation */}
            <div className="bg-white p-4 rounded-lg border border-outline-variant/10">
              <p className="text-sm font-bold text-primary mb-3">3- Le mode d'installation est :</p>
              <p className="text-xs mb-3">Connu de l'équipe en salle.</p>
              <div className="flex space-x-6">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Radio size="lg" name="installation_connue" checked={form.installationConnue === true} onChange={() => setForm({...form, installationConnue: true})} /> Oui</label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Radio size="lg" name="installation_connue" checked={form.installationConnue === false} onChange={() => setForm({...form, installationConnue: false})} /> N/A</label>
              </div>
            </div>

            {/* 4. Equipment */}
            <div className="bg-white p-4 rounded-lg border border-outline-variant/10">
              <p className="text-sm font-bold text-primary mb-3">4- Le matériel nécessaire pour l'intervention est vérifié :</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs">- pour la partie chirurgicale...</span>
                  <label className="flex items-center gap-2 text-xs"><Checkbox size="lg" checked={form.materielChirurgicalVerifie} onChange={e => setForm({...form, materielChirurgicalVerifie: e.target.checked})} /> oui</label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">- pour la partie anesthésique</span>
                  <label className="flex items-center gap-2 text-xs"><Checkbox size="lg" checked={form.materielAnesthesiqueVerifie} onChange={e => setForm({...form, materielAnesthesiqueVerifie: e.target.checked})} /> oui</label>
                </div>
              </div>
            </div>

            {/* 5. Cross-verification */}
            <div className="bg-white p-4 rounded-lg border border-error/20">
              <p className="text-sm font-bold text-error mb-3">5- Vérification croisée par l'équipe :</p>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/70 mb-3">Points critiques et mesures adéquates à prendre</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs">- Allergie du patient</span>
                  <div className="flex space-x-4">
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><Radio size="lg" accent="error" name="allergie_patient" checked={form.allergiePatient === true} onChange={() => setForm({...form, allergiePatient: true})} /> Oui</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><Radio size="lg" accent="error" name="allergie_patient" checked={form.allergiePatient === false} onChange={() => setForm({...form, allergiePatient: false})} /> Non</label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs leading-tight">- Risque d'inhalation, de difficulté d'intubation</span>
                  <div className="flex space-x-4">
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><Radio size="lg" accent="error" name="risque_intubation" checked={form.risqueIntubation === true} onChange={() => setForm({...form, risqueIntubation: true})} /> Oui</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><Radio size="lg" accent="error" name="risque_intubation" checked={form.risqueIntubation === false} onChange={() => setForm({...form, risqueIntubation: false})} /> Non</label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">- Risque de saignement important</span>
                  <div className="flex space-x-4">
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><Radio size="lg" accent="error" name="risque_saignement" checked={form.risqueSaignement === true} onChange={() => setForm({...form, risqueSaignement: true})} /> Oui</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><Radio size="lg" accent="error" name="risque_saignement" checked={form.risqueSaignement === false} onChange={() => setForm({...form, risqueSaignement: false})} /> Non</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRANSMISSION D'ÉQUIPE — la vérification "ultime" (identité, intervention, site,
            antibioprophylaxie...) juste avant l'incision se fait sur l'écran Time Out séparé
            (checklist pendant-op), pour éviter de la saisir deux fois. */}
        <section className="bg-surface-container-low rounded-xl p-6 shadow-sm border-t-4 border-secondary">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">forum</span>
            </div>
            <h2 className="text-xl font-headline font-bold text-secondary uppercase tracking-wide">Transmission d'équipe</h2>
          </div>
          <p className="text-xs italic text-on-surface-variant mb-6">Informations essentielles à partager sur les éléments à risque</p>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-outline-variant/10">
              <div className="space-y-4">
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs font-bold text-primary">- Sur le plan chirurgical</p>
                  <textarea value={form.notesChirurgicales} onChange={e => setForm({...form, notesChirurgicales: e.target.value})} className="w-full text-xs border border-outline-variant/20 bg-white rounded-md p-2 focus:ring-1 focus:ring-primary focus:outline-none h-28 mt-2" placeholder="Notes chirurgie..."></textarea>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs font-bold text-secondary">- Sur le plan anesthésique</p>
                  <textarea value={form.notesAnesthesiques} onChange={e => setForm({...form, notesAnesthesiques: e.target.value})} className="w-full text-xs border border-outline-variant/20 bg-white rounded-md p-2 focus:ring-1 focus:ring-secondary focus:outline-none h-28 mt-2" placeholder="Notes anesthésie..."></textarea>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs font-bold text-on-surface-variant">- IDE / IBODE</p>
                  <textarea value={form.notesIdeIbode} onChange={e => setForm({...form, notesIdeIbode: e.target.value})} className="w-full text-xs border border-outline-variant/20 bg-white rounded-md p-2 focus:ring-1 focus:outline-none h-28 mt-2" placeholder="Notes IDE/IBODE..."></textarea>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="mt-12 flex justify-end items-center">
        <button onClick={handleOuvrirRecap} disabled={loading || !estAnesthesiste}
          title={!estAnesthesiste ? 'Réservé à l\'anesthésiste' : undefined}
          className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="material-symbols-outlined text-[24px]">check_circle</span>
          <span>{loading ? 'Validation...' : !estAnesthesiste ? 'Accès non autorisé' : 'Valider la check-list'}</span>
        </button>
      </div>

      <ConfirmationRecapModal
        open={showRecap}
        titre="Check-list avant opération"
        sections={sectionsRecap}
        onAnnuler={() => setShowRecap(false)}
        onConfirmer={handleSubmit}
        confirmEnCours={loading}
        labelConfirmer="Confirmer et valider"
      />
    </main>
  )
}
