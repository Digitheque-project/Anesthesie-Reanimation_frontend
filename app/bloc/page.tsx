'use client'

import { useState, useEffect } from 'react'
import { rapportsService, notificationService, patientService } from '@/lib/api'
import WelcomeBanner from '@/components/bloc/dashboard/WelcomeBanner'
import EtatGlobalPatients, { type SectionResume } from '@/components/bloc/dashboard/EtatGlobalPatients'
import AlerteBandeau, { type PatientTresUrgent } from '@/components/bloc/dashboard/AlerteBandeau'
import GroupePlanningTable, { LignePlanning } from '@/components/bloc/dashboard/GroupePlanningTable'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import { formaterNomPatient } from '@/lib/patient'
import { useRole } from '@/lib/hooks/useRole'
import { RoleClinique } from '@/lib/auth/role-clinique'
import { estPatientTraite } from '@/lib/notifications/patient-traite'
import { dedupeParPatient } from '@/lib/notifications/dedupe'
import { normaliserDemandeExterne } from '@/lib/notifications/normaliser-demande-externe'
import { apiClient } from '@/lib/api/client'

// Même règle de visibilité que le menu latéral (voir rolesExclus dans Sidebar.tsx) — sans ce
// filtre, le tableau de bord affichait les compteurs et le planning de pages totalement absentes
// du menu du rôle connecté (ex: "Bloc opératoire"/"Salle de réveil" pour un Major ou un
// Responsable CPA, "Prescription"/"CPA" pour un IBODE), sans nulle part où aller les consulter en
// détail.
const BLOCS_EXCLUS: Partial<Record<'prescription' | 'cpa' | 'bloc' | 'reveil', RoleClinique[]>> = {
  prescription: [RoleClinique.IBODE],
  // La CPA se pilote depuis Prescription/Fil de travail (aucune entrée de menu dédiée) — mêmes
  // rôles exclus que ces deux pages.
  cpa: [RoleClinique.IBODE],
  bloc: [RoleClinique.MAJOR, RoleClinique.RESPONSABLE_CPA],
  reveil: [RoleClinique.MAJOR, RoleClinique.RESPONSABLE_CPA, RoleClinique.IBODE],
}

