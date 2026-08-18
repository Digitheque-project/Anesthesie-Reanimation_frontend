'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import HeaderNotification from '@/components/bloc/notification-cpa/HeaderNotification'
import StatsNotification from '@/components/bloc/notification-cpa/StatsNotification'
import TableauNotifications from '@/components/bloc/notification-cpa/TableauNotifications'
import ModalPlanifierRDV from '@/components/bloc/notification-cpa/ModalPlanifierRDV'
import { useRouter } from 'next/navigation'
import { notificationService, planningService } from '@/lib/api'
import { apiClient } from '@/lib/api/client'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import { useRole } from '@/lib/hooks/useRole'
import { dedupeParPatient } from '@/lib/notifications/dedupe'
import { normaliserDemandeExterne } from '@/lib/notifications/normaliser-demande-externe'
import { jouerSonNotification, type TypeNotificationSon } from '@/lib/notifications/sound'
import { formaterNomPatient } from '@/lib/patient'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import { useRefetchOnFocus } from '@/lib/hooks/useRefetchOnFocus'
import { useRefetchOnRealtimeUpdate } from '@/lib/hooks/useRefetchOnRealtimeUpdate'
import { estPatientTraite } from '@/lib/notifications/patient-traite'

export default function NotificationCPAPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const router = useRouter()
  const { peutPlanifierCpa, roleName } = useRole()
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [showFiltres, setShowFiltres] = useState(false)
  // Le fil de prescription ne doit montrer que les prescriptions pas encore traitées : une fois
  // le RDV CPA planifié, le patient bascule vers la liste "Rendez-vous CPA" et ne doit plus
  // réapparaître ici par défaut (les autres filtres restent disponibles pour l'historique).
  // Les patients déjà traités sont exclus en amont dans `charger` (voir estPatientTraite).
  // "Lue" (cloche) n'est pas filtrée : voir la note dans `charger`.
  const [filtreActif, setFiltreActif] = useState('EN_ATTENTE')
  const [showModal, setShowModal] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<any>(null)
  // IDs déjà vus, pour ne jouer un son que sur une VRAIE nouvelle arrivée détectée entre deux
  // rafraîchissements — jamais au premier chargement de la page (sinon un carillon à chaque
  // ouverture, même quand rien de nouveau ne s'est passé depuis la dernière visite).
  const idsConnus = useRef<Set<string> | null>(null)
  // Le loading plein écran n'apparaît qu'au tout premier chargement : les rafraîchissements
  // d'arrière-plan (temps réel, retour de focus) ne doivent pas faire disparaître la liste —
  // sinon avec une pluie d'évènements la page clignote "Chargement des notifications..." sans fin.
  const aDejaCharge = useRef(false)

  // Pas d'actualisation automatique périodique : chargement au montage seulement, et via le
  // bouton "Actualiser" du header (onActualiser={charger} ci-dessous) ou en revenant sur la
  // page — un rafraîchissement toutes les 20s réordonnait/faisait clignoter la liste sans que
  // l'utilisateur l'ait demandé.
  useEffect(() => {
    charger()
  }, [])

  const determinerSon = (n: any): TypeNotificationSon =>
    n.estUrgent ? 'PATIENT_URGENT' : n.origineExterne ? 'CPA_NORMALE' : 'PRESCRIPTION_NORMALE'

  // Priorité d'affichage si plusieurs nouvelles notifications arrivent dans le même cycle : un
  // patient urgent prime toujours, puis une demande CPA externe, puis une prescription normale.
  const PRIORITE_SON: Record<TypeNotificationSon, number> = { PATIENT_URGENT: 3, CPA_NORMALE: 2, PRESCRIPTION_NORMALE: 1 }

  const charger = async () => {
    try {
      if (!aDejaCharge.current) setLoading(true)
      const [data, demandesExternesRes] = await Promise.all([
        notificationService.getAll(1, 100),
        apiClient.get('/demandes-cpa-externes', { params: { statut: 'EN_ATTENTE' } }).catch(() => ({ data: [] })),
      ])
      const notifs = data.data || []
      const demandesExternes = (Array.isArray(demandesExternesRes.data) ? demandesExternesRes.data : []).map(normaliserDemandeExterne)
      // Un même patient peut apparaître plusieurs fois (plusieurs cycles d'ingestion, demande
      // interne + externe pour le même évènement...) — on ne garde qu'une entrée par patient.
      const toutes = dedupeParPatient([...notifs, ...demandesExternes])

      if (idsConnus.current) {
        // Un patient déjà traité (planifié, CPA réalisée, sorti...) n'est jamais une "nouvelle"
        // notification à signaler — sans ce filtre, une ré-émission d'une prescription/demande
        // déjà prise en charge re-déclenchait le son de nouvelle prescription pour un patient qui
        // a simplement réapparu avec un id inconnu dans la liste (filet de sécurité en plus des
        // gardes de ré-ingestion côté backend).
        const nouvelles = toutes.filter((n: any) => n.id && !idsConnus.current!.has(n.id) && !estPatientTraite(n))
        if (nouvelles.length > 0) {
          const son = nouvelles.map(determinerSon).sort((a, b) => PRIORITE_SON[b] - PRIORITE_SON[a])[0]
          jouerSonNotification(son)
        }
      }
      idsConnus.current = new Set(toutes.map((n: any) => n.id).filter(Boolean))

      // Les patients déjà traités (CPA réalisée/inapte ou plus avancé dans le parcours) sont
      // retirés du fil d'affichage et des statistiques — ils ne doivent plus être "à traiter".
      // La détection de nouveauté ci-dessus reste basée sur l'ensemble complet (`toutes`).
      // NB : on ne filtre PAS ici sur `lu` — "lue" dans la cloche n'équivaut pas à "traitée" : un
      // patient marqué lu mais dont la CPA reste à faire doit continuer d'apparaître dans le fil
      // de travail (seule la cloche retire les notifications lues, voir NotificationModal).
      const actionnables = toutes.filter((n: any) => !estPatientTraite(n))

      setNotifications(actionnables)
      setErreur(null)
    } catch (err) {
      console.error(err)
      // L'échec doit être visible : sans repli sur des données simulées (voir
      // lib/api/notification.service.ts), une liste vide se confondrait sinon avec « aucune
      // prescription à traiter » — c'est-à-dire exactement l'inverse de ce qu'il faut comprendre.
      const e = err as { message?: string; response?: { data?: { message?: string } } }
      setErreur(e.response?.data?.message || e.message || 'Erreur inconnue')
    }
    finally {
      aDejaCharge.current = true
      setLoading(false)
    }
  }

  // Un patient traité (CPA validée, RDV planifié...) depuis un autre onglet, ou une page
  // restaurée depuis le cache de navigation du routeur (retour arrière sans réel remontage),
  // pouvait rester affiché ici indéfiniment sans ce filet — voir useRefetchOnFocus.
  useRefetchOnFocus(charger)
  // Rafraîchissement en temps réel (sans recharger la page) dès qu'une action est traitée,
  // ici ou depuis un autre poste connecté — voir useRefetchOnRealtimeUpdate.
  useRefetchOnRealtimeUpdate(charger)

  const handlePlanifier = (notif: any) => {
    if (!peutPlanifierCpa) { alert('❌ Planification réservée au Responsable CPA, au Major ou à l\'Anesthésiste'); return }
    setSelectedNotif(notif)
    setShowModal(true)
  }

  // 🟢 FONCTION AJOUTÉE : Valider la planification
  const handleValiderPlanification = async (formData: any) => {
    try {
      if (!selectedNotif) return

      const patientId = selectedNotif.patientId || selectedNotif.patient?.id
      if (!patientId) {
        alert('❌ ID patient manquant')
        return
      }

      // Calculer l'heure de fin (30 min plus tard)
      const [h, m] = (formData.heureRDV || '09:00').split(':').map(Number)
      const fin = new Date()
      fin.setHours(h, m + 30)
      const heureFin = fin.toTimeString().split(' ')[0].substring(0, 5)

      if (selectedNotif.origineExterne) {
        // Demande émise par un service externe : planification via l'endpoint dédié, qui crée
        // le créneau et fait avancer le statut de la demande (voir DemandeCpaExterneService.planifier).
        await apiClient.patch(`/demandes-cpa-externes/${selectedNotif.id}/planifier`, {
          type: formData.typeRDV || 'CPA',
          date: formData.dateRDV,
          heureDebut: formData.heureRDV,
          heureFin,
          salle: formData.lieuRDV,
        })
      } else {
        const session = obtenirSessionValide()
        const responsable = session ? `${session.payload.firstname} ${session.payload.name}`.trim() : undefined

        await planningService.reserverCreneau({
          patientId: patientId,
          date: formData.dateRDV || new Date().toISOString().split('T')[0],
          heureDebut: formData.heureRDV || '09:00',
          heureFin: heureFin,
          salle: formData.lieuRDV || 'Salle CPA',
          estUrgence: selectedNotif.estUrgent || false,
          type: formData.typeRDV || 'CPA',
          responsable,
        })

        // Bascule la notification en RDV_PLANIFIE et notifie automatiquement le service d'origine
        if (selectedNotif.id) {
          await notificationService.planifierRDV(selectedNotif.id)
        }
      }

      alert('✅ Rendez-vous CPA planifié avec succès !')
      setShowModal(false)
      setSelectedNotif(null)
      charger()
    } catch (err: any) {
      console.error(err)
      alert('❌ Erreur : ' + (err.response?.data?.message || err.message || 'Erreur inconnue'))
    }
  }

  // 🟢 FONCTION MODIFIÉE : Vérifier si patient STAT
  // `estUrgent` porte désormais l'échelle commune pour les deux origines (voir lib/urgence.ts).
  const estPatientStat = (notif: any) => Boolean(notif.estUrgent)

  // 🟢 FONCTION MODIFIÉE : Action selon type
  const handleActionPrescription = (notif: any) => {
    if (!estPatientStat(notif)) {
      handlePlanifier(notif)
      return
    }

    const patientId = notif.patientId || notif.patient?.id
    const patientNom = notif.patientNom || formaterNomPatient(notif.patient)
    const intervention = notif.intervention || notif.motif || ''

    // Patient urgent : pas de CPA planifiée à l'avance, la consultation a lieu immédiatement —
    // même interface que la CPA, étiquetée VPA le temps de la consultation. Le statut VPA est
    // déterminé côté page par patient.niveauUrgence (pas par un paramètre d'URL) : voir
    // consultation-cpa/page.tsx.
    router.push(
      `/bloc/consultation-cpa?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}&intervention=${encodeURIComponent(intervention)}`
    )
  }

  const notificationsFiltrees = filtreActif === 'tous' ? notifications
    : filtreActif === 'urgent' ? notifications.filter(n => n.estUrgent)
    : filtreActif === 'EN_ATTENTE' ? notifications.filter(n => n.statut === 'EN_ATTENTE')
    : notifications.filter(n => n.statut === filtreActif)

  // Les compteurs du haut résument exactement la liste affichée sous eux (mêmes filtres) — un
  // chiffre "Priorité haute" ou "RDV Fixés" qui ne correspondait pas aux lignes visibles
  // laissait croire que des patients étaient encore à traiter alors qu'ils n'apparaissaient plus.
  const stats = useMemo(() => ({
    total: notificationsFiltrees.length,
    enAttente: notificationsFiltrees.filter((n: any) => n.statut === 'EN_ATTENTE').length,
    prioriteHaute: notificationsFiltrees.filter((n: any) => n.estUrgent).length,
    rdvFixes24h: notificationsFiltrees.filter((n: any) => n.statut === 'RDV_PLANIFIE').length,
  }), [notificationsFiltrees])

  return (
    <RoleGate
      allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.RESPONSABLE_CPA, RoleClinique.MAJOR]}
      message="Les notifications de CPA ne sont pas accessibles pour votre rôle."
    >
    <div className="p-8 flex flex-col gap-6">
      <HeaderNotification onActualiser={charger} onToggleFiltres={() => setShowFiltres(!showFiltres)} />

      {showFiltres && (
        <div className="bg-white border rounded-xl shadow-lg p-4 w-64 space-y-2">
          {['tous','urgent','EN_ATTENTE','RDV_PLANIFIE','REALISE'].map(f => (
            <button key={f} onClick={() => { setFiltreActif(f); setShowFiltres(false) }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${filtreActif===f ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
              {f==='tous'?'Tous':f==='urgent'?'Priorité':f==='EN_ATTENTE'?'En attente':f==='RDV_PLANIFIE'?'RDV Planifiés':'Réalisés'}
            </button>
          ))}
        </div>
      )}

      {erreur && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600">cloud_off</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">Liste des prescriptions indisponible</p>
            <p className="text-xs text-red-700 mt-0.5">
              {erreur} — la liste ci-dessous peut être incomplète ou périmée. Ne vous y fiez pas pour décider d'une prise en charge.
            </p>
          </div>
          <button onClick={charger} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">
            Réessayer
          </button>
        </div>
      )}

      <StatsNotification stats={stats} />

      {!peutPlanifierCpa && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          La planification d'un RDV CPA est réservée au Responsable CPA, au Major ou à l'Anesthésiste{roleName ? ` (votre rôle : ${roleName})` : ''}. Vous pouvez consulter la liste et ouvrir les dossiers.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement des notifications...</div>
      ) : (
        <TableauNotifications
          notifications={notificationsFiltrees}
          peutPlanifier={peutPlanifierCpa}
          onPlanifier={handlePlanifier}
          onActionUrgent={handleActionPrescription}
          onVoirDossier={(n: any) => {
            if (n.origineExterne && n.id) {
              router.push(`/bloc/demande-cpa-externe/${n.id}`)
              return
            }
            const id = (n.patient as any)?.id || n.patientId
            if (id) router.push(`/bloc/dossier-patient/${id}?notifId=${n.id || ''}`)
          }}
        />
      )}

      {selectedNotif && (
        <ModalPlanifierRDV
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onValider={handleValiderPlanification}
          patientNom={selectedNotif.patientNom || formaterNomPatient(selectedNotif.patient)}
          intervention={selectedNotif.intervention}
          estUrgent={selectedNotif.estUrgent}
        />
      )}
    </div>
    </RoleGate>
  )
}
