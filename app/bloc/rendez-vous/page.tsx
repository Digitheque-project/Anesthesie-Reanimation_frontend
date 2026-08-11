'use client'

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { planningService, patientService } from '@/lib/api';
import { formaterNomPatient } from '@/lib/patient';
import { styleUrgence } from '@/lib/urgence';
import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton';
import { useRefetchOnFocus } from '@/lib/hooks/useRefetchOnFocus';
import { useRefetchOnRealtimeUpdate } from '@/lib/hooks/useRefetchOnRealtimeUpdate';

type Onglet = 'CPA' | 'VERIFICATION_VEILLE';

const ONGLETS: { type: Onglet; label: string; actionLabel: string; cible: string }[] = [
  { type: 'CPA', label: '👨‍⚕️ Rendez-vous CPA', actionLabel: 'Réaliser CPA', cible: '/bloc/consultation-cpa' },
  { type: 'VERIFICATION_VEILLE', label: '🌙 Vérification veille', actionLabel: 'Réaliser la vérification', cible: '/bloc/verification-veille' },
];

export default function RendezVousPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>('CPA');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [creneaux, setCreneaux] = useState<any[]>([]);
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

  const charger = async () => {
    setLoading(true);
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
        setCreneaux([...medRows, ...rows]);
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
    finally { setLoading(false); }
  };

  // Un patient dont la CPA/vérification veille vient d'être traitée (depuis un autre onglet, ou
  // page restaurée depuis le cache de navigation du routeur) pouvait rester affiché ici sans
  // rafraîchissement manuel — voir useRefetchOnFocus.
  useRefetchOnFocus(charger);
  // Rafraîchissement en temps réel (sans recharger la page) dès qu'une action est traitée,
  // ici ou depuis un autre poste connecté — voir useRefetchOnRealtimeUpdate.
  useRefetchOnRealtimeUpdate(charger);

  // Recherche multi-champs côté client (nom patient, type, chirurgien) — même pattern que
  // app/bloc/rapports/page.tsx.
  const creneauxFiltres = useMemo(() => {
    let filtres = creneaux;
    if (onglet === 'VERIFICATION_VEILLE' && !voirTousVerif && filtreDateVerif) {
      filtres = filtres.filter((c: any) => c.dateIntervention && new Date(c.dateIntervention).toISOString().split('T')[0] === filtreDateVerif);
    }
    const q = recherche.trim().toLowerCase();
    if (!q) return filtres;
    return filtres.filter((c: any) =>
      [formaterNomPatient(c.patient), c.type, c.chirurgien?.nom].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [creneaux, recherche, onglet, filtreDateVerif, voirTousVerif]);

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

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">Fil de travail</h1>
          <p className="text-sm text-on-surface-variant mt-1 capitalize">
            {onglet === 'VERIFICATION_VEILLE' ? 'Tous les patients CPA validée, en attente de vérification' : voirTousCpa ? 'Tous les rendez-vous CPA à venir' : formaterDate(selectedDate)}
          </p>
        </div>
        {onglet === 'CPA' ? (
          <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setVoirTousCpa(false); }} disabled={voirTousCpa}
            className="px-4 py-2 border border-outline-variant/50 rounded-lg text-sm font-bold cursor-pointer bg-white shadow-sm w-fit disabled:opacity-50 disabled:cursor-not-allowed" />
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg">filter_alt</span>
              Filtrer par date d'intervention
            </label>
            <input type="date" value={filtreDateVerif} onChange={(e) => setFiltreDateVerif(e.target.value)} disabled={voirTousVerif}
              className="px-4 py-2 border border-outline-variant/50 rounded-lg text-sm font-bold cursor-pointer bg-white shadow-sm w-fit disabled:opacity-50 disabled:cursor-not-allowed" />
            {filtreDateVerif && !voirTousVerif && (
              <button onClick={() => setFiltreDateVerif('')} className="text-xs font-bold text-primary hover:underline">
                Effacer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alerte RDV CPA déjà planifiés (patients retirés du fil de prescription dès la réservation) */}
      {onglet === 'CPA' && alerteCpa && alerteCpa.total > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">event_available</span>
            {alerteCpa.total} rendez-vous CPA planifié{alerteCpa.total > 1 ? 's' : ''} à venir
            {alerteCpa.prochaine && ` — le prochain est le ${new Date(alerteCpa.prochaine).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            {voirTousCpa ? '.' : `. Changez le calendrier ci-dessus pour le voir, ou :`}
          </span>
          <button onClick={() => setVoirTousCpa(v => !v)}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
            {voirTousCpa ? 'Revenir à la date sélectionnée' : 'Voir tous les rendez-vous CPA'}
          </button>
        </div>
      )}

      {/* Alerte vérifications la veille à faire (patients CPA validée en attente de vérification) —
          même mécanique que l'alerte RDV CPA : le calendrier démarre sur la date du jour, or les
          vérifications peuvent être échelonnées sur d'autres jours (la veille de chaque opération) ;
          on affiche le total + la prochaine, avec un bouton pour tout voir d'un coup. */}
      {onglet === 'VERIFICATION_VEILLE' && alerteVerif && alerteVerif.total > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">event_available</span>
            {alerteVerif.total} vérification{alerteVerif.total > 1 ? 's' : ''} la veille à faire
            {alerteVerif.prochaine && ` — la prochaine est le ${new Date(alerteVerif.prochaine + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            {voirTousVerif ? '.' : `. Changez le calendrier ci-dessus pour la voir, ou :`}
          </span>
          <button onClick={() => setVoirTousVerif(v => !v)}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
            {voirTousVerif ? 'Revenir à la date sélectionnée' : 'Voir tous les vérifications à faire'}
          </button>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Tabs */}
        <div className="px-6 pt-4 flex border-b border-outline-variant/10 bg-surface-container-lowest">
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-outline-variant/20 shadow-sm">
            {ONGLETS.map(o => (
              <button
                key={o.type}
                onClick={() => setOnglet(o.type)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  onglet === o.type ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Barre recherche */}
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 bg-surface-container-lowest">
          <h3 className="font-headline font-extrabold text-on-surface text-lg">Interventions Planifiées</h3>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold text-on-surface-variant">{creneauxFiltres.length} résultat{creneauxFiltres.length > 1 ? 's' : ''}</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-10 pr-4 py-2 text-xs border border-outline-variant/50 bg-white rounded-lg focus:ring-2 focus:ring-primary/30 outline-none w-64"
                placeholder="Rechercher (patient, type, chirurgien)..."
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-container/60 backdrop-blur">
              <tr className="text-on-surface-variant border-b border-outline-variant/20">
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest">Heure</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest">Patient</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest">Type</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest">Chirurgien</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest">Urgence</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest">Statut</th>
                <th className="px-6 py-3 text-[11px] font-extrabold uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">Chargement...</td></tr>
              ) : creneauxFiltres.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">
                  {recherche ? 'Aucun résultat pour cette recherche' : 'Aucun rendez-vous'}
                </td></tr>
              ) : creneauxFiltres.map((c: any, i: number) => {
                const niveau = c.estUrgence ? 'URGENT' : 'NORMAL';
                const style = styleUrgence(niveau);
                const nom = formaterNomPatient(c.patient);
                return (
                  <tr key={c.id || i} className={`hover:bg-surface-container/30 transition-colors border-l-4 ${style.bordure}`}>
                    <td className="px-6 py-4 font-extrabold text-primary text-sm whitespace-nowrap">
                      {c.heureDebut || (c.dateIntervention ? new Date(c.dateIntervention).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                          {nom.charAt(0)}
                        </div>
                        <span className="font-bold text-on-surface text-sm">{nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-primary/5 text-primary">
                        {TYPE_LABELS[c.type] || c.type || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{c.chirurgien?.nom || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-[10px] font-black rounded uppercase ${style.badge}`}>
                        {niveau === 'URGENT' ? 'URGENT' : 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        c.statut === 'PLANIFIE' ? 'bg-blue-100 text-blue-700' :
                        c.statut === 'TERMINE' ? 'bg-green-100 text-green-700' :
                        c.statut === 'VERIF_MEDICAMENT' ? 'bg-amber-100 text-amber-700' :
                        c.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                      }`}>{c.statut === 'VERIF_MEDICAMENT' ? 'Médicaments à vérifier' : c.statut === 'EN_ATTENTE' ? 'En attente' : (c.statut || '—')}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`${ongletActif.cible}?patientId=${c.patient?.id}&patientNom=${encodeURIComponent(nom)}`)}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                          {c.sousType === 'VERIF_MEDICAMENT' ? 'Vérifier médicament' : ongletActif.actionLabel}
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
  );
}
