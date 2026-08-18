'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { patientService, notificationService, planningService } from '@/lib/api'
import { hospitalisationService } from '@/lib/clinical/hospitalisation-service'
import { apiClient } from '@/lib/api/client'
import ModalPlanifierRDV from '@/components/bloc/notification-cpa/ModalPlanifierRDV'
import DossierPatientTabs from '@/components/bloc/dossier-patient/DossierPatientTabs'
import { useRole } from '@/lib/hooks/useRole'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import { libelleUrgence, styleUrgence } from '@/lib/urgence'
import { libelleStatutPatient, styleStatutPatient } from '@/lib/statut'
import { formaterNomPatient } from '@/lib/patient'
import BackButton from '@/components/bloc/layout/BackButton'

// Durée prévue de l'intervention, stockée en minutes par le service prescripteur — affichée en
// heures/minutes, plus lisible pour réserver un créneau de salle ("1 h 30" plutôt que "90 min").
function formaterDuree(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export default function DossierPatientPage() {
  return (
    <Suspense fallback={<main className="p-4">Chargement du dossier...</main>}>
      <DossierPatientPageContent />
    </Suspense>
  )
}

function DossierPatientPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = params.id as string
  const notifId = searchParams.get('notifId') || ''

  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPlanifier, setShowPlanifier] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Service source / date de réception ne vivent pas sur PatientBloc mais sur la notification
  // de prescription elle-même — sans cette fiche, ces deux champs (et le repli de la date
  // d'opération prévue si elle n'a pas été synchronisée sur PatientBloc) restaient vides.
  const [notification, setNotification] = useState<any>(null)
  const { peutPlanifierCpa, estResponsableCpa, roleName } = useRole()
  const [reprisEnCours, setReprisEnCours] = useState(false)

  // Chambre réelle : PatientBloc.chambre n'est jamais renseignée en base (voir page dossier
  // "complet" — même constat). Même résolution ici : épisode d'hospitalisation actif le plus
  // récent → lit occupé → numéro de chambre via le plan de lits du service. Rien n'est affiché si
  // le patient n'est pas hospitalisé.
  const [numeroChambreReel, setNumeroChambreReel] = useState<string | number | null>(null)

  // Groupe sanguin réellement fiable : PatientBloc.groupeSanguin vaut le texte littéral
  // "INCONNU" pour tout patient fraîchement ingéré (jamais une vraie valeur) — l'afficher tel
  // quel montrerait "INCONNU" au médecin. Seule source clinique réelle : le groupage saisi par
  // l'anesthésiste pendant la CPA elle-même.
  const [groupeSanguinCpa, setGroupeSanguinCpa] = useState<string | null>(null)
  useEffect(() => {
    if (!patientId) { setGroupeSanguinCpa(null); return }
    let active = true
    apiClient.get('/cpa', { params: { patientId, limite: 1 } })
      .then(({ data }) => { if (active) setGroupeSanguinCpa(data?.data?.[0]?.groupeSanguinCpa?.groupe || null) })
      .catch(() => { if (active) setGroupeSanguinCpa(null) })
    return () => { active = false }
  }, [patientId])

  useEffect(() => {
    const chuId = patient?.chuId
    const serviceId = obtenirSessionValide()?.acces.serviceId
    if (!patientId || !chuId || !serviceId) { setNumeroChambreReel(null); return }
    let active = true
    hospitalisationService.getByPatient(patientId, serviceId, chuId)
      .then(async (response: any) => {
        if (!active) return
        const episodes = Array.isArray(response) ? response : (response?.data ?? [])
        const actifs = episodes
          .filter((ep: any) => ['ADMIS', 'EN_COURS'].includes(ep.statut))
          .sort((a: any, b: any) => {
            const da = new Date(a.dateAdmission ?? a.dateEntrer ?? 0).getTime()
            const db = new Date(b.dateAdmission ?? b.dateEntrer ?? 0).getTime()
            return db - da
          })
        const episode = actifs[0]
        if (!episode?.litCode) { setNumeroChambreReel(null); return }
        try {
          const plan: any = await hospitalisationService.planLits(serviceId, chuId)
          const chambres = Array.isArray(plan?.chambres) ? plan.chambres : (plan?.data?.chambres ?? [])
          const chambre = chambres.find((c: any) => c.lits?.some((l: any) => l.codeLit === episode.litCode))
          if (!active) return
          setNumeroChambreReel(chambre?.numeroChambre ?? episode.litCode)
        } catch {
          if (active) setNumeroChambreReel(episode.litCode)
        }
      })
      .catch(() => { if (active) setNumeroChambreReel(null) })
    return () => { active = false }
  }, [patientId, patient?.chuId])

  const charger = () => {
    setLoading(true)
    return patientService.getById(patientId).then(data => {
      setPatient(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (patientId) charger()
  }, [patientId])

  useEffect(() => {
    if (notifId) {
      notificationService.getById(notifId).then(setNotification).catch(() => setNotification(null))
    } else if (patientId) {
      notificationService.getAll(1, 100)
        .then((res: any) => setNotification((res.data || []).find((n: any) => n.patientId === patientId) || null))
        .catch(() => setNotification(null))
    }
  }, [notifId, patientId])

  const handleValiderPlanification = async (formData: any) => {
    try {
      setSubmitting(true)
      const [h, m] = (formData.heureRDV || '09:00').split(':').map(Number)
      const fin = new Date()
      fin.setHours(h, m + 30)
      const heureFin = fin.toTimeString().split(' ')[0].substring(0, 5)

      const session = obtenirSessionValide()
      const responsable = session ? `${session.payload.firstname} ${session.payload.name}`.trim() : undefined

      await planningService.reserverCreneau({
        patientId,
        date: formData.dateRDV || new Date().toISOString().split('T')[0],
        heureDebut: formData.heureRDV || '09:00',
        heureFin,
        salle: formData.lieuRDV || 'Salle CPA',
        type: formData.typeRDV || 'CPA',
        responsable,
      })

      if (notifId) {
        await notificationService.planifierRDV(notifId)
      }

      alert('✅ Rendez-vous CPA planifié avec succès ! Le service d\'origine a été notifié.')
      setShowPlanifier(false)
      router.push('/bloc/notification-cpa')
    } catch (err: any) {
      alert('❌ Erreur : ' + (err.response?.data?.message || err.message || 'Erreur inconnue'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReprendreCircuitCpa = async () => {
    if (!confirm('Remettre ce patient en attente de CPA (annule le refus précédent) ?')) return
    setReprisEnCours(true)
    try {
      await patientService.marquerApteCpa(patientId)
      alert('✅ Patient remis en attente de CPA.')
      await charger()
    } catch (err: any) {
      alert('❌ Erreur : ' + (err.response?.data?.message || err.message || 'Erreur inconnue'))
    } finally {
      setReprisEnCours(false)
    }
  }

  if (loading) return <main className="p-4">Chargement du dossier...</main>
  if (!patient) return <main className="p-4">Patient introuvable</main>

  const p = patient

  return (
    <main className="p-4">
      <BackButton className="mb-3" />

      <h1 className="text-3xl font-extrabold text-on-surface mb-2">📁 Dossier Patient</h1>
      <p className="text-sm text-on-surface-variant mb-4">Dossier médical complet et suivi de la prise en charge</p>

      {/* En-tête Patient */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {p.nom?.charAt(0)}{p.prenom?.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-primary">{formaterNomPatient(p)}</h2>
            <p className="text-sm text-on-surface-variant">
              {p.dateNaissance ? `${new Date().getFullYear() - new Date(p.dateNaissance).getFullYear()} ans` : ''} • {p.sexe} • {groupeSanguinCpa || '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {numeroChambreReel != null && (
            <div><span className="text-xs font-bold text-gray-500 uppercase">Chambre</span><p>{numeroChambreReel}</p></div>
          )}
          <div><span className="text-xs font-bold text-gray-500 uppercase">Urgence</span><p className={`font-bold uppercase ${styleUrgence(p.niveauUrgence).texte}`}>{libelleUrgence(p.niveauUrgence)}</p></div>
          <div><span className="text-xs font-bold text-gray-500 uppercase">Statut</span><p className={`font-bold ${styleStatutPatient(p.statut).texte}`}>{libelleStatutPatient(p.statut)}</p></div>
        </div>
      </div>

      {/* Accès direct au dossier patient complet (Service Clinique), en lecture seule */}
      <div className="flex items-center gap-3 my-5">
        <span className="material-symbols-outlined text-on-surface-variant">folder_shared</span>
        <h2 className="text-sm font-extrabold text-on-surface-variant uppercase tracking-wide">Dossier Patient</h2>
        <div className="flex-1 h-px bg-outline-variant/30" />
      </div>
      <div className="mb-5">
        <DossierPatientTabs patientId={patientId} />
      </div>

      {/* Prescription — alertes et risque hémorragique regroupés dans la même plage que la
          prescription chirurgicale, pour que le prescripteur ait toute l'information critique
          d'un coup d'œil sans devoir chercher plus bas dans la page */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-3">
        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">clinical_notes</span> Prescription chirurgicale
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2">
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Intervention prévue</span>
            <p className="font-bold text-lg">{p.libelle || 'Non spécifiée'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Type de chirurgie</span>
            <p className="font-bold">{p.typeChirurgie || '—'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Date et heure prévues de l'opération</span>
            <p className="font-bold">
              {(p.dateIntervention || notification?.dateIntervention)
                ? new Date(p.dateIntervention || notification.dateIntervention).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Non communiquée'}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Durée prévue</span>
            <p className="font-bold">{formaterDuree(p.dureeInterventionMinutes)}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Type d'anesthésie prévu</span>
            <p className="font-bold">{p.typeAnesthesie || '—'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Chirurgien</span>
            <p className="font-bold">{p.chirurgien_nom || notification?.chirurgienNom || '—'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Service source</span>
            {/* p.serviceOrigine et notification.serviceSourceNom sont résolus par le même appel
                ServiceRegistryClient côté backend au moment de l'ingestion — p.serviceOrigine
                d'abord car disponible même si la notification exacte n'a pas été retrouvée
                (notifId absent, ou patient avec plus de 100 notifications). Jamais de repli sur
                l'id brut du service (serviceSourceId) : un identifiant technique n'a rien à faire
                à l'écran. */}
            <p className="font-bold">{p.serviceOrigine || notification?.serviceSourceNom || '—'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase">Date de réception</span>
            <p className="font-bold">
              {notification?.createdAt
                ? new Date(notification.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'}
            </p>
          </div>
        </div>
        {/* Renseignement clinique : contexte rédigé par le prescripteur, en pleine largeur car
            c'est un texte libre qui peut être long. */}
        <div className="p-3 bg-blue-50 rounded-lg text-sm mb-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Renseignement clinique</span>
          <p className="font-bold whitespace-pre-line">{p.renseignementClinique || '—'}</p>
        </div>

        {/* Préparation de la salle : ce que l'équipe doit installer avant l'arrivée du patient. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">medical_services</span> Matériel nécessaire
            </span>
            <p className="font-bold whitespace-pre-line mt-1">{p.materielNecessaire || '—'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">airline_seat_flat</span> Position du patient
            </span>
            <p className="font-bold mt-1">{p.positionPatient || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <span className="text-xs font-bold text-red-700 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">warning</span> Alertes
            </span>
            <p className="font-bold text-red-800 mt-1">{p.alertes || 'Aucune alerte'}</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <span className="text-xs font-bold text-orange-700 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">bloodtype</span> Risque hémorragique
            </span>
            <p className="font-bold text-orange-800 mt-1">{p.risqueHemorragique || 'Non évalué'}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">coronavirus</span> Risque infectieux
            </span>
            <p className="font-bold text-amber-800 mt-1">{p.risqueInfectieux || 'Non évalué'}</p>
          </div>
        </div>
      </div>

      {/* Suivi CPA / planification — après la prescription, puisqu'on ne planifie qu'une fois la
          prescription chirurgicale consultée */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-3">
        <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined">fact_check</span> Suivi CPA
        </h3>

        {p.statut === 'CPA_INAPTE' ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-bold text-red-700">❌ Patient inapte pour le CPA</p>
            {p.motifRefusCpa && <p className="text-sm text-red-800 mt-1">Motif : {p.motifRefusCpa}</p>}
            {estResponsableCpa ? (
              <button onClick={handleReprendreCircuitCpa} disabled={reprisEnCours}
                className="mt-3 px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800 disabled:opacity-50 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">restart_alt</span>
                {reprisEnCours ? 'Reprise...' : 'Reprendre le circuit CPA'}
              </button>
            ) : (
              <p className="text-xs text-red-700/80 mt-2">Seul le Responsable CPA peut remettre ce patient dans le circuit{roleName ? ` (votre rôle : ${roleName})` : ''}.</p>
            )}
          </div>
        ) : p.statut === 'CPA_REALISE' ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-bold text-green-700">✅ CPA réalisée</p>
            <p className="text-xs text-green-800 mt-1">La décision d'aptitude est prise pendant la consultation CPA proprement dite.</p>
          </div>
        ) : p.statut && p.statut !== 'EN_ATTENTE_CPA' ? (
          <div className={`p-3 rounded-lg border ${styleStatutPatient(p.statut).fondClair} border-current/20`}>
            <p className={`text-sm font-bold ${styleStatutPatient(p.statut).texte}`}>✅ CPA validée — statut actuel : {libelleStatutPatient(p.statut)}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant mb-3">
              La décision d'aptitude (Apte / En attente / Refusé) se fait pendant la consultation CPA. Depuis cette fiche, vous pouvez planifier son rendez-vous.
            </p>
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
      </div>

      <ModalPlanifierRDV
        isOpen={showPlanifier}
        onClose={() => setShowPlanifier(false)}
        onValider={handleValiderPlanification}
        patientNom={formaterNomPatient(p)}
        intervention={p.libelle || ''}
        estUrgent={false}
      />

      {/* Consignes */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">list_alt</span> Consignes pré-opératoires
        </h3>
        <p className="text-sm bg-gray-50 p-4 rounded-lg">{p.consignes || 'Aucune consigne'}</p>
      </div>
    </main>
  )
}
