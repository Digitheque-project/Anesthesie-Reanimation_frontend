'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive, ArrowRight, BarChart2, BedDouble, ClipboardList, HeartPulse, Inbox, Stethoscope, User, Activity,
  type LucideIcon,
} from 'lucide-react'
import { rapportsService, notificationService, patientService } from '@/lib/api'
import AlerteBandeau, { type PatientTresUrgent } from '@/components/bloc/dashboard/AlerteBandeau'
import type { LignePlanning } from '@/components/bloc/dashboard/GroupePlanningTable'
import { navItems } from '@/components/bloc/layout/Sidebar'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import { formaterNomPatient } from '@/lib/patient'
import { useRole } from '@/lib/hooks/useRole'
import { RoleClinique } from '@/lib/auth/role-clinique'
import { estPatientTraite } from '@/lib/notifications/patient-traite'
import { dedupeParPatient } from '@/lib/notifications/dedupe'
import { normaliserDemandeExterne } from '@/lib/notifications/normaliser-demande-externe'
import { sansUrgentsDuFil } from '@/lib/notifications/urgents-cpa'
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
      // Patients urgents en attente de CPA : comptés dans « CPA à faire » (VPA depuis le fil de
      // travail), plus dans les prescriptions — même règle que la page Prescription.
      const urgentsCpa = (cpaRes.status === 'fulfilled' ? (cpaRes.value?.data || []) : [])
        .filter((p: any) => p.niveauUrgence === 'URGENT' || p.niveauUrgence === 'TRES_URGENT')
      const enAttente = sansUrgentsDuFil(dedupeParPatient([
        ...(notifsRes.value?.data || []),
        ...demandesExternes,
      ]).filter(
        (n: any) => n.statut === 'EN_ATTENTE' && !estPatientTraite(n) && estAujourdhui(n.createdAt)
      ), urgentsCpa)
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
      // Patient urgent : sa CPA est une VPA immédiate (mode STAT), comme depuis le bandeau rouge
      // et le fil de travail — jamais une CPA classique à planifier.
      setPatientsCpa(liste.map((p: any) => {
        const ligne = versLignePatient('EN_ATTENTE_CPA', 'Faire la CPA', '/bloc/consultation-cpa')(p)
        return ligne.priorite === 'NORMAL' ? ligne : { ...ligne, actionLabel: 'Faire la VPA', href: `${ligne.href}&statut=STAT` }
      }))
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

  // Une liste unique « Aujourd'hui », chaque patient marqué de son étape du parcours, au
  // lieu de quatre tableaux empilés (même présentation que la consultation externe).
  const etapes = useMemo(() => ([
    visible('prescription') && { cle: 'prescription' as const, ...ETAPES.prescription, lignes: prescriptions },
    visible('cpa') && { cle: 'cpa' as const, ...ETAPES.cpa, lignes: patientsCpa },
    visible('bloc') && { cle: 'bloc' as const, ...ETAPES.bloc, lignes: patientsBloc },
    visible('reveil') && { cle: 'reveil' as const, ...ETAPES.reveil, lignes: patientsReveil },
  ].filter(Boolean) as EtapeAffichee[]), [prescriptions, patientsCpa, patientsBloc, patientsReveil, role]) // eslint-disable-line react-hooks/exhaustive-deps

  const [filtre, setFiltre] = useState<EtapeCle | 'tous'>('tous')
  const lignes = useMemo(() => etapes
    .filter((e) => filtre === 'tous' || e.cle === filtre)
    .flatMap((e) => e.lignes.map((l) => ({ ...l, etape: e })))
    .sort((a, b) => RANG_PRIORITE[a.priorite] - RANG_PRIORITE[b.priorite]), [etapes, filtre])

  // Date calculée après montage (page prérendue : sinon date du build, et erreur d'hydratation).
  const [aujourdhui, setAujourdhui] = useState('')
  useEffect(() => {
    setAujourdhui(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])
  const nomAgent = session ? `${session.payload.firstname} ${session.payload.name}`.trim() : ''

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* En-tête */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight text-gray-900">Tableau de bord</h1>
            <p className="mt-0.5 text-[13px] capitalize text-slate-500">
              {[nomAgent, session?.acces.roleName, aujourdhui].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {!loading && <AlerteBandeau patients={patientsTresUrgents} />}

        {/* Compteurs : un par étape du parcours */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {etapes.map((e) => (
            <CarteChiffre
              key={e.cle}
              icone={e.icone}
              libelle={e.compteur}
              valeur={e.lignes.length}
              detail={detailUrgences(e.lignes)}
              couleur={e.couleur}
              actif={filtre === e.cle}
              onClick={() => setFiltre((f) => (f === e.cle ? 'tous' : e.cle))}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Patients du jour */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0px_4px_16px_rgba(17,17,26,0.05)] xl:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-[14px] font-extrabold text-slate-800">Patients du jour</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-[#005b82]">
                  {lignes.length} patient{lignes.length > 1 ? 's' : ''}{filtre !== 'tous' ? ` · ${ETAPES[filtre].badge}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(['tous', ...etapes.map((e) => e.cle)] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFiltre(c)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${filtre === c ? 'bg-[#CFE9EF] text-[#005b82]' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {c === 'tous' ? 'Tous' : ETAPES[c].badge}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : lignes.length === 0 ? (
              <div className="p-10 text-center text-[13px] font-medium text-slate-400">
                Aucun patient à traiter aujourd&apos;hui.
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {lignes.map((l, i) => <LignePatient key={`${l.etape.cle}-${l.href}-${i}`} ligne={l} />)}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Présentation (même style que le tableau de bord de la consultation externe) ── */

type EtapeCle = 'prescription' | 'cpa' | 'bloc' | 'reveil'
type EtapeAffichee = { cle: EtapeCle; lignes: LignePlanning[] } & (typeof ETAPES)[EtapeCle]

const ETAPES = {
  prescription: { compteur: 'Prescriptions du jour', badge: 'Prescription', icone: Inbox, couleur: 'bg-blue-50 text-blue-600', pastille: 'bg-blue-50 text-blue-700' },
  cpa: { compteur: 'CPA à faire', badge: 'CPA', icone: Stethoscope, couleur: 'bg-amber-50 text-amber-600', pastille: 'bg-amber-50 text-amber-700' },
  bloc: { compteur: 'Au bloc aujourd’hui', badge: 'Bloc', icone: HeartPulse, couleur: 'bg-emerald-50 text-emerald-600', pastille: 'bg-emerald-50 text-emerald-700' },
  reveil: { compteur: 'Salle de réveil', badge: 'Réveil', icone: BedDouble, couleur: 'bg-violet-50 text-violet-600', pastille: 'bg-violet-50 text-violet-700' },
} satisfies Record<EtapeCle, { compteur: string; badge: string; icone: LucideIcon; couleur: string; pastille: string }>

const RANG_PRIORITE: Record<LignePlanning['priorite'], number> = { TRES_URGENT: 0, URGENT: 1, NORMAL: 2 }

const ICONES_MENU: Record<string, LucideIcon> = {
  '/bloc/notification-cpa': Inbox,
  '/bloc/rendez-vous': ClipboardList,
  '/bloc/patient-du-jour': HeartPulse,
  '/bloc/programme-non-operatoire': Activity,
  '/bloc/salle-de-reveil': BedDouble,
  '/bloc/archives': Archive,
  '/bloc/rapport': BarChart2,
}

function detailUrgences(lignes: LignePlanning[]): string {
  const tu = lignes.filter((l) => l.priorite === 'TRES_URGENT').length
  const u = lignes.filter((l) => l.priorite === 'URGENT').length
  if (!tu && !u) return lignes.length ? 'aucune urgence' : 'aucun patient'
  return [tu && `${tu} très urgent${tu > 1 ? 's' : ''}`, u && `${u} urgent${u > 1 ? 's' : ''}`].filter(Boolean).join(' · ')
}

function CarteChiffre({ icone: Icone, libelle, valeur, detail, couleur, actif, onClick }: {
  icone: LucideIcon; libelle: string; valeur: number; detail: string; couleur: string; actif: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-[0px_4px_16px_rgba(17,17,26,0.05)] transition-colors ${actif ? 'border-[#005b82]/40 ring-2 ring-[#005b82]/10' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${couleur}`}>
        <Icone className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{libelle}</p>
        <p className="text-2xl font-black leading-tight text-slate-800">{valeur < 10 ? `0${valeur}` : valeur}</p>
        <p className="mt-0.5 text-[10px] font-medium text-slate-400">{detail}</p>
      </div>
    </button>
  )
}

function LignePatient({ ligne }: { ligne: LignePlanning & { etape: EtapeAffichee } }) {
  const router = useRouter()
  const urgent = ligne.priorite !== 'NORMAL'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(ligne.href)}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(ligne.href) }}
      className="flex cursor-pointer items-center gap-4 rounded-xl border-l-[6px] border-transparent px-3 py-3 transition-colors hover:bg-slate-50"
    >
      <div className="flex min-w-[52px] flex-col items-center">
        <span className="text-[11px] font-bold uppercase text-[#005b82]">Auj.</span>
        <span className={`text-[14px] font-bold ${urgent ? 'text-red-600' : 'text-slate-700'}`}>{ligne.heure || '—'}</span>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
        <User className="h-4 w-4 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800">{ligne.nom || 'Patient inconnu'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${ligne.etape.pastille}`}>
            {ligne.etape.badge}
          </span>
          {ligne.intervention && <span className="max-w-[220px] truncate text-[11px] text-slate-400">{ligne.intervention}</span>}
          {ligne.responsable && <span className="max-w-[160px] truncate text-[11px] text-slate-400">· {ligne.responsable}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {urgent && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-red-700">
            {ligne.priorite === 'TRES_URGENT' ? 'Très urgent' : 'Urgent'}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          {ligne.actionLabel} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}