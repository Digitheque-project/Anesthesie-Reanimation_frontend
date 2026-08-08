'use client'
import { Suspense } from "react";

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { patientService } from '@/lib/api'
import { apiClient } from '@/lib/api/client'
import { useRole } from '@/lib/hooks/useRole'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import Checkbox from '@/components/ui/Checkbox'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import BackButton from '@/components/bloc/layout/BackButton'
import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton'
import SurveillancePanel from '@/components/bloc/surveillance/SurveillancePanel'

const SERVICES_CLINIQUES = [
  'Médecine Interne', 'Chirurgie', 'Réanimation', 'Soins Intensifs',
  'Unité de Surveillance Continue', 'Médecine d\'Urgence', 'Cardiologie',
  'Pneumologie', 'Neurologie', 'Gastro-entérologie'
]

export default function SalleDeReveilPage() {
  return (
    <RoleGate allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.IBODE, RoleClinique.MAJOR]} message="Vous n'avez pas accès à la salle de réveil.">
      <Suspense fallback={<div>Chargement...</div>}>
        <SalleDeReveilPageContent />
      </Suspense>
    </RoleGate>
  );
  }

function SalleDeReveilPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get('patientId') || ''
  const patientNom = searchParams.get('patientNom') || 'Patient'
  const intervention = searchParams.get('intervention') || ''

  const { estAnesthesiste, estIbode, roleName } = useRole()
  // Surveillance de réveil : interface partagée Anesthésiste/IBODE (contrairement à la décision
  // de sortie ci-dessous, qui reste une décision clinique réservée à l'anesthésiste).
  const peutSurveiller = estAnesthesiste || estIbode
  const [nomPersonnel, setNomPersonnel] = useState('')
  const [patient, setPatient] = useState<any>(null)
  const [activiteId, setActiviteId] = useState<string | null>(null)
  // Pré-rempli depuis le vrai horodatage du moment "Arrivée en salle" (posé sur l'écran Arrivée
  // au bloc) — pas une valeur figée : reste modifiable si l'anesthésiste doit la corriger.
  const [heureArrivee, setHeureArrivee] = useState('')
  // Surveillance obligatoire : aucune valeur pré-cochée, chaque item doit être évalué
  // activement (jamais un score par défaut qui n'aurait jamais été vraiment mesuré).
  const [scores, setScores] = useState<Record<'motricite' | 'respiration' | 'pressionArterielle' | 'etatConscience' | 'coloration', number | null>>({
    motricite: null, respiration: null, pressionArterielle: null, etatConscience: null, coloration: null,
  })
  const [evs, setEvs] = useState<number | null>(null)
  const [eqa, setEqa] = useState<number | null>(null)
  const [eva, setEva] = useState(3)
  const [etatInitial, setEtatInitial] = useState({ intubation: false, curarisation: false })
  const [reponse, setReponse] = useState({ intubation: false, curarisation: false })
  const [showOptionSortie, setShowOptionSortie] = useState(false)
  // Pas de destination pré-cochée : l'anesthésiste doit choisir activement où part le patient.
  const [orientation, setOrientation] = useState<'' | 'origine' | 'autres'>('')
  const [serviceChoisi, setServiceChoisi] = useState('')
  const [scoreSCCREId, setScoreSCCREId] = useState<string | null>(null)
  const [checklistSortie, setChecklistSortie] = useState({ signesVitauxStables: false, douleurControlee: false, prescriptionsFaites: false, familleInformee: false })
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (patientId) patientService.getById(patientId).then(setPatient).catch(console.error)
  }, [patientId])

  useEffect(() => {
    const session = obtenirSessionValide()
    if (session) setNomPersonnel(`${session.payload.firstname} ${session.payload.name}`.trim())
  }, [])

  // Récupère la véritable heure d'arrivée au bloc (moment "Arrivée en salle" horodaté lors de
  // l'étape Arrivée au bloc) et l'ActivitePerOp du patient — dont les constantes déjà mesurées
  // pendant l'opération se poursuivent ici, sans repartir d'un nouvel enregistrement.
  useEffect(() => {
    if (!patientId) return
    apiClient.get('/moments-operatoires', { params: { patientId } })
      .then(({ data }) => {
        const arrivee = (Array.isArray(data) ? data : []).find((m: any) => m.label === 'Arrivée en salle' && !m.annule)
        if (arrivee?.horodatage) {
          setHeureArrivee(new Date(arrivee.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }))
        }
      })
      .catch(console.error)
    apiClient.get('/activites-per-op', { params: { patientId, limite: 1 } })
      .then(({ data }) => setActiviteId(data?.data?.[0]?.id ?? null))
      .catch(console.error)
  }, [patientId])

  const scoreItemsIncomplets = Object.values(scores).some(v => v === null) || evs === null || eqa === null
  const scoreTotal = (scores.motricite ?? 0) + (scores.respiration ?? 0) + (scores.pressionArterielle ?? 0) + (scores.etatConscience ?? 0) + (scores.coloration ?? 0)
  const checklistComplete = Object.values(checklistSortie).every(Boolean)

  const handleEnregistrerScore = async () => {
    if (!peutSurveiller) { alert('❌ La surveillance de réveil est réservée à l\'anesthésiste et à l\'IBODE.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : '')); return }
    if (scoreItemsIncomplets) { alert('❌ Évaluez chaque item de surveillance (SCCRE, EVS, EQA) avant d\'enregistrer le score.'); return }
    try {
      const { data } = await apiClient.post('/scores-sccre', {
        patientId: patientId || patient?.id,
        heureArrivee, dateEvaluation: new Date().toISOString().split('T')[0],
        ...scores, evs, eqa, eva, etatInitial, reponse, sortieAutorisee: false
      })
      setScoreSCCREId(data.id)
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur lors de l\'enregistrement du score : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
  }

  const handleValiderSortie = async () => {
    if (!estAnesthesiste) { alert('❌ L\'autorisation de sortie est réservée à l\'anesthésiste.' + (roleName ? ` Votre rôle actuel est : ${roleName}.` : '')); return }
    if (!scoreSCCREId) { alert('❌ Enregistrez d\'abord le score de réveil'); return }
    if (!checklistComplete) { alert('❌ Complétez la checklist de sortie avant de valider'); return }
    if (!orientation) { alert('❌ Choisissez la destination du patient (option de sortie) avant de valider'); return }
    try {
      await apiClient.post('/sorties-reveil', {
        patientId, scoreSCCREId,
        dateHeureSortie: new Date().toISOString(),
        versServiceOrigine: orientation === 'origine',
        autresServicesDestination: orientation === 'autres' ? [serviceChoisi] : [],
        checklistSortie,
      })
      setShowConfirmation(true)
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="font-headline font-extrabold tracking-tight text-on-surface text-2xl">🛏️ Salle de réveil — Surveillance</h1>
        <VoirDossierButton patientId={patientId} variant="icon" />
      </div>

      {/* Contexte patient */}
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3 justify-between">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div><p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Patient</p><p className="text-sm font-bold text-primary">{patient?.nom ? `${patient.nom} ${patient.prenom || ''}`.trim() : patientNom}</p></div>
          <div className="w-px h-8 bg-outline-variant/20" />
          <div><p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Âge / Sexe</p><p className="text-sm font-semibold text-on-surface">{patient?.dateNaissance ? `${Math.max(0, Math.floor((Date.now() - new Date(patient.dateNaissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))} ans` : '—'} / {patient?.sexe || '—'}</p></div>
          <div className="w-px h-8 bg-outline-variant/20" />
          <div><p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Intervention</p><p className="text-sm font-semibold text-on-surface">{intervention || patient?.libelle || '—'}</p></div>
          <div className="w-px h-8 bg-outline-variant/20" />
          <div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Personnel de surveillance</p>
            <p className="text-sm font-bold text-primary">{peutSurveiller ? (nomPersonnel || '—') : `Réservé à l'anesthésiste et à l'IBODE${roleName ? ` (rôle actuel : ${roleName})` : ''}`}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Heure d'arrivée au bloc</label>
          <div className="flex items-center bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
            <span className="material-symbols-outlined text-sm text-primary mr-1.5">schedule</span>
            <input className="bg-transparent border-none p-0 text-sm font-bold text-primary focus:ring-0 w-20" type="time" value={heureArrivee} onChange={e => setHeureArrivee(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Surveillance des constantes — même fonctionnalité qu'en per-opératoire (alerte périodique
          incluse), rattachée à la même ActivitePerOp pour une chronologie continue opération +
          réveil. */}
      <SurveillancePanel patientId={patientId} activiteId={activiteId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* État respiratoire */}
        <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary-container px-6 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-xl">airline_seat_flat</span>
            <h3 className="font-headline font-extrabold text-white uppercase tracking-wide text-sm">État respiratoire / Neuromusculaire</h3>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">À l'arrivée en salle</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex items-center p-3 rounded-lg bg-surface-container-low cursor-pointer">
                <Checkbox size="lg" checked={etatInitial.intubation} onChange={e => setEtatInitial({...etatInitial, intubation: e.target.checked})} />
                <span className="ml-3 text-sm">Intubation (initial)</span>
              </label>
              <label className="flex items-center p-3 rounded-lg bg-surface-container-low cursor-pointer">
                <Checkbox size="lg" checked={etatInitial.curarisation} onChange={e => setEtatInitial({...etatInitial, curarisation: e.target.checked})} />
                <span className="ml-3 text-sm">Curarisation (initial)</span>
              </label>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Réponse observée</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center p-3 rounded-lg bg-surface-container-low cursor-pointer">
                <Checkbox size="sm" checked={reponse.intubation} onChange={e => setReponse({...reponse, intubation: e.target.checked})} />
                <span className="ml-3 text-sm">Extubation obtenue</span>
              </label>
              <label className="flex items-center p-3 rounded-lg bg-surface-container-low cursor-pointer">
                <Checkbox size="sm" checked={reponse.curarisation} onChange={e => setReponse({...reponse, curarisation: e.target.checked})} />
                <span className="ml-3 text-sm">Décurarisation obtenue</span>
              </label>
            </div>
          </div>
        </section>

        {/* Douleur */}
        <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="bg-gradient-to-r from-secondary to-secondary/80 px-6 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-xl">sentiment_dissatisfied</span>
            <h3 className="font-headline font-extrabold text-white uppercase tracking-wide text-sm">Évaluation de la douleur</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase text-on-surface-variant">EVS</label>
              <div className="flex gap-2 mt-1">
                {[1,2,3].map(v => (
                  <button key={v} onClick={() => setEvs(v)} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${evs === v ? 'border-2 border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant/20 bg-surface-container-low'}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-on-surface-variant">EQA</label>
              <div className="flex gap-2 mt-1">
                {[1,2,3].map(v => (
                  <button key={v} onClick={() => setEqa(v)} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${eqa === v ? 'border-2 border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant/20 bg-surface-container-low'}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-on-surface-variant">EVA (0-10) : {eva}</label>
              <input type="range" min="0" max="10" value={eva} onChange={e => setEva(Number(e.target.value))} className="w-full accent-secondary" />
            </div>
          </div>
        </section>
      </div>

      {/* Score SCCRE */}
      <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-xl">monitor_heart</span>
            <h3 className="font-headline font-extrabold text-white uppercase tracking-wide text-sm">Score de réveil (SCCRE)</h3>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase text-white/80">Score total</span>
            <div className="text-2xl font-black text-white">{scoreTotal}<span className="text-sm font-medium text-white/70">/10</span></div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              { label: 'Motricité', key: 'motricite' },
              { label: 'Respiration', key: 'respiration' },
              { label: 'Pression artérielle', key: 'pressionArterielle' },
              { label: 'État de conscience', key: 'etatConscience' },
              { label: 'Coloration', key: 'coloration' },
            ].map(item => (
              <div key={item.key} className="grid grid-cols-12 items-center py-2 border-b border-outline-variant/10 last:border-0">
                <div className="col-span-4"><p className="text-sm font-bold text-on-surface">{item.label}</p></div>
                <div className="col-span-8 flex gap-2">
                  {[0,1,2].map(val => (
                    <button key={val} onClick={() => setScores({...scores, [item.key]: val})}
                      className={`flex-1 py-3 rounded-lg text-[10px] font-bold transition-all ${scores[item.key as keyof typeof scores] === val ? 'bg-indigo-600 text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleEnregistrerScore} disabled={!peutSurveiller || scoreItemsIncomplets}
            title={!peutSurveiller ? 'Réservé à l\'anesthésiste et à l\'IBODE' : scoreItemsIncomplets ? 'Évaluez chaque item avant de valider' : undefined}
            className="mt-6 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {!peutSurveiller ? 'Réservé à l\'anesthésiste et à l\'IBODE' : scoreItemsIncomplets ? 'Évaluez chaque item ci-dessus' : scoreSCCREId ? '✓ Score enregistré — Réenregistrer' : 'Valider le score'}
          </button>
        </div>
      </section>

      {/* Checklist de sortie */}
      <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-container to-primary-container/70 px-6 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-on-primary-container text-xl">checklist</span>
          <h3 className="font-headline font-extrabold text-on-primary-container uppercase tracking-wide text-sm">Checklist de sortie</h3>
        </div>
        <div className="p-6 space-y-2">
          {[
            { key: 'signesVitauxStables', label: 'Signes vitaux stables' },
            { key: 'douleurControlee', label: 'Douleur contrôlée' },
            { key: 'prescriptionsFaites', label: 'Prescriptions post-opératoires faites' },
            { key: 'familleInformee', label: 'Famille / service informé' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg cursor-pointer">
              <Checkbox
                checked={checklistSortie[item.key as keyof typeof checklistSortie]}
                onChange={e => setChecklistSortie({ ...checklistSortie, [item.key]: e.target.checked })} />
              <span className="text-sm font-medium text-on-surface">{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Décision de sortie + Option de sortie */}
      <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-white text-xl">door_open</span>
          <h3 className="font-headline font-extrabold text-white uppercase tracking-wide text-sm">Décision de sortie</h3>
        </div>
        <div className="p-6">
          <button onClick={() => setShowOptionSortie(true)}
            className="px-6 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined">settings</span> Option de sortie
          </button>
          {orientation === 'autres' && serviceChoisi && <p className="mt-2 text-sm font-bold text-primary">Service : {serviceChoisi}</p>}
          {orientation === 'origine' && <p className="mt-2 text-sm font-bold text-emerald-700">Service d'origine</p>}
          {!orientation && <p className="mt-2 text-sm font-bold text-amber-700">Aucune destination choisie pour l'instant</p>}

          <button onClick={handleValiderSortie} disabled={scoreTotal < 9 || !scoreSCCREId || !checklistComplete || !orientation || !estAnesthesiste}
            className={`mt-4 w-full py-3 font-bold rounded-xl transition-all ${
              scoreTotal >= 9 && scoreSCCREId && checklistComplete && orientation && estAnesthesiste ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700' : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
            }`}>
            {scoreTotal < 9 ? 'Score insuffisant (< 9)' : !scoreSCCREId ? 'Enregistrez le score ci-dessus' : !checklistComplete ? 'Complétez la checklist' : !orientation ? "Choisissez l'option de sortie" : !estAnesthesiste ? `Réservé à l'anesthésiste${roleName ? ` (rôle actuel : ${roleName})` : ''}` : 'Autoriser la sortie'}
          </button>
        </div>
      </section>

      {/* Modal Orientation */}
      {showOptionSortie && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-extrabold text-primary mb-6">Orientation du patient</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-xl border border-outline-variant/20 cursor-pointer hover:bg-surface-container-low">
                <input type="radio" name="orientation" checked={orientation === 'origine'} onChange={() => setOrientation('origine')} className="w-7 h-7 text-primary" />
                <span className="font-bold">Service d'origine</span>
              </label>
              <label className="flex items-center space-x-3 p-4 rounded-xl border border-outline-variant/20 cursor-pointer hover:bg-surface-container-low">
                <input type="radio" name="orientation" checked={orientation === 'autres'} onChange={() => setOrientation('autres')} className="w-7 h-7 text-primary" />
                <span className="font-bold">Autres services</span>
              </label>
              {orientation === 'autres' && (
                <select value={serviceChoisi} onChange={e => setServiceChoisi(e.target.value)} className="w-full mt-2 border border-outline-variant/20 rounded-xl p-3 text-sm">
                  <option value="">Sélectionner un service...</option>
                  {SERVICES_CLINIQUES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowOptionSortie(false)} className="px-6 py-2 border border-outline-variant/20 rounded-lg text-sm font-bold hover:bg-surface-container-low">Annuler</button>
              <button onClick={() => setShowOptionSortie(false)} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold">Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation finale */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
            </div>
            <h3 className="text-xl font-extrabold text-on-surface mb-2">Validation terminée !</h3>
            <p className="text-sm text-on-surface-variant mb-6">Toutes les informations ont été enregistrées avec succès.</p>
            <div className="flex gap-3">
              <button onClick={() => router.push('/bloc/archives')}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all">
                📁 Voir les archives
              </button>
              <button onClick={() => router.push('/bloc')}
                className="flex-1 py-3 border border-primary text-primary font-bold rounded-xl hover:bg-primary/5 transition-all">
                🏠 Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
  }
