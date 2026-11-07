'use client'

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { planningService, patientService } from '@/lib/api';
import { formaterNomPatient } from '@/lib/patient';
import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton';
import ProgrammeAVenirModal from '@/components/bloc/patient-du-jour/ProgrammeAVenirModal';
import { useRefetchOnFocus } from '@/lib/hooks/useRefetchOnFocus';
import { useRefetchOnRealtimeUpdate } from '@/lib/hooks/useRefetchOnRealtimeUpdate';
import { Icone } from '@/components/ui/Icone';
import { patientsUrgentsEnAttenteCpa } from '@/lib/notifications/urgents-cpa';

type Onglet = 'CPA' | 'VERIFICATION_VEILLE';

const ONGLETS: { type: Onglet; label: string; icone: string; actionLabel: string; cible: string }[] = [
  { type: 'CPA', label: 'Rendez-vous CPA', icone: 'stethoscope', actionLabel: 'Réaliser CPA', cible: '/bloc/consultation-cpa' },
  { type: 'VERIFICATION_VEILLE', label: 'Vérification veille', icone: 'fact_check', actionLabel: 'Réaliser la vérification', cible: '/bloc/verification-veille' },
];

export default function RendezVousPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>('CPA');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [creneaux, setCreneaux] = useState<any[]>([]);
  // Retards : CPA/vérification veille/opération dont la date prévue est dépassée sans que
  // l'étape correspondante soit faite (voir PlanningService.getRetards) — fusionnés dans la
  // liste affichée (le fetch normal de l'onglet CPA exclut au contraire tout ce qui est déjà
  // passé) et marqués en rouge, pour qu'un rendez-vous manqué ne disparaisse jamais silencieusement.
  const [retards, setRetards] = useState<{ cpaRetard: any[]; verificationVeilleRetard: any[]; operationRetard: any[] }>({ cpaRetard: [], verificationVeilleRetard: [], operationRetard: [] });
  const [loading, setLoading] = useState(false);
  const [recherche, setRecherche] = useState('');
  // Filtre optionnel par date d'intervention prévue, pour l'onglet Vérification veille
  // uniquement — cette liste n'est plus liée à un créneau à date fixe (voir plus bas), mais on
  // veut pouvoir se limiter aux patients opérés tel jour, sans devoir chercher parmi tous les
  // patients CPA validée en attente de vérification.
  const [filtreDateVerif, setFiltreDateVerif] = useState(new Date().toISOString().split('T')[0]);
  // Patients déjà planifiés (retirés du fil de prescription dès qu'un créneau CPA leur est
  // réservé, voir PlanningService.reserverCreneau) : sans cette alerte, il fallait parcourir le
  // calendrier jour par jour pour se rendre compte qu'un RDV existait déjà à une autre date.
  const [alerteCpa, setAlerteCpa] = useState<{ total: number; prochaine: string | null } | null>(null);
  const [voirTousCpa, setVoirTousCpa] = useState(false);
  // Même mécanique côté « Vérification veille » : le calendrier ci-dessus démarre sur la date du
  // jour, or les vérifications à faire peuvent être échelonnées sur d'autres jours (la veille de
  // chaque intervention) — on prévient du total + de la prochaine, avec un bouton pour tout
  // afficher d'un coup (voirTousVerif), exactement comme l'alerte RDV CPA.
  const [voirTousVerif, setVoirTousVerif] = useState(false);
  // Vue d'ensemble de la charge à venir (tous patients à opérer, triés par date) — même popup
  // que sur Programme opératoire / non-chirurgical, utile ici pour anticiper sans devoir changer
  // d'écran pendant qu'on traite les rendez-vous CPA ou les vérifications veille.
  const [showProgrammeAVenir, setShowProgrammeAVenir] = useState(false);
  // Le loading plein écran n'apparaît qu'au tout premier chargement : les rafraîchissements
  // d'arrière-plan (temps réel, retour de focus) ne doivent pas faire clignoter "Chargement...".
  const aDejaCharge = useRef(false);

  useEffect(() => {
    if (onglet !== 'CPA') return;
    planningService.getCpaAVenir()
      .then((data: any[]) => {
        const rows = (Array.isArray(data) ? data : []).filter((c: any) =>
          (c.patient?.niveauUrgence ?? 'NORMAL') === 'NORMAL' && c.patient?.statut === 'EN_ATTENTE_CPA'
        );
        setAlerteCpa({ total: rows.length, prochaine: rows[0]?.date || null });
      })
      .catch(console.error);
  }, [onglet]);

  useEffect(() => { charger(); }, [selectedDate, onglet, voirTousCpa]);

  const chargerRetards = () => {
    planningService.getRetards()
      .then((d: any) => setRetards({ cpaRetard: d?.cpaRetard || [], verificationVeilleRetard: d?.verificationVeilleRetard || [], operationRetard: d?.operationRetard || [] }))
      .catch(console.error);
  };
  useEffect(() => { chargerRetards(); }, []);
  useRefetchOnFocus(chargerRetards);
  useRefetchOnRealtimeUpdate(chargerRetards);

  const charger = async () => {
    if (!aDejaCharge.current) setLoading(true);
    try {
      if (onglet === 'CPA') {
        // Rendez-vous CPA planifiés : patient normal dont la CPA reste réellement à faire
        // (statut EN_ATTENTE_CPA) — date sélectionnée, ou "tous les rendez-vous à venir" quand
        // voirTousCpa est actif.
        const data = voirTousCpa
          ? await planningService.getCpaAVenir()
          : await planningService.getJour(selectedDate, onglet);
        const rows = (Array.isArray(data) ? data : []).filter((c: any) =>
          (c.patient?.niveauUrgence ?? 'NORMAL') === 'NORMAL' && c.patient?.statut === 'EN_ATTENTE_CPA'
        );
        // CPA déjà validée par le Responsable CPA (décision APTE), médicaments d'anesthésie
        // encore à compléter/vérifier par l'anesthésiste — statut CPA_REALISE, non urgent. Ce
        // sont ces patients qui déclenchent le bouton "Vérifier médicament" : toujours visibles,
        // quelle que soit la date sélectionnée (pas de créneau planifié à une date précise).
        const { data: medData } = await patientService.getAll({ statut: 'CPA_REALISE', niveauUrgence: 'NORMAL', limite: 200 });
        const medRows = (Array.isArray(medData) ? medData : []).map((p: any) => ({
          id: p.patientId,
          heureDebut: null,
          dateIntervention: p.dateIntervention || null,
          patient: { id: p.patientId, nom: p.nom, prenom: p.prenom, niveauUrgence: p.niveauUrgence, statut: p.statut },
          type: 'VERIFICATION_MEDICAMENTS',
          chirurgien: p.chirurgien_nom ? { nom: p.chirurgien_nom } : null,
          estUrgence: false,
          sousType: 'VERIF_MEDICAMENT',
          statut: 'VERIF_MEDICAMENT',
        }));
        // Patients URGENTS / TRÈS URGENTS dont la CPA reste à faire : comptés sur le tableau de
        // bord, mais absents de toute liste (ce fil ne gardait que les patients normaux à
        // créneau réservé, le programme opératoire ne les prend qu'une fois prêts). Toujours
        // visibles ici, en tête, quelle que soit la date : leur CPA est une VPA immédiate (la
        // Prescription les retire, même liste : voir lib/notifications/urgents-cpa).
        const urgentRows = (await patientsUrgentsEnAttenteCpa()).map((p: any) => ({
          id: `vpa-${p.patientId}`,
          heureDebut: null,
          dateIntervention: p.dateIntervention || null,
          patient: { id: p.patientId, nom: p.nom, prenom: p.prenom, niveauUrgence: p.niveauUrgence, statut: p.statut },
          type: 'CPA',
          chirurgien: p.chirurgien_nom ? { nom: p.chirurgien_nom } : null,
          intervention: p.libelle || p.typeChirurgie || '',
          estUrgence: true,
          niveau: p.niveauUrgence,
          sousType: 'VPA_URGENTE',
          statut: 'VPA_URGENTE',
        }));
        setCreneaux([...urgentRows, ...medRows, ...rows]);
      } else if (onglet === 'VERIFICATION_VEILLE') {
        // La vérification veille ne dépend plus d'un créneau planifié à une date précise : tout
        // patient dont la CPA a été validée ET dont les médicaments ont été vérifiés par
        // l'anesthésiste (statut EN_ATTENTE_VERIFICATION_VEILLE, apte, non urgent — sans objet
        // pour une VPA en urgence) doit y être visible tant qu'il n'a pas été vérifié, qu'une
        // date ait été posée ou non.
        const { data } = await patientService.getAll({ statut: 'EN_ATTENTE_VERIFICATION_VEILLE', niveauUrgence: 'NORMAL', limite: 200 });
        const rows = (Array.isArray(data) ? data : []).map((p: any) => ({
          id: p.patientId,
          heureDebut: null,
          dateIntervention: p.dateIntervention || null,
          patient: { id: p.patientId, nom: p.nom, prenom: p.prenom, niveauUrgence: p.niveauUrgence, statut: p.statut },
          type: 'VERIFICATION_VEILLE',
          chirurgien: p.chirurgien_nom ? { nom: p.chirurgien_nom } : null,
          estUrgence: false,
          statut: 'EN_ATTENTE',
        }));
        setCreneaux(rows);
      }
    } catch (err) { console.error(err); }
    finally { aDejaCharge.current = true; setLoading(false); }
  };

  // Un patient dont la CPA/vérification veille vient d'être traitée (depuis un autre onglet, ou
  // page restaurée depuis le cache de navigation du routeur) pouvait rester affiché ici sans
  // rafraîchissement manuel — voir useRefetchOnFocus.
  useRefetchOnFocus(charger);
  // Rafraîchissement en temps réel (sans recharger la page) dès qu'une action est traitée,
  // ici ou depuis un autre poste connecté — voir useRefetchOnRealtimeUpdate.
  useRefetchOnRealtimeUpdate(charger);

  // Fusionne les retards dans la liste affichée et les marque `enRetard` — l'onglet CPA exclut
  // sinon totalement tout ce qui est déjà passé (voir PlanningService.getProchainsRdvCpa), et un
  // rendez-vous manqué disparaissait donc silencieusement au lieu d'attirer l'attention.
  const creneauxAvecRetards = useMemo(() => {
    if (onglet === 'CPA') {
      const idsDejaPresents = new Set(creneaux.map((c: any) => c.id));
      const retardsAAjouter = retards.cpaRetard
        .filter((c: any) => !idsDejaPresents.has(c.id))
        .map((c: any) => ({ ...c, enRetard: true }));
      return [...retardsAAjouter, ...creneaux];
    }
    if (onglet === 'VERIFICATION_VEILLE') {
      const idsEnRetard = new Set(retards.verificationVeilleRetard.map((p: any) => p.patientId));
      return creneaux.map((c: any) => (idsEnRetard.has(c.patient?.id) ? { ...c, enRetard: true } : c));
    }
    return creneaux;
  }, [creneaux, retards, onglet]);

  // Recherche multi-champs côté client (nom patient, type, chirurgien) — même pattern que
  // app/bloc/rapports/page.tsx.
  const creneauxFiltres = useMemo(() => {
    let filtres = creneauxAvecRetards;
    if (onglet === 'VERIFICATION_VEILLE' && !voirTousVerif && filtreDateVerif) {
      // Un patient en retard a par définition une date déjà passée : il ne correspondra jamais
      // au filtre "date du jour" et disparaîtrait sinon silencieusement (voir commentaire plus
      // haut sur creneauxAvecRetards) — on l'exempte donc de ce filtre de date.
      filtres = filtres.filter((c: any) => c.enRetard || (c.dateIntervention && new Date(c.dateIntervention).toISOString().split('T')[0] === filtreDateVerif));
    }
    const q = recherche.trim().toLowerCase();
    if (!q) return filtres;
    return filtres.filter((c: any) =>
      [formaterNomPatient(c.patient), c.type, c.chirurgien?.nom].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [creneauxAvecRetards, recherche, onglet, filtreDateVerif, voirTousVerif]);

  // Alerte « vérifications la veille à faire » : calculée à partir de la liste déjà chargée
  // (tous les patients CPA validée, non urgents, en attente de vérification) — le total, et la
  // prochaine (date d'intervention la plus proche, aujourd'hui ou plus tard).
  const alerteVerif = useMemo(() => {
    if (onglet !== 'VERIFICATION_VEILLE') return null;
    const total = creneaux.length;
    if (total === 0) return null;
    const aujourdhui = new Date().toISOString().split('T')[0];
    const dates = creneaux
      .map((c: any) => (c.dateIntervention ? new Date(c.dateIntervention).toISOString().split('T')[0] : null))
      .filter((d: string | null): d is string => d !== null)
      .sort();
    const prochaine = dates.find((d) => d >= aujourdhui) ?? dates[0] ?? null;
    return { total, prochaine };
  }, [creneaux, onglet]);

  const formaterDate = (d: string) => {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const ongletActif = ONGLETS.find(o => o.type === onglet)!;
  const TYPE_LABELS: Record<string, string> = { CPA: 'CPA', VERIFICATION_VEILLE: 'Vérif. veille', VERIFICATION_MEDICAMENTS: 'Vérif. médicaments' };

  // Présentation : même style que la consultation externe (cartes blanches arrondies, bleu
  // #005b82, badges arrondis, petites capitales grises).
  const carte = 'bg-white rounded-2xl shadow-[0px_4px_16px_rgba(17,17,26,0.05)] border border-gray-100';
  const champDate = 'px-3.5 py-2 border border-gray-200 rounded-xl text-[13px] font-semibold text-slate-700 bg-white cursor-pointer w-fit disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#005b82]/20';
  const badgeUrgence: Record<string, string> = {
    TRES_URGENT: 'bg-red-50 text-red-700',
    URGENT: 'bg-amber-50 text-amber-700',
    NORMAL: 'bg-slate-100 text-slate-600',
  };
  const bordureUrgence: Record<string, string> = {
    TRES_URGENT: 'border-l-red-500',
    URGENT: 'border-l-amber-500',
    NORMAL: 'border-l-transparent',
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">Fil de travail</h1>
            <p className="text-[13px] text-slate-500 mt-0.5 capitalize">
              {onglet === 'VERIFICATION_VEILLE' ? 'Tous les patients CPA validée, en attente de vérification' : voirTousCpa ? 'Tous les rendez-vous CPA à venir' : formaterDate(selectedDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onglet === 'CPA' ? (
              <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setVoirTousCpa(false); }} disabled={voirTousCpa}
                className={champDate} />
            ) : (
              <div className="flex items-center gap-2">
                <label className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Icone nom="filter_alt" className="text-[15px]" />
                  Date d&apos;intervention
                </label>
                <input type="date" value={filtreDateVerif} onChange={(e) => setFiltreDateVerif(e.target.value)} disabled={voirTousVerif}
                  className={champDate} />
                {filtreDateVerif && !voirTousVerif && (
                  <button onClick={() => setFiltreDateVerif('')} className="text-[12px] font-bold text-[#005b82] hover:underline">
                    Effacer
                  </button>
                )}
              </div>
            )}
            <button type="button" onClick={() => setShowProgrammeAVenir(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#005b82] text-white rounded-xl text-[13px] font-bold shadow-sm hover:bg-[#004a6b] transition-colors">
              <Icone nom="calendar_month" className="text-[16px]" />
              Programme à venir
            </button>
          </div>
        </div>

        {/* Opérations en retard : comptées dans la pastille du menu, mais ces patients ne sont
            dans aucun onglet de ce fil (ils attendent au Programme opératoire) — sans ce bandeau,
            le fil semblait vide malgré la pastille. */}
        {retards.operationRetard.length > 0 && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-[13px] text-red-800 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Icone nom="error" className="text-[17px] text-red-600" />
              <span className="flex-1 min-w-[220px] font-semibold">
                {retards.operationRetard.length} opération{retards.operationRetard.length > 1 ? 's' : ''} en retard — la date d&apos;intervention est dépassée et le patient n&apos;est pas encore passé en salle.
              </span>
            </div>
            <ul className="pl-7 space-y-1">
              {retards.operationRetard.map((p: any) => (
                <li key={p.patientId} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{formaterNomPatient(p)}</span>
                  {p.dateIntervention && (
                    <span>— prévue le {new Date(p.dateIntervention).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span>
                  )}
                  <span className="text-red-700/80">
                    ({p.statut === 'PRET_POUR_BLOC'
                      ? 'prêt pour le bloc : à prendre au Programme opératoire, à sa date'
                      : p.statut === 'EN_ATTENTE_VERIFICATION_VEILLE' || p.statut === 'CPA_REALISE'
                        ? 'vérification veille à faire (onglet « Vérification veille »)'
                        : p.statut === 'EN_ATTENTE_CPA'
                          ? 'CPA à faire'
                          : 'à reprogrammer'})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alertes : retards (rouge — rendez-vous manqué) puis rappels à venir (ambre). Les
            lignes concernées sont déjà dans le tableau (voir creneauxAvecRetards). */}
        {onglet === 'CPA' && retards.cpaRetard.length > 0 && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-[13px] text-red-800 flex flex-wrap items-center gap-3">
            <Icone nom="error" className="text-[17px] text-red-600" />
            <span className="flex-1 min-w-[220px] font-semibold">
              {retards.cpaRetard.length} CPA en retard — la date prévue est dépassée{retards.cpaRetard.length > 1 ? ', ces patients restent' : ' — ce patient reste'} affiché{retards.cpaRetard.length > 1 ? 's' : ''} ci-dessous, en tête de liste.
            </span>
          </div>
        )}
        {onglet === 'VERIFICATION_VEILLE' && retards.verificationVeilleRetard.length > 0 && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-[13px] text-red-800 flex flex-wrap items-center gap-3">
            <Icone nom="error" className="text-[17px] text-red-600" />
            <span className="flex-1 min-w-[220px] font-semibold">
              {retards.verificationVeilleRetard.length} vérification{retards.verificationVeilleRetard.length > 1 ? 's' : ''} veille en retard — la date d&apos;intervention prévue est déjà dépassée sans que la vérification soit faite.
            </span>
          </div>
        )}

        {/* Rendez-vous CPA déjà planifiés (patients retirés du fil de prescription dès la réservation) */}
        {onglet === 'CPA' && alerteCpa && alerteCpa.total > 0 && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl text-[13px] text-amber-800 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-medium">
              <Icone nom="event_available" className="text-[17px]" />
              {alerteCpa.total} rendez-vous CPA planifié{alerteCpa.total > 1 ? 's' : ''} à venir
              {alerteCpa.prochaine && ` — le prochain est le ${new Date(alerteCpa.prochaine).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
              {voirTousCpa ? '.' : '. Changez la date ci-dessus pour le voir, ou :'}
            </span>
            <button onClick={() => setVoirTousCpa(v => !v)}
              className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-[12px] font-bold transition-colors whitespace-nowrap">
              {voirTousCpa ? 'Revenir à la date sélectionnée' : 'Voir tous les rendez-vous CPA'}
            </button>
          </div>
        )}

        {/* Vérifications la veille à faire : total + prochaine, avec un bouton pour tout voir. */}
        {onglet === 'VERIFICATION_VEILLE' && alerteVerif && alerteVerif.total > 0 && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl text-[13px] text-amber-800 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-medium">
              <Icone nom="event_available" className="text-[17px]" />
              {alerteVerif.total} vérification{alerteVerif.total > 1 ? 's' : ''} la veille à faire
              {alerteVerif.prochaine && ` — la prochaine est le ${new Date(alerteVerif.prochaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
              {voirTousVerif ? '.' : '. Changez la date ci-dessus pour la voir, ou :'}
            </span>
            <button onClick={() => setVoirTousVerif(v => !v)}
              className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-[12px] font-bold transition-colors whitespace-nowrap">
              {voirTousVerif ? 'Revenir à la date sélectionnée' : 'Voir toutes les vérifications à faire'}
            </button>
          </div>
        )}

        {/* Liste */}
        <div className={`${carte} overflow-hidden flex flex-col`}>
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
              {ONGLETS.map(o => (
                <button
                  key={o.type}
                  onClick={() => setOnglet(o.type)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                    onglet === o.type ? 'bg-[#CFE9EF] text-[#005b82]' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icone nom={o.icone} className="text-[14px]" />
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-[11px] font-semibold text-[#005b82]">{creneauxFiltres.length} patient{creneauxFiltres.length > 1 ? 's' : ''}</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Icone nom="search" className="text-[15px]" />
                </span>
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9 pr-4 py-2 text-[12px] border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-[#005b82]/20 outline-none w-64"
                  placeholder="Rechercher (patient, type, chirurgien)…"
                  type="text"
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-gray-100">
                  {['Date', 'Patient', 'Type', 'Chirurgien', 'Urgence', 'Statut'].map((t) => (
                    <th key={t} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t}</th>
                  ))}
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="p-6">
                    <div className="space-y-3">{[1, 2, 3].map((k) => <div key={k} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                  </td></tr>
                ) : creneauxFiltres.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-[13px] font-medium text-slate-400">
                    {recherche ? 'Aucun résultat pour cette recherche' : 'Aucun patient à traiter'}
                  </td></tr>
                ) : creneauxFiltres.map((c: any, i: number) => {
                  const niveau = c.niveau === 'TRES_URGENT' ? 'TRES_URGENT' : c.estUrgence ? 'URGENT' : 'NORMAL';
                  const nom = formaterNomPatient(c.patient);
                  // VPA immédiate pour un patient urgent : même destination que le bandeau rouge du
                  // tableau de bord (consultation CPA en mode STAT).
                  const vpa = c.sousType === 'VPA_URGENTE';
                  const lienAction = vpa
                    ? `/bloc/consultation-cpa?${new URLSearchParams({ patientId: String(c.patient?.id ?? ''), patientNom: nom, statut: 'STAT', ...(c.intervention ? { intervention: c.intervention } : {}) })}`
                    : `${ongletActif.cible}?patientId=${c.patient?.id}&patientNom=${encodeURIComponent(nom)}`;
                  return (
                    <tr key={c.id || i} className={`hover:bg-slate-50 transition-colors border-l-[6px] ${c.enRetard ? 'bg-red-50/40 border-l-red-400' : bordureUrgence[niveau]}`}>
                      <td className="px-5 py-3.5 text-[13px] font-bold text-slate-700 whitespace-nowrap">
                        {c.heureDebut || (c.dateIntervention ? new Date(c.dateIntervention).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                            <Icone nom="person" className="text-[16px] text-slate-400" />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-800">{nom}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full font-semibold text-[9px] uppercase tracking-wider bg-slate-100 text-slate-700">
                          {TYPE_LABELS[c.type] || c.type || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-slate-600">{c.chirurgien?.nom || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${badgeUrgence[niveau]}`}>
                          {niveau === 'TRES_URGENT' ? 'Très urgent' : niveau === 'URGENT' ? 'Urgent' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {c.enRetard && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider bg-red-50 text-red-700">
                              <Icone nom="error" className="text-[11px]" /> En retard
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            c.statut === 'PLANIFIE' ? 'bg-blue-50 text-blue-700' :
                            c.statut === 'TERMINE' ? 'bg-emerald-50 text-emerald-700' :
                            c.statut === 'VERIF_MEDICAMENT' || c.statut === 'EN_ATTENTE' ? 'bg-amber-50 text-amber-700' :
                            c.statut === 'VPA_URGENTE' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                          }`}>{c.statut === 'VERIF_MEDICAMENT' ? 'Médicaments à vérifier' : c.statut === 'EN_ATTENTE' ? 'En attente' : c.statut === 'VPA_URGENTE' ? 'VPA immédiate' : c.statut === 'PLANIFIE' ? 'Planifié' : (c.statut || '—')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(lienAction)}
                            className={`px-4 py-2 text-white rounded-xl text-[12px] font-bold transition-colors whitespace-nowrap shadow-sm ${vpa ? 'bg-red-600 hover:bg-red-700' : 'bg-[#005b82] hover:bg-[#004a6b]'}`}
                          >
                            {vpa ? 'Faire la VPA' : c.sousType === 'VERIF_MEDICAMENT' ? 'Vérifier médicament' : ongletActif.actionLabel}
                          </button>
                          <VoirDossierButton patientId={c.patient?.id} variant="icon" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ProgrammeAVenirModal
        open={showProgrammeAVenir}
        onClose={() => setShowProgrammeAVenir(false)}
        onChoisirDate={(date) => {
          if (onglet === 'CPA') { setSelectedDate(date); setVoirTousCpa(false); }
          else { setFiltreDateVerif(date); setVoirTousVerif(false); }
        }}
      />
    </div>
  );
}