// Le nom patient passe par le formateur commun de l'application (lib/patient.ts). Le tableau de
// bord entretenait sa propre variante, qui rendait « DUPONT, Jean » là où tous les autres écrans
// — dont le fil de prescription — affichent « Dupont Jean » : le même patient ne se présentait
// pas de la même façon selon l'écran.
const nomPatient = formaterNomPatient
const priorite = (niveau?: string): LignePlanning['priorite'] => niveau === 'TRES_URGENT' ? 'TRES_URGENT' : niveau === 'URGENT' ? 'URGENT' : 'NORMAL'
const estAujourdhui = (date?: string | Date | null) => {
  if (!date) return false
  return new Date(date).toDateString() === new Date().toDateString()
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({ totalPatients: 0, urgencesParNiveau: [] })
  const [prescriptions, setPrescriptions] = useState<LignePlanning[]>([])
  const [patientsCpa, setPatientsCpa] = useState<LignePlanning[]>([])
  const [patientsBloc, setPatientsBloc] = useState<LignePlanning[]>([])
  const [patientsReveil, setPatientsReveil] = useState<LignePlanning[]>([])
  const [patientsTresUrgents, setPatientsTresUrgents] = useState<PatientTresUrgent[]>([])
  const session = obtenirSessionValide()
  const { role } = useRole()
  const visible = (cle: keyof typeof BLOCS_EXCLUS) => !role || !BLOCS_EXCLUS[cle]?.includes(role)

  useEffect(() => { chargerToutesLesDonnees() }, [])

  const chargerToutesLesDonnees = async () => {
    setLoading(true)

    const [statsRes, notifsRes, demandesRes, cpaRes, pretRes, encoursRes, reveilRes, tresUrgentsRes] = await Promise.allSettled([
      rapportsService.getStatistiques(),
      notificationService.getAll(1, 100),
      // Les demandes de CPA émises par les autres services (Endoscopie, Imagerie, Urgence...)
      // n'étaient jamais interrogées ici, alors que le fil de prescription les fusionne depuis
      // toujours : ces patients étaient purement absents du tableau de bord.
      apiClient.get('/demandes-cpa-externes', { params: { statut: 'EN_ATTENTE' } }),
      patientService.getAll({ statut: 'EN_ATTENTE_CPA', limite: 50 }),
      patientService.getAll({ statut: 'PRET_POUR_BLOC', limite: 50 }),
      patientService.getAll({ statut: 'EN_COURS_OPERATION', limite: 50 }),
      patientService.getAll({ statut: 'EN_SALLE_REVEIL', limite: 50 }),
      // "En attente de prise en charge" : seulement ceux qui ont encore leur CPA/VPA à faire —
      // sans ce filtre, un patient très urgent déjà opéré ou en salle de réveil réapparaissait
      // ici, alors que la bannière l'envoie justement faire sa CPA.
      patientService.getAll({ niveauUrgence: 'TRES_URGENT', statut: 'EN_ATTENTE_CPA', limite: 50 }),
    ])

    if (statsRes.status === 'fulfilled') setStats(statsRes.value)

    if (tresUrgentsRes.status === 'fulfilled') {
      const liste = tresUrgentsRes.value?.data || []
      setPatientsTresUrgents(liste.map((p: any) => ({ id: p.patientId || p.id, nom: nomPatient(p), intervention: p.libelle || p.typeChirurgie || '' })))
    }

    if (notifsRes.status === 'fulfilled') {
      // EXACTEMENT les mêmes règles que le fil Prescription (voir notification-cpa/page.tsx) —
      // c'est le seul moyen que les deux écrans racontent la même chose du même patient :
      //   1. fusion des demandes de CPA externes ;
      //   2. déduplication par patient (une ligne par patient, toutes sources confondues) ;
      //   3. exclusion des patients déjà traités (estPatientTraite).
      // Les points 1 et 2 manquaient ici : un patient porteur de plusieurs prescriptions
      // apparaissait autant de fois qu'il en avait (jusqu'à 8 lignes pour un même patient sur les
      // données réelles) là où le fil n'en montrait qu'une, et aucun patient venu d'un autre
      // service n'apparaissait du tout.
      // Seule différence assumée avec le fil : la fenêtre du jour (`estAujourdhui`), le bloc étant
      // explicitement intitulé « Aujourd'hui ».
      const demandesExternes = demandesRes.status === 'fulfilled'
        ? (Array.isArray(demandesRes.value?.data) ? demandesRes.value.data : []).map(normaliserDemandeExterne)
        : []
      const enAttente = dedupeParPatient([
        ...(notifsRes.value?.data || []),
        ...demandesExternes,
      ]).filter(
        (n: any) => n.statut === 'EN_ATTENTE' && !estPatientTraite(n) && estAujourdhui(n.createdAt)
      )
      setPrescriptions(enAttente.map((n: any): LignePlanning => {
        const patientId = n.patient?.id || n.patientId
        return {
          priorite: n.estUrgent ? 'URGENT' : priorite(n.patient?.niveauUrgence),
          nom: n.patientNom || nomPatient(n.patient),
          intervention: n.intervention || n.motif || '',
          responsable: n.chirurgienNom || n.chirurgien?.nom || n.prescripteur || n.sourceServiceName || '',
          // Les demandes externes portent `heure` et non `heurePrescription`.
          heure: n.heurePrescription || n.heure,
          actionLabel: 'Traiter',
          // Même destination que le fil de prescription (voir onVoirDossier dans
          // notification-cpa/page.tsx) : une demande externe s'ouvre sur sa fiche dédiée, pas sur
          // le dossier du patient — sinon le clic menait à un écran sans la demande à traiter.
          href: n.origineExterne && n.id
            ? `/bloc/demande-cpa-externe/${n.id}`
            : patientId ? `/bloc/dossier-patient/${patientId}?notifId=${n.id || ''}` : '/bloc/notification-cpa',
        }
      }))
    }

    const versLignePatient = (statut: string, actionLabel: string, cible: string) => (p: any): LignePlanning => {
      const nom = encodeURIComponent(nomPatient(p))
      const intervention = encodeURIComponent(p.libelle || '')
      return {
        priorite: priorite(p.niveauUrgence),
        nom: nomPatient(p),
        intervention: p.libelle || p.typeChirurgie || '',
        responsable: p.chirurgien_nom || '',
        heure: p.dateIntervention ? new Date(p.dateIntervention).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined,
        actionLabel,
        href: `${cible}?patientId=${p.patientId}&patientNom=${nom}&intervention=${intervention}`,
      }
    }

    // Patients apte au circuit CPA et en attente de la consultation elle-même — pas de filtre
    // "aujourd'hui" ici, la date d'intervention (souvent à quelques jours) n'a pas de lien avec
    // la date à laquelle la CPA doit être réalisée.
    if (cpaRes.status === 'fulfilled') {
      const liste = cpaRes.value?.data || []
      setPatientsCpa(liste.map(versLignePatient('EN_ATTENTE_CPA', 'Faire la CPA', '/bloc/consultation-cpa')))
    }

    // Prévu aujourd'hui, ou sans date programmée (à planifier en priorité)
    const duJour = (p: any) => !p.dateIntervention || estAujourdhui(p.dateIntervention)

    const pret = (pretRes.status === 'fulfilled' ? (pretRes.value?.data || []) : []).filter(duJour)
    const encours = (encoursRes.status === 'fulfilled' ? (encoursRes.value?.data || []) : []).filter(duJour)
    setPatientsBloc([
      ...pret.map(versLignePatient('PRET_POUR_BLOC', 'Arrivée au bloc', '/bloc/arrivee-bloc')),
      ...encours.map(versLignePatient('EN_COURS_OPERATION', 'Suivi', '/bloc/activite-pendant-operation')),
    ])

    if (reveilRes.status === 'fulfilled') {
      // Toujours "aujourd'hui" par nature : un patient reste peu de temps en salle de réveil
      const liste = reveilRes.value?.data || []
      setPatientsReveil(liste.map(versLignePatient('EN_SALLE_REVEIL', 'Suivi réveil', '/bloc/salle-de-reveil/suivi')))
    }

    setLoading(false)
  }

  const urgencesParNiveau: { niveauurgence?: string; niveauUrgence?: string; count: string }[] = stats.urgencesParNiveau || []
  const compte = (niveau: string) => Number(urgencesParNiveau.find(u => (u.niveauUrgence || u.niveauurgence) === niveau)?.count || 0)
  const tresUrgentCount = compte('TRES_URGENT')
  const urgentCount = compte('URGENT')
  const normalCount = compte('NORMAL')
  const total = stats.totalPatientsActifs ?? (tresUrgentCount + urgentCount + normalCount)

  return (
    <div className="p-8 space-y-6">
      <WelcomeBanner
        nom={session ? `${session.payload.firstname} ${session.payload.name}` : ''}
        role={session?.acces.roleName || null}
      />

      {!loading && <AlerteBandeau patients={patientsTresUrgents} />}

      <EtatGlobalPatients
        loading={loading}
        sections={([
          visible('prescription') && { titre: 'Prescription — Aujourd\'hui', icon: 'notification_important', accent: 'tertiary', lignes: prescriptions },
          visible('cpa') && { titre: 'CPA — Aujourd\'hui', icon: 'fact_check', accent: 'quaternary', lignes: patientsCpa },
          visible('bloc') && { titre: 'Bloc opératoire — Aujourd\'hui', icon: 'medical_services', accent: 'primary', lignes: patientsBloc },
          visible('reveil') && { titre: 'Salle de réveil', icon: 'bed', accent: 'secondary', lignes: patientsReveil },
        ].filter(Boolean)) as SectionResume[]}
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-on-surface">Planning du jour</h2>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {visible('prescription') && (
            <GroupePlanningTable
              icon="notification_important"
              titre="Fil de prescription — Aujourd'hui"
              accent="tertiary"
              lignes={prescriptions}
              loading={loading}
              emptyMessage="Aucune prescription reçue aujourd'hui"
            />
          )}
          {visible('cpa') && (
            <GroupePlanningTable
              icon="fact_check"
              titre="Patients prêts pour la CPA"
              accent="quaternary"
              lignes={patientsCpa}
              loading={loading}
              emptyMessage="Aucun patient en attente de consultation pré-anesthésique"
            />
          )}
          {visible('bloc') && (
            <GroupePlanningTable
              icon="medical_services"
              titre="Bloc Opératoire — Aujourd'hui"
              accent="primary"
              lignes={patientsBloc}
              loading={loading}
              emptyMessage="Aucun patient prêt ou en cours d'intervention aujourd'hui"
            />
          )}
          {visible('reveil') && (
            <GroupePlanningTable
              icon="bed"
              titre="Salle de Réveil"
              accent="secondary"
              lignes={patientsReveil}
              loading={loading}
              emptyMessage="Personne en salle de réveil actuellement"
            />
          )}
        </div>
      </div>
    </div>
  )
}
