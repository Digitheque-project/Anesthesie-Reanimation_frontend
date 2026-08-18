'use client';

import { Suspense, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { patientService, planningService } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { useRole } from '@/lib/hooks/useRole';
import { obtenirSessionValide } from '@/lib/auth/central-session';
import MedicamentsAnesthesieModal, { construireLignesInitiales } from '@/components/bloc/medicaments-anesthesie/MedicamentsAnesthesieModal';
import type { MedicamentRow } from '@/components/bloc/medicaments-anesthesie/MedicamentTable';
import { TOTAL_MEDICAMENTS } from '@/lib/data/catalogue-medicaments-anesthesie';
import RoleGate from '@/components/bloc/auth/RoleGate';
import { RoleClinique } from '@/lib/auth/role-clinique';
import PrescriptionCpaModal from '@/components/bloc/prescription/PrescriptionCpaModal';
import BackButton from '@/components/bloc/layout/BackButton';
import ErreurChargementBanner from '@/components/bloc/layout/ErreurChargementBanner';
import PasserButton from '@/components/bloc/layout/PasserButton';
import { exporterFichePdf } from '@/lib/export/export';
import { formaterNomPatient, formaterIdDossier } from '@/lib/patient';
import { estServiceNonOperatoire } from '@/lib/programme-non-operatoire';
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader';
import SommaireCpa from '@/components/bloc/consultation-cpa/SommaireCpa';
import ConfirmationRecapModal from '@/components/ui/ConfirmationRecapModal';
import { useDraftAutosave, chargerBrouillon, effacerBrouillon, type Brouillon } from '@/lib/hooks/useDraftAutosave';

export default function ConsultationCpaPage() {
  return (
    <RoleGate
      allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.RESPONSABLE_CPA, RoleClinique.MAJOR]}
      message="Vous ne devez pas faire de CPA."
    >
      <Suspense fallback={<div>Chargement...</div>}>
        <ConsultationCpaPageContent />
      </Suspense>
    </RoleGate>
  );
}

const DEFAULT_FORM = {
  // Section 1 — Antécédents (fiche papier)
  histoireActuelle: '',
  dernierRepasBoisson: '',
  patientMineur: null as boolean | null,
  autorisationOpererSignee: null as boolean | null,
  antecedentsAnesthesie: null as boolean | null,
  atcdMedicaux: '',
  atcdChirurgicaux: '',
  notesIncidents: '',
  asthme: null as boolean | null,
  tempsSaignement: '' as '' | 'NORMAL' | 'ALLONGE',
  atcdObstetricauxG: '',
  atcdObstetricauxP: '',
  atcdObstetricauxA: '',
  atcdObstetricauxDdr: '',
  allergiesMedicamenteuses: '',
  allergiesAutres: '',
  contraception: '',
  groupeSanguinCpaGroupe: '',
  groupeSanguinCpaPhenotype: '',
  groupeSanguinCpaRai: '',
  atcdFamiliaux: '',
  transfusionsAnterieures: null as boolean | null,
  transfusionsIncidents: '',
  frequenceCardiaque: '',
  taSystolique: '',
  taDiastolique: '',
  taille: '',
  poids: '',
  examenCardiovasculaire: '',
  examenPulmonaire: '',
  examenNeurologique: '',
  colorationConjonctivale: '',
  abordVeineux: '',
  rachis: '',
  ouvertureBuccale: '',
  distanceMentoThyroidienne: '',
  dents: '',
  tabac: '',
  alcool: '',
  // Section 3 — Bilan biologique / paraclinique (fiche papier)
  bilanGb: '', bilanGr: '', bilanHb: '', bilanHt: '', bilanPl: '', bilanTp: '', bilanPq: '', bilanTca: '', bilanFibri: '',
  bilanNa: '', bilanK: '', bilanCl: '', bilanRa: '', bilanGly: '', bilanProt: '', bilanUree: '', bilanCreat: '', bilanAcUr: '',
  ecg: '',
  radioPulmonaire: '',
  echographie: '',
  scanner: '',
  autresExamensParacliniques: '',
  piecesJointes: [] as { label: string; nomFichier: string }[],
  // Aucune valeur pré-cochée : l'utilisateur doit choisir activement (voir aussi
  // antecedentsAnesthesie/scoreMallampati/scoreASA plus bas, gérés en state séparé).
  typeAnesthesie: '',
  sousTypeAnesthesie: '',
  techniqueIntubation: '',
  jeune: '',
  jeuneSolides: '',
  jeuneLiquides: '',
  preparationPhysique: '',
  tachesInfirmieres: '',
  // Section 4 — Conclusion (fiche papier)
  traitementEnCours: '',
  conclusion: '',
  recommandationsProtocole: '',
}

// Reconstitue l'état des lignes du catalogue à partir des médicaments d'anesthésie/réanimation
// déjà enregistrés sur une CPA existante (cochés + mode/dosage/nombre restaurés).
function restaurerMedicamentsAnesthesieRows(items: any[] | undefined | null): MedicamentRow[] {
  const lignes = construireLignesInitiales();
  if (!items?.length) return lignes;
  return lignes.map(ligne => {
    const trouve = items.find((i: any) => i.categorie === ligne.categorie && i.nom === ligne.label);
    if (!trouve) return ligne;
    return {
      ...ligne,
      selected: true,
      mode: trouve.mode === 'QUANTITE' ? 'QUANTITE' : 'DOSAGE',
      dosage: trouve.dosage || '',
      nombre: trouve.nombre != null ? String(trouve.nombre) : '',
    };
  });
}

function formatDateInput(valeur: string | Date | null | undefined): string {
  if (!valeur) return '';
  return new Date(valeur).toISOString().split('T')[0];
}

function ConsultationCpaPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get('patientId') || '';
  const patientNom = searchParams.get('patientNom') || 'Patient';
  const intervention = searchParams.get('intervention') || '';

  const [patient, setPatient] = useState<any>(null);
  const [erreurPatient, setErreurPatient] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [scoreMallampati, setScoreMallampati] = useState<number | null>(null);
  const [scoreASA, setScoreASA] = useState<number | string | null>(null);
  const [decision, setDecision] = useState<'APTE' | 'INAPTE' | 'REPORT' | ''>('');
  // Devenir de l'opération une fois l'aptitude tranchée — distinct de `decision === 'REPORT'`
  // qui concerne la CPA elle-même (à refaire), pas l'opération.
  const [decisionOperation, setDecisionOperation] = useState<'RETENUE' | 'REPORTEE' | 'REFUSEE' | ''>('');
  const [motifRefus, setMotifRefus] = useState('');
  // Date à laquelle la CPA sera refaite (decision === REPORT) — distincte de dateVPA
  // (vérification veille, uniquement pour un patient déjà déclaré APTE) : posée par qui décide
  // le report (Respo CPA/Major, ou l'anesthésiste s'il réalise seul sa CPA), pas réservée à
  // l'anesthésiste rouvrant une CPA déjà validée.
  const [dateReportCpa, setDateReportCpa] = useState('');
  const [heureReportCpa, setHeureReportCpa] = useState('09:00');
  // Nouvelle date d'opération (decisionOperation === REPORTEE, APTE ou INAPTE) — distincte de
  // dateReportCpa (report de la CPA elle-même) : ici l'aptitude est tranchée, seule la date de
  // l'opération change. Répercutée sur PatientBloc.dateIntervention + notification du service
  // source dès la validation (voir handleValider).
  const [dateOperationReportee, setDateOperationReportee] = useState('');
  const [heureOperationReportee, setHeureOperationReportee] = useState('09:00');
  const [dateVPA, setDateVPA] = useState('');
  const [heureVPA, setHeureVPA] = useState('08:00');
  const [loading, setLoading] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showMedicamentModal, setShowMedicamentModal] = useState(false);
  const [medicaments, setMedicaments] = useState<any[]>([]);
  const [nouveauMedicament, setNouveauMedicament] = useState({ premedication: '', dose: '', voieAdmin: '', debut: '', frequence: '' });
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [medicamentsAnesthesieRows, setMedicamentsAnesthesieRows] = useState<MedicamentRow[]>(() => construireLignesInitiales());
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  // Destinataire du partage CPA (professeur responsable CPA) : demandé une seule fois, puis
  // mémorisé en local pour les partages suivants — aucun contact n'est stocké côté serveur.
  const [destinataireCpa, setDestinataireCpa] = useState<{ email: string; telephone: string } | null>(null);
  const [showDestinataireModal, setShowDestinataireModal] = useState(false);
  const [destinataireActionEnAttente, setDestinataireActionEnAttente] = useState<'whatsapp' | 'email' | null>(null);
  const [destinataireEmailSaisi, setDestinataireEmailSaisi] = useState('');
  const [destinataireTelephoneSaisi, setDestinataireTelephoneSaisi] = useState('');

  useEffect(() => {
    try {
      const brut = localStorage.getItem('cpa-destinataire-partage');
      if (brut) setDestinataireCpa(JSON.parse(brut));
    } catch { /* localStorage indisponible ou valeur corrompue : on repart d'un destinataire vide */ }
  }, []);
  const { peutDeciderAptitudeCpa, estAnesthesisteConnecte, estResponsableCpa, estMajor, roleName } = useRole();
  const [dateInterventionInput, setDateInterventionInput] = useState('');
  const [savingDateIntervention, setSavingDateIntervention] = useState(false);
  const [salleOperationInput, setSalleOperationInput] = useState('');
  const [savingSalleOperation, setSavingSalleOperation] = useState(false);
  const [cpaExistante, setCpaExistante] = useState<any>(null);
  const [chargementCpa, setChargementCpa] = useState(true);
  const [historiqueCpa, setHistoriqueCpa] = useState<any[]>([]);
  const [ongletHistorique, setOngletHistorique] = useState(false);
  // Écran de fin de parcours, réservé au seul cas où le patient quitte réellement le circuit à la
  // décision : patient non-urgent d'un service non-opératoire (Endoscopie, Imagerie, Urgence...)
  // dont la CPA est refusée ou reportée — CPAService l'a archivé (SORTI) et renvoyé à son service.
  const [termine, setTermine] = useState(false);

  const estResponsableOuMajor = estResponsableCpa || estMajor;

  const chargerPatient = () => {
    if (!patientId) return;
    setErreurPatient(false);
    patientService.getById(patientId).then(setPatient).catch((err) => { console.error(err); setErreurPatient(true); });
  };

  useEffect(() => { chargerPatient(); }, [patientId]);

  // Retard : la date prévue (CPA ou opération) de ce patient est déjà dépassée sans que l'étape
  // correspondante soit faite (voir PlanningService.getRetards / Fil de travail) — signalé ici
  // directement sur l'écran où l'action à mener se trouve, en plus du bandeau du Fil de travail.
  const [cpaEnRetard, setCpaEnRetard] = useState(false);
  const [operationEnRetard, setOperationEnRetard] = useState(false);
  useEffect(() => {
    const idFinal = patientId || patient?.id;
    if (!idFinal) return;
    planningService.getRetards()
      .then((d: any) => {
        setCpaEnRetard((d?.cpaRetard || []).some((c: any) => c.patientId === idFinal));
        setOperationEnRetard((d?.operationRetard || []).some((p: any) => p.patientId === idFinal));
      })
      .catch(console.error);
  }, [patientId, patient?.id]);

  // Le Major/Responsable CPA remplit et valide la CPA en premier ; l'anesthésiste rouvre
  // ensuite cette même fiche (en lecture seule sur l'examen) pour n'y ajouter que les
  // médicaments d'anesthésie/réanimation et la date de vérification veille.
  useEffect(() => {
    if (!patientId) { setChargementCpa(false); return; }
    apiClient.get('/cpa', { params: { patientId, limite: 10 } })
      .then(({ data }) => {
        const liste = data?.data || [];
        setCpaExistante(liste[0] || null);
        // Quand le patient revient pour refaire sa CPA (après un report, ou plus tard dans son
        // parcours), les tentatives précédentes restent visibles pour contexte — pas juste la
        // dernière écrasant silencieusement l'historique.
        setHistoriqueCpa(liste.slice(1));
      })
      .catch(console.error)
      .finally(() => setChargementCpa(false));
  }, [patientId]);

  // Pré-remplit tout le formulaire avec la CPA déjà enregistrée, pour que l'anesthésiste voie
  // exactement ce que le Major/Responsable CPA a saisi.
  // Même garde-fou que `cpaDejaRemplie` ci-dessus : `cpaExistante` peut être la CPA d'un épisode
  // chirurgical précédent, déjà close, pour un patient revenu avec une nouvelle prescription
  // (statut remis à EN_ATTENTE_CPA). Dans ce cas précis, ne pas pré-remplir — sinon l'anesthésiste
  // voit les constatations d'un ancien épisode comme si elles s'appliquaient au nouveau. Exception :
  // une CPA à REPORT ne touche jamais patient.statut (voir CPAService.create), donc reste
  // pertinente même si le statut est EN_ATTENTE_CPA — c'est la même CPA à reprendre, pas une autre.
  const cpaStalePourEpisodeActuel = !!cpaExistante && !!patient
    && patient.statut === 'EN_ATTENTE_CPA' && cpaExistante.decision !== 'REPORT';
  useEffect(() => {
    // On attend que `patient` soit chargé avant de pré-remplir quoi que ce soit : sans cette
    // attente, un premier passage avec `patient` encore null (fetch en cours) pré-remplissait le
    // formulaire avant même de savoir si cette CPA était pertinente pour l'épisode en cours — et
    // rien ne revenait ensuite l'effacer une fois `patient` chargé et le cas stale détecté.
    if (!cpaExistante || !patient || cpaStalePourEpisodeActuel) return;
    const c = cpaExistante;
    setForm(f => ({
      ...f,
      histoireActuelle: c.histoireActuelle || '',
      dernierRepasBoisson: c.dernierRepasBoisson || '',
      patientMineur: c.patientMineur ?? f.patientMineur,
      autorisationOpererSignee: c.autorisationOpererSignee ?? f.autorisationOpererSignee,
      antecedentsAnesthesie: c.antecedentsAnesthesie ?? f.antecedentsAnesthesie,
      atcdMedicaux: c.atcdMedicaux || '',
      atcdChirurgicaux: c.atcdChirurgicaux || '',
      notesIncidents: c.notesIncidents || '',
      asthme: c.asthme ?? f.asthme,
      tempsSaignement: c.tempsSaignement || '',
      atcdObstetricauxG: c.atcdObstetricaux?.g || '',
      atcdObstetricauxP: c.atcdObstetricaux?.p || '',
      atcdObstetricauxA: c.atcdObstetricaux?.a || '',
      atcdObstetricauxDdr: c.atcdObstetricaux?.ddr || '',
      allergiesMedicamenteuses: c.allergiesMedicamenteuses || '',
      allergiesAutres: c.allergiesAutres || '',
      contraception: c.contraception || '',
      groupeSanguinCpaGroupe: c.groupeSanguinCpa?.groupe || '',
      groupeSanguinCpaPhenotype: c.groupeSanguinCpa?.phenotype || '',
      groupeSanguinCpaRai: c.groupeSanguinCpa?.rai || '',
      atcdFamiliaux: c.atcdFamiliaux || '',
      transfusionsAnterieures: c.transfusionsAnterieures ?? f.transfusionsAnterieures,
      transfusionsIncidents: c.transfusionsIncidents || '',
      frequenceCardiaque: c.frequenceCardiaque != null ? String(c.frequenceCardiaque) : '',
      taSystolique: c.tensionArterielle?.systolique != null ? String(c.tensionArterielle.systolique) : '',
      taDiastolique: c.tensionArterielle?.diastolique != null ? String(c.tensionArterielle.diastolique) : '',
      taille: c.taille != null ? String(c.taille) : '',
      poids: c.poids != null ? String(c.poids) : '',
      examenCardiovasculaire: c.examenCardiovasculaire || '',
      examenPulmonaire: c.examenPulmonaire || '',
      examenNeurologique: c.examenNeurologique || '',
      colorationConjonctivale: c.colorationConjonctivale || f.colorationConjonctivale,
      abordVeineux: c.abordVeineux || '',
      rachis: c.rachis || '',
      ouvertureBuccale: c.ouvertureBuccale != null ? String(c.ouvertureBuccale) : '',
      distanceMentoThyroidienne: c.distanceMentoThyroidienne != null ? String(c.distanceMentoThyroidienne) : '',
      dents: c.dents || f.dents,
      tabac: c.tabac || f.tabac,
      alcool: c.alcool || f.alcool,
      bilanGb: c.bilanBiologique?.gb || '', bilanGr: c.bilanBiologique?.gr || '', bilanHb: c.bilanBiologique?.hb || '',
      bilanHt: c.bilanBiologique?.ht || '', bilanPl: c.bilanBiologique?.pl || '', bilanTp: c.bilanBiologique?.tp || '',
      bilanPq: c.bilanBiologique?.pq || '', bilanTca: c.bilanBiologique?.tca || '', bilanFibri: c.bilanBiologique?.fibri || '',
      bilanNa: c.bilanBiologique?.na || '', bilanK: c.bilanBiologique?.k || '', bilanCl: c.bilanBiologique?.cl || '',
      bilanRa: c.bilanBiologique?.ra || '', bilanGly: c.bilanBiologique?.gly || '', bilanProt: c.bilanBiologique?.prot || '',
      bilanUree: c.bilanBiologique?.uree || '', bilanCreat: c.bilanBiologique?.creat || '', bilanAcUr: c.bilanBiologique?.acUr || '',
      ecg: c.ecg || '',
      radioPulmonaire: c.radioPulmonaire || '',
      echographie: c.echographie || '',
      scanner: c.scanner || '',
      autresExamensParacliniques: c.autresExamensParacliniques || '',
      piecesJointes: c.piecesJointes || [],
      typeAnesthesie: c.typeAnesthesie || f.typeAnesthesie,
      sousTypeAnesthesie: c.sousTypeAnesthesie || '',
      techniqueIntubation: c.techniqueIntubation || f.techniqueIntubation,
      jeune: c.jeune || '',
      preparationPhysique: c.preparationPhysique || '',
      tachesInfirmieres: c.tachesInfirmieres || '',
      traitementEnCours: c.traitementEnCours || '',
      conclusion: c.conclusion || '',
      recommandationsProtocole: c.recommandationsProtocole || '',
    }));
    if (c.mallampati != null) setScoreMallampati(c.mallampati);
    if (c.scoreASA != null) setScoreASA(c.scoreASA);
    if (c.decision) setDecision(c.decision);
    if (c.decisionOperation) setDecisionOperation(c.decisionOperation);
    if (c.motifRefus) setMotifRefus(c.motifRefus);
    if (c.premedicaments?.length) {
      setMedicaments(c.premedicaments.map((p: any) => ({
        premedication: p.nom, dose: p.dose, voieAdmin: p.voieAdministration, debut: p.debut, frequence: p.frequence,
      })));
    }
    setMedicamentsAnesthesieRows(restaurerMedicamentsAnesthesieRows(c.medicamentsAnesthesieReanimation));
    if (c.dateVerificationVeille) setDateVPA(formatDateInput(c.dateVerificationVeille));
    // Dépend de `patient?.statut` plutôt que de `patient` en entier : `patient` change de
    // référence à chaque modification de la date d'intervention (voir
    // handleEnregistrerDateIntervention plus bas) — en dépendre entièrement aurait redéclenché ce
    // pré-remplissage et effacé toute saisie du formulaire déjà en cours à chaque fois que la
    // date d'intervention est modifiée depuis cette même page.
  }, [cpaExistante, patient?.statut, cpaStalePourEpisodeActuel]);

  // Pré-remplit le champ éditable avec la date/heure d'intervention actuellement enregistrée
  useEffect(() => {
    if (patient?.dateIntervention) {
      const d = new Date(patient.dateIntervention);
      const pad = (n: number) => String(n).padStart(2, '0');
      setDateInterventionInput(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, [patient?.dateIntervention]);

  // Pré-remplit le champ éditable avec la salle de bloc actuellement enregistrée
  useEffect(() => {
    setSalleOperationInput(patient?.salleOperation || '');
  }, [patient?.salleOperation]);

  const estUrgent = patient?.niveauUrgence === 'URGENT' || patient?.niveauUrgence === 'TRES_URGENT';

  // La CPA se remplit en deux temps : le Major/Responsable CPA saisit l'examen et la décision
  // (premier arrivé) ; une fois enregistrée, seul l'anesthésiste peut encore y toucher — pour y
  // ajouter les médicaments d'anesthésie/réanimation et planifier la vérification veille. Un
  // anesthésiste réalisant seul sa propre CPA (aucun Major/Responsable CPA impliqué) garde tous
  // les droits de bout en bout, comme avant.
  // Une CPA existante dont la décision est REPORT signifie "à refaire" (voir CPAService.create) —
  // sans cette exclusion, le patient restait bloqué indéfiniment en lecture seule sur l'examen/la
  // décision (seuls médicaments + vérification veille restaient éditables), sans aucun moyen de
  // reposer une vraie décision APTE/INAPTE.
  // `/cpa?patientId=` renvoie TOUT l'historique de ce patient (une fiche patient est réutilisée
  // d'un épisode chirurgical à l'autre — voir PrescriptionService.ingerer, qui remet son statut à
  // EN_ATTENTE_CPA à chaque nouvelle prescription) : sans le garde-fou `patient.statut`, la CPA
  // déjà validée d'un épisode précédent bloquait à tort la CPA du nouvel épisode ("CPA déjà
  // remplie et validée" alors qu'aucune CPA n'existe pour CET épisode) — le patient restait alors
  // figé à EN_ATTENTE_CPA pour toujours, visible indéfiniment dans le Fil de travail au lieu de
  // progresser vers le Programme opératoire. Tant que le statut courant est EN_ATTENTE_CPA, la
  // CPA de l'épisode en cours reste à faire, quelle que soit l'ancienneté de la dernière CPA.
  const cpaDejaRemplie = !!cpaExistante && cpaExistante.decision !== 'REPORT'
    && !!patient && patient.statut !== 'EN_ATTENTE_CPA';
  const peutEditerExamenEtDecision = !cpaDejaRemplie && (estResponsableOuMajor || estAnesthesisteConnecte);
  // Le Major cumule les deux rôles (Responsable CPA + Anesthésiste) : contrairement à un
  // Responsable CPA seul, il peut aussi compléter les médicaments d'anesthésie/réanimation et
  // planifier la vérification veille — jamais bloqué en attente d'un vrai anesthésiste.
  const peutEditerMedicamentsEtVpa = estAnesthesisteConnecte || estMajor;

  // Filet de sécurité coupure de courant / fermeture accidentelle : le contenu du formulaire est
  // sauvegardé localement (pas de son propre, pas de dépendance réseau — fonctionne même hors
  // ligne) et proposé au retour sur cette page tant qu'il n'a pas été soumis. Désactivé une fois
  // la CPA déjà remplie et validée (formulaire alors surtout en lecture seule, rien à protéger),
  // et tant que le chargement initial n'est pas terminé (sinon un instantané vide écraserait un
  // brouillon valide dès l'arrivée sur la page).
  const brouillonKey = patientId ? `cpa-brouillon:${patientId}` : null;
  const brouillonSnapshot = {
    form, scoreMallampati, scoreASA, decision, decisionOperation, motifRefus,
    dateReportCpa, heureReportCpa, dateOperationReportee, heureOperationReportee,
    dateVPA, heureVPA, medicaments, medicamentsAnesthesieRows,
  };
  useDraftAutosave(brouillonKey, brouillonSnapshot, {
    enabled: !chargementCpa && !cpaDejaRemplie && !termine,
  });

  const [brouillonTrouve, setBrouillonTrouve] = useState<Brouillon<typeof brouillonSnapshot> | null>(null);
  useEffect(() => {
    if (!brouillonKey || chargementCpa || cpaDejaRemplie) return;
    const brouillon = chargerBrouillon<typeof brouillonSnapshot>(brouillonKey);
    if (brouillon) setBrouillonTrouve(brouillon);
    // Ne (re)détecte qu'au moment où le chargement initial se termine, pas à chaque frappe — le
    // brouillon vient sinon d'être écrit par cette page elle-même, pas besoin de se le
    // re-proposer à lui-même.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brouillonKey, chargementCpa, cpaDejaRemplie]);

  const restaurerBrouillon = () => {
    if (!brouillonTrouve) return;
    const d = brouillonTrouve.data;
    setForm(d.form);
    setScoreMallampati(d.scoreMallampati);
    setScoreASA(d.scoreASA);
    setDecision(d.decision);
    setDecisionOperation(d.decisionOperation);
    setMotifRefus(d.motifRefus);
    setDateReportCpa(d.dateReportCpa);
    setHeureReportCpa(d.heureReportCpa);
    setDateOperationReportee(d.dateOperationReportee);
    setHeureOperationReportee(d.heureOperationReportee);
    setDateVPA(d.dateVPA);
    setHeureVPA(d.heureVPA);
    setMedicaments(d.medicaments);
    setMedicamentsAnesthesieRows(d.medicamentsAnesthesieRows);
    setBrouillonTrouve(null);
  };

  const ignorerBrouillon = () => {
    if (brouillonKey) effacerBrouillon(brouillonKey);
    setBrouillonTrouve(null);
  };

  // Date de vérification veille attribuée automatiquement (veille de l'opération) plutôt que
  // choisie manuellement dans un calendrier — elle doit toujours avoir lieu la veille de
  // l'intervention, ce n'est pas un vrai choix de créneau. Sans objet pour un patient urgent
  // (chirurgie immédiate, jamais de "veille" à attendre — voir le garde-fou plus bas). Repli sur
  // aujourd'hui si l'opération est prévue le jour même ou le lendemain (une "veille" dans le
  // passé n'a pas de sens). Ne s'applique que si aucune date n'est déjà connue (saisie
  // manuelle, brouillon restauré, ou CPA déjà remplie avec sa propre date) : ne jamais écraser
  // un choix existant.
  useEffect(() => {
    if (estUrgent || dateVPA || !patient?.dateIntervention) return;
    const veille = new Date(patient.dateIntervention);
    veille.setDate(veille.getDate() - 1);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    if (veille < aujourdhui) veille.setTime(aujourdhui.getTime());
    setDateVPA(formatDateInput(veille));
  }, [estUrgent, patient?.dateIntervention, dateVPA]);

  const handleEnregistrerDateIntervention = async () => {
    const patientIdFinal = patientId || patient?.id;
    if (!patientIdFinal || !dateInterventionInput) return;
    setSavingDateIntervention(true);
    try {
      const updated = await patientService.modifierDateIntervention(patientIdFinal, new Date(dateInterventionInput).toISOString());
      setPatient((p: any) => ({ ...p, dateIntervention: updated?.dateIntervention ?? p?.dateIntervention }));
      alert('✅ Date et heure de l\'opération mises à jour');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erreur inconnue';
      alert('❌ Erreur: ' + JSON.stringify(message));
    } finally {
      setSavingDateIntervention(false);
    }
  };

  const handleEnregistrerSalleOperation = async () => {
    const patientIdFinal = patientId || patient?.id;
    if (!patientIdFinal || !salleOperationInput.trim()) return;
    setSavingSalleOperation(true);
    try {
      const updated = await patientService.modifierSalleOperation(patientIdFinal, salleOperationInput.trim());
      setPatient((p: any) => ({ ...p, salleOperation: updated?.salleOperation ?? p?.salleOperation }));
      alert('✅ Salle de bloc mise à jour');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erreur inconnue';
      alert('❌ Erreur: ' + JSON.stringify(message));
    } finally {
      setSavingSalleOperation(false);
    }
  };

  const setField = (key: keyof typeof DEFAULT_FORM) => (e: any) => setForm(f => ({ ...f, [key]: e.target.value }))

  const ajouterMedicament = () => {
    if (nouveauMedicament.premedication && nouveauMedicament.dose) {
      setMedicaments([...medicaments, { ...nouveauMedicament }]);
      setNouveauMedicament({ premedication: '', dose: '', voieAdmin: '', debut: '', frequence: '' });
      setShowMedicamentModal(false);
    }
  };

  const supprimerMedicament = (index: number) => {
    setMedicaments(medicaments.filter((_, i) => i !== index));
  };

  const medicamentsSelectionnes = medicamentsAnesthesieRows.filter(r => r.selected);

  const planifierVerificationVeille = async (patientIdFinal: string) => {
    // Uniquement pour un patient déclaré APTE — sans objet pour INAPTE et pour REPORT (la CPA
    // elle-même reste à refaire, voir planifierReportCpa).
    if (estUrgent || decision !== 'APTE' || !dateVPA) return;
    const [h, m] = heureVPA.split(':').map(Number);
    const fin = new Date(); fin.setHours(h, m + 30);
    await planningService.reserverCreneau({
      patientId: patientIdFinal,
      date: dateVPA,
      heureDebut: heureVPA,
      heureFin: fin.toTimeString().split(' ')[0].substring(0, 5),
      salle: 'Vérification veille-1',
      estUrgence: false,
      type: 'VERIFICATION_VEILLE',
    });
  };

  // Réserve un nouveau créneau CPA à la date de report choisie — distinct de la vérification
  // veille (réservée aux patients APTE), pour un patient dont la décision est REPORT.
  const planifierReportCpa = async (patientIdFinal: string) => {
    if (decision !== 'REPORT' || !dateReportCpa) return;
    const [h, m] = heureReportCpa.split(':').map(Number);
    const fin = new Date(); fin.setHours(h, m + 30);
    await planningService.reserverCreneau({
      patientId: patientIdFinal,
      date: dateReportCpa,
      heureDebut: heureReportCpa,
      heureFin: fin.toTimeString().split(' ')[0].substring(0, 5),
      salle: 'CPA (report)',
      estUrgence: false,
      type: 'CPA',
    });
  };

  // Vérifie tout ce qui bloquerait la sauvegarde (rôle, champs obligatoires) AVANT d'ouvrir la
  // popup de relecture — la popup elle-même ne fait qu'enregistrer ce qui a déjà été validé ici.
  const handleOuvrirRecap = () => {
    const patientIdFinal = patientId || patient?.id;
    if (!patientIdFinal) { alert('❌ Patient introuvable'); return; }
    if (!cpaDejaRemplie) {
      if (!peutEditerExamenEtDecision) { alert('❌ Seul un anesthésiste, un responsable CPA ou un major peut remplir et valider la CPA'); return; }
      // Seuls « Patient mineur » (choix majeur/mineur) et la décision finale ci-dessous restent
      // obligatoires sur toute la fiche — tous les autres champs (autorisation signée, examen
      // clinique, voies aériennes, ASA, protocole, instructions...) sont volontairement laissés
      // libres.
      if (form.patientMineur === null) { alert('❌ Complétez ces champs avant de valider :\n— Patient mineur (OUI/NON)'); return; }
      if (!decision) { alert('❌ Sélectionnez une décision (Apte / Inapte / Report)'); return; }
      if ((decision === 'INAPTE' || decision === 'REPORT') && !motifRefus.trim()) {
        alert(`❌ Le motif ${decision === 'INAPTE' ? 'du refus' : 'du report'} est obligatoire`); return;
      }
    } else {
      // Deuxième étape : l'anesthésiste complète la CPA déjà remplie par le Major/Responsable CPA.
      if (!peutEditerMedicamentsEtVpa) { alert("❌ Seul l'anesthésiste peut compléter les médicaments et la date de vérification veille"); return; }
    }
    setShowRecap(true);
  };

  const handleValider = async () => {
    const patientIdFinal = patientId || patient?.id;
    if (!patientIdFinal) { alert('❌ Patient introuvable'); return; }

    // Seule la décision finale est obligatoire — toutes les mesures cliniques restent libres et
    // sont omises du payload si non renseignées plutôt que forcées à 0 (valeur cliniquement fausse).
    const versNombre = (valeur: string) => (valeur === '' || isNaN(Number(valeur)) ? undefined : Number(valeur));

    setLoading(true);
    try {
      if (!cpaDejaRemplie) {
        const payload = {
          patientId: patientIdFinal,
          dateConsultation: new Date().toISOString().split('T')[0],
          histoireActuelle: form.histoireActuelle || undefined,
          dernierRepasBoisson: form.dernierRepasBoisson || undefined,
          patientMineur: form.patientMineur,
          // Champs facultatifs : envoyer undefined (clé omise du JSON) plutôt que null — sinon le
          // backend refuserait (booléen/enum requis) ou la colonne NOT NULL échouerait à l'insert.
          autorisationOpererSignee: form.autorisationOpererSignee ?? undefined,
          antecedentsAnesthesie: form.antecedentsAnesthesie ?? undefined,
          atcdMedicaux: form.atcdMedicaux || undefined,
          atcdChirurgicaux: form.atcdChirurgicaux || undefined,
          notesIncidents: form.notesIncidents || undefined,
          asthme: form.asthme ?? undefined,
          tempsSaignement: form.tempsSaignement || undefined,
          atcdObstetricaux: (form.atcdObstetricauxG || form.atcdObstetricauxP || form.atcdObstetricauxA || form.atcdObstetricauxDdr)
            ? { g: form.atcdObstetricauxG || undefined, p: form.atcdObstetricauxP || undefined, a: form.atcdObstetricauxA || undefined, ddr: form.atcdObstetricauxDdr || undefined }
            : undefined,
          allergiesMedicamenteuses: form.allergiesMedicamenteuses || undefined,
          allergiesAutres: form.allergiesAutres || undefined,
          contraception: form.contraception || undefined,
          groupeSanguinCpa: (form.groupeSanguinCpaGroupe || form.groupeSanguinCpaPhenotype || form.groupeSanguinCpaRai)
            ? { groupe: form.groupeSanguinCpaGroupe || undefined, phenotype: form.groupeSanguinCpaPhenotype || undefined, rai: form.groupeSanguinCpaRai || undefined }
            : undefined,
          atcdFamiliaux: form.atcdFamiliaux || undefined,
          transfusionsAnterieures: form.transfusionsAnterieures ?? undefined,
          transfusionsIncidents: form.transfusionsIncidents || undefined,
          frequenceCardiaque: versNombre(form.frequenceCardiaque),
          tensionArterielle: (form.taSystolique !== '' && form.taDiastolique !== '')
            ? { systolique: versNombre(form.taSystolique), diastolique: versNombre(form.taDiastolique) }
            : undefined,
          taille: versNombre(form.taille),
          poids: versNombre(form.poids),
          examenCardiovasculaire: form.examenCardiovasculaire,
          examenPulmonaire: form.examenPulmonaire,
          examenNeurologique: form.examenNeurologique,
          colorationConjonctivale: form.colorationConjonctivale,
          abordVeineux: form.abordVeineux,
          rachis: form.rachis,
          mallampati: scoreMallampati ?? undefined,
          ouvertureBuccale: versNombre(form.ouvertureBuccale),
          distanceMentoThyroidienne: versNombre(form.distanceMentoThyroidienne),
          dents: form.dents,
          tabac: form.tabac,
          alcool: form.alcool,
          bilanBiologique: (() => {
            const cles: [string, string][] = [
              ['gb', form.bilanGb], ['gr', form.bilanGr], ['hb', form.bilanHb], ['ht', form.bilanHt],
              ['pl', form.bilanPl], ['tp', form.bilanTp], ['pq', form.bilanPq], ['tca', form.bilanTca], ['fibri', form.bilanFibri],
              ['na', form.bilanNa], ['k', form.bilanK], ['cl', form.bilanCl], ['ra', form.bilanRa], ['gly', form.bilanGly],
              ['prot', form.bilanProt], ['uree', form.bilanUree], ['creat', form.bilanCreat], ['acUr', form.bilanAcUr],
            ];
            const remplies = cles.filter(([, v]) => v.trim() !== '');
            return remplies.length ? Object.fromEntries(remplies) : undefined;
          })(),
          ecg: form.ecg || undefined,
          radioPulmonaire: form.radioPulmonaire || undefined,
          echographie: form.echographie || undefined,
          scanner: form.scanner || undefined,
          autresExamensParacliniques: form.autresExamensParacliniques || undefined,
          piecesJointes: form.piecesJointes.length ? form.piecesJointes : undefined,
          scoreASA: scoreASA == null ? undefined : (typeof scoreASA === 'string' ? scoreASA : Number(scoreASA)),
          decision,
          decisionOperation: (decision === 'APTE' || decision === 'INAPTE') ? (decisionOperation || undefined) : undefined,
          motifRefus: (decision === 'INAPTE' || decision === 'REPORT') ? motifRefus.trim() : undefined,
          // Le Responsable CPA est seul censé réaliser la CPA, mais en pratique il n'est pas
          // toujours disponible : un autre intervenant habilité (Anesthésiste, Major) la réalise
          // alors à sa place, après accord du Responsable CPA obtenu par téléphone. On ne gère
          // aucun vrai workflow d'approbation sur la plateforme (pas de saisie, pas de suivi) —
          // la validation est actée automatiquement dès que ce n'est pas le Responsable CPA
          // lui-même qui soumet la fiche.
          validationProfInformelle: estResponsableCpa
            ? undefined
            : 'Validation obtenue par téléphone auprès du Responsable CPA',
          traitementEnCours: form.traitementEnCours || undefined,
          conclusion: form.conclusion || undefined,
          recommandationsProtocole: form.recommandationsProtocole || undefined,
          typeAnesthesie: form.typeAnesthesie,
          sousTypeAnesthesie: form.sousTypeAnesthesie || undefined,
          techniqueIntubation: form.techniqueIntubation,
          premedicaments: medicaments.map(m => ({
            nom: m.premedication,
            dose: m.dose,
            voieAdministration: m.voieAdmin,
            debut: m.debut || 'H-1',
            frequence: m.frequence || '1x/jour'
          })),
          // Ne s'applique que si l'anesthésiste réalise seul sa propre CPA (sinon cette partie
          // est réservée à l'étape suivante, complétée par l'anesthésiste).
          medicamentsAnesthesieReanimation: (peutEditerMedicamentsEtVpa && medicamentsSelectionnes.length)
            ? medicamentsSelectionnes.map(r => ({
                categorie: r.categorie,
                nom: r.label,
                mode: r.mode,
                dosage: r.dosage || undefined,
                nombre: r.nombre !== '' ? Number(r.nombre) : undefined,
              }))
            : undefined,
          // form.jeune (instructions spécifiques libres) et jeuneSolides/jeuneLiquides (règles
          // structurées) sont complémentaires, pas alternatifs — l'ancien `||` perdait
          // silencieusement solides/liquides dès que le texte libre était rempli.
          jeune: [
            `Solides : ${form.jeuneSolides || 'À partir de minuit'} — Liquide : ${form.jeuneLiquides || "Jusqu'à H-2"}`,
            form.jeune,
          ].filter(Boolean).join(' — '),
          preparationPhysique: form.preparationPhysique,
          tachesInfirmieres: form.tachesInfirmieres,
          // Contrairement aux médicaments (réservés à l'anesthésiste), la date de vérification
          // veille peut être posée par quiconque valide la CPA (Respo CPA/Major ou anesthésiste
          // solo) — sinon le patient restait bloqué à CPA_REALISE, sans créneau, invisible du
          // Fil de travail tant qu'un anesthésiste ne rouvrait pas manuellement sa fiche.
          dateVerificationVeille: (!estUrgent && decision === 'APTE' && dateVPA) ? dateVPA : undefined,
        };

        await apiClient.post('/cpa', payload);
        setShowRecap(false);
        await planifierVerificationVeille(patientIdFinal);
        // Date de report : posée par qui décide le REPORT (Respo CPA/Major ou l'anesthésiste
        // solo), pas réservée à l'anesthésiste — contrairement à la vérification veille.
        await planifierReportCpa(patientIdFinal);
        // Opération reportée (APTE ou INAPTE) : répercute la nouvelle date sur la fiche patient
        // et notifie le service demandeur (voir PatientBlocStatutService.modifierDateIntervention).
        if (decisionOperation === 'REPORTEE' && dateOperationReportee) {
          try {
            await patientService.modifierDateIntervention(
              patientIdFinal,
              new Date(`${dateOperationReportee}T${heureOperationReportee || '09:00'}`).toISOString(),
            );
          } catch (err: any) {
            console.error(err);
            alert('⚠️ CPA enregistrée, mais la mise à jour de la date d\'opération a échoué : ' + (err.response?.data?.message || err.message || 'erreur inconnue'));
          }
        }

        if (brouillonKey) effacerBrouillon(brouillonKey);

        if (estUrgent) {
          // Urgent/très urgent APTE : le patient bascule directement dans le programme du jour
          // (voir CPAService.create, bascule PRET_POUR_BLOC), jamais dans le Fil de travail —
          // proposer à l'anesthésiste d'enchaîner directement sur sa prise en charge plutôt que
          // de le renvoyer vers un écran où ce patient n'apparaît pas. Le patient d'un service
          // non-opératoire (Endoscopie, Imagerie, Urgence...) apparaît dans le "Programme
          // non-chirurgical", les autres dans le "Programme opératoire" (même distinction par
          // serviceOrigine que les listes elles-mêmes).
          const proposerRaccourci = decision === 'APTE' && estAnesthesisteConnecte;
          const allerDirectement = proposerRaccourci && confirm(
            '✅ VPA validée — patient prêt à opérer.\n\nContinuer directement vers sa prise en charge (arrivée au bloc) ?'
          );
          if (allerDirectement) {
            router.push(`/bloc/arrivee-bloc?patientId=${patientIdFinal}&patientNom=${encodeURIComponent(patientNom)}&intervention=${encodeURIComponent(intervention)}`);
          } else {
            const nonOperatoire = estServiceNonOperatoire(patient?.serviceOrigine);
            if (decision === 'INAPTE' || (decision === 'REPORT' && nonOperatoire)) {
              // INAPTE (toute origine) ou REPORT d'un patient non-opératoire : le dossier est
              // archivé (CPA_INAPTE ou SORTI, voir CPAService.create) — jamais un succès de
              // programmation, ne pas dire l'inverse ni renvoyer vers une liste où ce patient
              // n'apparaîtra plus (voir Bug 4).
              setTermine(true);
            } else if (decision === 'REPORT') {
              alert('🕓 CPA reportée — le patient reste en attente de CPA, à refaire.');
              router.push('/bloc/rendez-vous');
            } else {
              if (!proposerRaccourci) alert('✅ VPA validée avec succès !');
              router.push(nonOperatoire ? '/bloc/programme-non-operatoire' : '/bloc/patient-du-jour');
            }
          }
        } else {
          // Patient normal venu d'un service non-opératoire (Endoscopie, Urgence, Imagerie) dont
          // la CPA est refusée ou reportée : CPAService l'a archivé (SORTI) et notifié son service
          // d'origine — seul cas où le parcours s'arrête réellement à la décision, l'écran de fin
          // de parcours le renvoie vers son service (accueil ou archive). Tous les autres patients
          // continuent exactement comme les patients du bloc : APTE → liste Vérification veille du
          // Fil de travail (puis Programme non-chirurgical) — direction unique vers le rendez-vous.
          const retourneServiceOrigine =
            estServiceNonOperatoire(patient?.serviceOrigine) &&
            (decision === 'INAPTE' || decision === 'REPORT');
          if (retourneServiceOrigine) {
            setTermine(true);
          } else {
            alert('✅ CPA validée avec succès !');
            router.push('/bloc/rendez-vous');
          }
        }
      } else {
        // Deuxième étape : l'anesthésiste complète la CPA déjà remplie par le Major/Responsable
        // CPA — uniquement les médicaments d'anesthésie/réanimation et la vérification veille.
        await apiClient.patch(`/cpa/${cpaExistante.id}`, {
          medicamentsAnesthesieReanimation: medicamentsSelectionnes.length
            ? medicamentsSelectionnes.map(r => ({
                categorie: r.categorie,
                nom: r.label,
                mode: r.mode,
                dosage: r.dosage || undefined,
                nombre: r.nombre !== '' ? Number(r.nombre) : undefined,
              }))
            : undefined,
          dateVerificationVeille: (!estUrgent && decision === 'APTE' && dateVPA) ? dateVPA : undefined,
        });
        setShowRecap(false);
        await planifierVerificationVeille(patientIdFinal);
        if (brouillonKey) effacerBrouillon(brouillonKey);

        // Cette étape (médicaments + vérification veille) ne clôt jamais un parcours : le patient
        // bascule dans la liste Vérification veille du Fil de travail (voir CPAService.update),
        // patient externe ou non — direction unique vers le rendez-vous.
        alert('✅ Médicaments et vérification veille enregistrés !');
        router.push('/bloc/rendez-vous');
      }
    } catch (err: any) {
      console.error('❌ Erreur validation:', err);
      const message = err.response?.data?.message || err.message || 'Erreur inconnue';
      alert('❌ Erreur: ' + JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  // Construit la fiche CPA (sections clé/valeur) à partir de l'état actuel du formulaire, pour
  // export PDF et partage — les champs vides sont omis automatiquement (voir exporterFichePdf).
  const construireSectionsCpa = () => {
    const nomComplet = formaterNomPatient(patient) || patientNom;
    const decisionLabel: Record<string, string> = { APTE: 'APTE', INAPTE: 'INAPTE', REPORT: 'CPA À REPORTER' };
    return [
      {
        titre: 'Patient',
        champs: [
          { label: 'Nom', valeur: nomComplet },
          { label: 'N° Dossier', valeur: (() => { const id = formaterIdDossier(patient?.idDossier); return id ? `#${id}` : ''; })() },
          { label: 'Diagnostic / Intervention prévue', valeur: intervention || patient?.libelle || '' },
          { label: 'Date de consultation', valeur: new Date().toLocaleDateString('fr-FR') },
        ],
      },
      {
        titre: 'Histoire',
        champs: [
          { label: 'Histoire actuelle', valeur: form.histoireActuelle },
          { label: 'Urgence — Dernier repas / boisson', valeur: form.dernierRepasBoisson },
          { label: 'Patient mineur', valeur: form.patientMineur === true ? 'OUI' : form.patientMineur === false ? 'NON' : '' },
          { label: 'Autorisation d\'opérer signée', valeur: form.autorisationOpererSignee === true ? 'OUI' : form.autorisationOpererSignee === false ? 'NON' : '' },
        ],
      },
      {
        titre: 'Antécédents',
        champs: [
          { label: 'ATCD médicaux', valeur: form.atcdMedicaux },
          { label: 'ATCD anesthésiques et chirurgicaux', valeur: form.atcdChirurgicaux },
          { label: 'Incidents', valeur: form.notesIncidents },
          { label: 'Antécédents d\'anesthésie', valeur: form.antecedentsAnesthesie === true ? 'OUI' : form.antecedentsAnesthesie === false ? 'NON' : '' },
          { label: 'Asthme', valeur: form.asthme === true ? 'OUI' : form.asthme === false ? 'NON' : '' },
          { label: 'Temps de saignement', valeur: form.tempsSaignement },
          { label: 'ATCD Obstétricaux (G/P/A/DDR)', valeur: [form.atcdObstetricauxG && `G:${form.atcdObstetricauxG}`, form.atcdObstetricauxP && `P:${form.atcdObstetricauxP}`, form.atcdObstetricauxA && `A:${form.atcdObstetricauxA}`, form.atcdObstetricauxDdr && `DDR:${form.atcdObstetricauxDdr}`].filter(Boolean).join(' — ') },
          { label: 'Allergies médicamenteuses', valeur: form.allergiesMedicamenteuses },
          { label: 'Allergies (autres)', valeur: form.allergiesAutres },
          { label: 'Contraception', valeur: form.contraception },
          { label: 'Groupe sanguin', valeur: [form.groupeSanguinCpaGroupe, form.groupeSanguinCpaPhenotype && `Phénotype ${form.groupeSanguinCpaPhenotype}`, form.groupeSanguinCpaRai && `RAI ${form.groupeSanguinCpaRai}`].filter(Boolean).join(' — ') },
          { label: 'ATCD Familiaux', valeur: form.atcdFamiliaux },
          { label: 'Transfusions antérieures', valeur: form.transfusionsAnterieures === true ? 'OUI' : form.transfusionsAnterieures === false ? 'NON' : '' },
          { label: 'Incidents transfusionnels', valeur: form.transfusionsIncidents },
        ],
      },
      {
        titre: 'Examen clinique',
        champs: [
          { label: 'Fréquence cardiaque', valeur: form.frequenceCardiaque ? `${form.frequenceCardiaque} bpm` : '' },
          { label: 'Tension artérielle', valeur: (form.taSystolique || form.taDiastolique) ? `${form.taSystolique || '?'}/${form.taDiastolique || '?'}` : '' },
          { label: 'Taille', valeur: form.taille ? `${form.taille} cm` : '' },
          { label: 'Poids', valeur: form.poids ? `${form.poids} kg` : '' },
          { label: 'Cardio-vasculaire', valeur: form.examenCardiovasculaire },
          { label: 'Pulmonaire', valeur: form.examenPulmonaire },
          { label: 'Neurologique', valeur: form.examenNeurologique },
          { label: 'Coloration conjonctivale', valeur: form.colorationConjonctivale },
          { label: 'Abords veineux', valeur: form.abordVeineux },
          { label: 'Rachis', valeur: form.rachis },
        ],
      },
      {
        titre: 'Voies aériennes',
        champs: [
          { label: 'Score Mallampati', valeur: scoreMallampati != null ? String(scoreMallampati) : '' },
          { label: 'Ouverture buccale', valeur: form.ouvertureBuccale || '' },
          { label: 'DMTC', valeur: form.distanceMentoThyroidienne || '' },
          { label: 'Dents', valeur: form.dents },
          { label: 'Tabac', valeur: form.tabac },
          { label: 'Alcool', valeur: form.alcool },
        ],
      },
      {
        titre: 'Protocole anesthésique',
        champs: [
          { label: 'Type d\'anesthésie', valeur: form.typeAnesthesie },
          { label: 'Technique', valeur: form.sousTypeAnesthesie },
          { label: 'Technique d\'intubation', valeur: form.techniqueIntubation },
          { label: 'Recommandations et protocoles', valeur: form.recommandationsProtocole },
        ],
      },
      {
        titre: 'Instructions pré-opératoires',
        champs: [
          { label: 'Jeûne', valeur: form.jeune },
          { label: 'Préparation physique', valeur: form.preparationPhysique },
          { label: 'Tâches infirmières', valeur: form.tachesInfirmieres },
          { label: 'Prémédication', valeur: medicaments.map(m => `${m.premedication} ${m.dose} (${m.voieAdmin})`).join(' ; ') },
        ],
      },
      {
        titre: 'Traitement médicamenteux',
        champs: [
          { label: 'Traitement en cours', valeur: form.traitementEnCours },
        ],
      },
      {
        titre: 'Conclusion',
        champs: [
          { label: 'Score ASA', valeur: scoreASA != null ? `ASA ${scoreASA}` : '' },
          { label: 'Conclusion', valeur: form.conclusion },
          { label: 'Décision', valeur: decision ? decisionLabel[decision] : '' },
          { label: 'Motif', valeur: motifRefus },
        ],
      },
    ];
  };

  const [exportEnCours, setExportEnCours] = useState(false);

  const genererPdfCpa = async (): Promise<{ blob: Blob; nomFichier: string }> => {
    const nomComplet = formaterNomPatient(patient) || patientNom;
    const nomFichier = `CPA-${nomComplet.replace(/[^a-zA-Z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    const sessionActuelle = obtenirSessionValide();
    const blob = await exporterFichePdf(
      "Fiche d'Anesthésie – Réanimation",
      `${estUrgent ? 'Visite Pré-Anesthésique (VPA)' : 'Consultation Pré-Anesthésique (CPA)'} — ${sessionActuelle?.acces.chu?.name || ''}`,
      construireSectionsCpa(),
      nomFichier
    );
    return { blob, nomFichier };
  };

  const handleTelechargerPdf = async () => {
    setExportEnCours(true);
    try {
      await genererPdfCpa();
    } catch (err) {
      console.error(err);
      alert('❌ Erreur lors de la génération du PDF');
    } finally {
      setExportEnCours(false);
    }
  };

  const enregistrerDestinataire = (destinataire: { email: string; telephone: string }) => {
    setDestinataireCpa(destinataire);
    try { localStorage.setItem('cpa-destinataire-partage', JSON.stringify(destinataire)); } catch { /* stockage indisponible : le destinataire sera juste redemandé la prochaine fois */ }
  };

  const executerPartageWhatsApp = async (telephone: string) => {
    const nomComplet = formaterNomPatient(patient) || patientNom;
    await handleTelechargerPdf();
    const texte = encodeURIComponent(`Fiche CPA — ${nomComplet}${decision ? ` — Décision : ${decision}` : ''} (PDF téléchargé à joindre manuellement)`);
    const numero = telephone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${numero}?text=${texte}`, '_blank');
  };

  const executerPartageEmail = async (email: string) => {
    const nomComplet = formaterNomPatient(patient) || patientNom;
    await handleTelechargerPdf();
    const sujet = encodeURIComponent(`Fiche CPA — ${nomComplet}`);
    const corps = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint la fiche CPA de ${nomComplet}${decision ? ` (décision : ${decision})` : ''}.\nLe PDF a été téléchargé sur cet ordinateur — pensez à le joindre à cet email avant l'envoi.\n\nCordialement.`);
    window.open(`mailto:${email}?subject=${sujet}&body=${corps}`, '_blank');
  };

  // Le destinataire (professeur responsable CPA) n'est demandé qu'une seule fois — voir
  // enregistrerDestinataire — puis réutilisé automatiquement pour tous les partages suivants.
  const handlePartagerWhatsApp = async () => {
    if (!destinataireCpa?.telephone) {
      setDestinataireActionEnAttente('whatsapp');
      setShowDestinataireModal(true);
      return;
    }
    await executerPartageWhatsApp(destinataireCpa.telephone);
  };

  const handlePartagerEmail = async () => {
    if (!destinataireCpa?.email) {
      setDestinataireActionEnAttente('email');
      setShowDestinataireModal(true);
      return;
    }
    await executerPartageEmail(destinataireCpa.email);
  };

  const handleConfirmerDestinataire = async () => {
    const destinataire = { email: destinataireEmailSaisi.trim(), telephone: destinataireTelephoneSaisi.trim() };
    enregistrerDestinataire(destinataire);
    setShowDestinataireModal(false);
    if (destinataireActionEnAttente === 'whatsapp' && destinataire.telephone) await executerPartageWhatsApp(destinataire.telephone);
    else if (destinataireActionEnAttente === 'email' && destinataire.email) await executerPartageEmail(destinataire.email);
    setDestinataireActionEnAttente(null);
  };

  const ouvrirModaleDestinataire = () => {
    setDestinataireEmailSaisi(destinataireCpa?.email || '');
    setDestinataireTelephoneSaisi(destinataireCpa?.telephone || '');
    setDestinataireActionEnAttente(null);
    setShowDestinataireModal(true);
  };

  // Petite étoile rouge marquant un champ obligatoire — même convention partout sur cette page.
  const Requis = () => <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>;

  // Style commun des "pastilles" Oui/Non/choix de cette page — sélection nette (fond plein +
  // coche) plutôt que le simple contour discret d'avant, pour qu'un champ répondu se distingue
  // clairement d'un champ encore vide au premier coup d'œil.
  const pilleClass = (selectionne: boolean, editable: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 p-3 border-2 rounded-xl font-bold text-sm transition-all ${
      selectionne
        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
        : 'bg-white border-outline-variant/50 text-on-surface-variant'
    } ${editable ? 'cursor-pointer hover:border-primary/60' : 'cursor-not-allowed opacity-70'}`;

  // Champ libre (ni obligatoire ni signalé visuellement) — seul Patient mineur (choix
  // majeur/mineur) le reste encore sur la fiche avec sa pastille OUI/NON, la décision finale
  // en bas de page mise à part.
  const texteRequisClass = (_valeur: string, base = 'h-20') =>
    `w-full bg-surface-container-low border-2 border-transparent rounded-xl p-3 text-sm ${base} transition-colors focus:ring-2 focus:ring-primary/30 outline-none disabled:opacity-60`;

  // Patient suivi ici uniquement pour sa CPA/VPA (demande d'un service externe) : une fois la
  // décision prise, son parcours s'arrête — pas de Fil de travail ni de programme opératoire du
  // bloc où il apparaîtrait. Plutôt que de le rediriger vers un écran qui ne le montrera jamais,
  // on propose directement les deux seules destinations pertinentes.
  if (termine) {
    return (
      <main className="p-4">
        <div className="max-w-md mx-auto mt-16 bg-surface-container-lowest rounded-2xl shadow-lg p-8 text-center space-y-5">
          <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          <div>
            <h1 className="text-lg font-bold font-headline">{estUrgent ? 'VPA' : 'CPA'} enregistrée</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              La décision pour {patientNom} a été transmise au service demandeur. Ce dossier ne relève plus du programme du bloc.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => router.push('/bloc')}
              className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-lg">home</span> Retour à l'accueil
            </button>
            <button type="button" onClick={() => router.push(`/bloc/dossier-patient/${patientId}/complet`)}
              className="w-full flex items-center justify-center gap-2 p-3 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-lg">folder_open</span> Voir l'archive
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <BackButton />
        <PasserButton onClick={restaurerBrouillon} disabled={!brouillonTrouve} />
      </div>
      <div className={`rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 ${estUrgent ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'}`}>
        <span className="material-symbols-outlined text-lg">{estUrgent ? 'bolt' : 'event_available'}</span>
        {estUrgent ? 'Visite Pré-Anesthésique (VPA) — patient urgent, consultation immédiate' : 'Consultation Pré-Anesthésique (CPA)'}
      </div>

      {cpaDejaRemplie && !chargementCpa && (
        <div className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${peutEditerMedicamentsEtVpa ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-surface-container-low text-on-surface-variant'}`}>
          <span className="material-symbols-outlined text-lg">{peutEditerMedicamentsEtVpa ? 'medication' : 'visibility'}</span>
          {peutEditerMedicamentsEtVpa
            ? "CPA déjà remplie et validée — complétez les médicaments d'anesthésie/réanimation et la vérification veille ci-dessous."
            : 'CPA déjà remplie et validée — consultation en lecture seule.'}
        </div>
      )}

      {/* Saisie non enregistrée retrouvée localement (coupure de courant, fermeture accidentelle
          de l'onglet...) — jamais appliquée automatiquement, uniquement sur confirmation, pour ne
          jamais écraser silencieusement ce qui est déjà affiché. */}
      {brouillonTrouve && (
        <div className="rounded-xl px-4 py-3 text-sm font-bold flex flex-wrap items-center gap-3 bg-amber-50 text-amber-900 border border-amber-200">
          <span className="material-symbols-outlined text-lg">restore</span>
          <span className="flex-1 min-w-[220px]">
            Une saisie non enregistrée du {new Date(brouillonTrouve.savedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} a été retrouvée pour ce patient.
          </span>
          <button type="button" onClick={restaurerBrouillon}
            className="px-3 py-1.5 bg-amber-400 text-amber-950 rounded-lg text-xs font-bold hover:bg-amber-500 transition-colors">
            Restaurer
          </button>
          <button type="button" onClick={ignorerBrouillon}
            className="px-3 py-1.5 bg-white text-amber-800 border border-amber-300 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
            Ignorer
          </button>
        </div>
      )}

      {/* Patient Context Header — identité complète (nom, prénom, âge calculé, sexe, n° dossier,
          chambre, urgence), même composant partagé que tous les autres écrans patient de l'app :
          avant, cette page réimplémentait son propre en-tête incomplet, limité au strict nom/âge/
          IPP transmis par l'écran précédent via l'URL (souvent partiels ou absents). */}
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex-1 min-w-[280px]">
          <PatientIdentityHeader
            patient={patient}
            intervention={intervention || patient?.libelle || undefined}
            loading={!patient}
            patientId={patientId}
          />
        </div>
        <div className="flex flex-col items-center justify-center bg-surface-bright rounded-xl px-5 shadow-sm border border-white/50">
          <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${estUrgent ? 'bg-red-100 text-red-700' : 'bg-secondary/10 text-secondary'}`}>
            {estUrgent ? 'NON PROGRAMMÉ' : 'PROGRAMMÉ'}
          </span>
        </div>
      </div>

      <ErreurChargementBanner visible={erreurPatient} onRecharger={chargerPatient} />

      {/* Alertes retard — date prévue déjà dépassée sans que l'étape correspondante soit faite. */}
      {cpaEnRetard && !cpaDejaRemplie && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800 flex items-center gap-2 font-semibold">
          <span className="material-symbols-outlined text-lg text-red-600">error</span>
          La date prévue de cette CPA est déjà dépassée — complétez-la ci-dessous dès que possible.
        </div>
      )}
      {operationEnRetard && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800 flex flex-wrap items-center gap-3">
          <span className="material-symbols-outlined text-lg text-red-600">error</span>
          <span className="flex-1 min-w-[220px] font-semibold">La date prévue de l&apos;opération est déjà dépassée.</span>
          {estResponsableOuMajor && (
            <button type="button" onClick={() => document.getElementById('date-operation-cpa')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
              Modifier la date
            </button>
          )}
        </div>
      )}

      {/* Date et heure prévues de l'opération — modifiable par le Responsable CPA ou le Major
          pendant la réalisation de la consultation (ex. créneau chirurgical décalé) */}
      <div id="date-operation-cpa" className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3 scroll-mt-36">
        <span className="material-symbols-outlined text-primary">event</span>
        {estResponsableOuMajor ? (
          <>
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-semibold text-on-surface-variant block mb-1">Date et heure prévues de l'opération</label>
              <input type="datetime-local" value={dateInterventionInput} onChange={e => setDateInterventionInput(e.target.value)}
                min={`${new Date().toISOString().split('T')[0]}T00:00`}
                className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm font-bold" />
            </div>
            <button onClick={handleEnregistrerDateIntervention} disabled={savingDateIntervention || !dateInterventionInput}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 self-end">
              <span className="material-symbols-outlined text-lg">save</span>
              {savingDateIntervention ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        ) : (
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">Date et heure prévues de l'opération</p>
            <p className="text-sm font-bold text-on-surface">
              {patient?.dateIntervention ? new Date(patient.dateIntervention).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
        )}
      </div>

      {/* Salle de bloc prévue pour l'intervention — même logique et mêmes rôles éditeurs que la
          date/heure ci-dessus, distincte de la chambre d'hospitalisation du patient. */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <span className="material-symbols-outlined text-primary">meeting_room</span>
        {estResponsableOuMajor ? (
          <>
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-semibold text-on-surface-variant block mb-1">Salle de bloc prévue</label>
              <input type="text" value={salleOperationInput} onChange={e => setSalleOperationInput(e.target.value)}
                placeholder="Ex. Salle 3"
                className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm font-bold" />
            </div>
            <button onClick={handleEnregistrerSalleOperation} disabled={savingSalleOperation || !salleOperationInput.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 self-end">
              <span className="material-symbols-outlined text-lg">save</span>
              {savingSalleOperation ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        ) : (
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">Salle de bloc prévue</p>
            <p className="text-sm font-bold text-on-surface">{patient?.salleOperation || '—'}</p>
          </div>
        )}
      </div>

      <SommaireCpa />

      {/* CONTENU PRINCIPAL — la carte Prescription reste collée (sticky) à côté du formulaire
          depuis Antécédents jusqu'à Conclusion (le moment de la CPA où une prescription
          complémentaire est le plus susceptible d'être nécessaire) ; le Traitement médicamenteux
          est dans la colonne de gauche juste avant la Conclusion, et au-delà (Protocole
          opératoire, Instructions pré-opératoires, Décision) le contenu repasse pleine largeur. */}
      <div className="flex flex-col lg:flex-row gap-2 items-start">
        <div className={`flex-1 space-y-2 min-w-0 ${!peutEditerExamenEtDecision ? 'opacity-80' : ''}`}>
          {/* Histoire et Antécédents — section 1 de la fiche papier "Fiche d'Anesthésie –
              Réanimation", organisée en deux sous-sections : « Histoire » (motif actuel, dernier
              repas/boisson, patient mineur, autorisation d'opérer) et « Antécédents » (tout le
              reste de l'ancien bloc). */}
          <section id="cpa-antecedents" className="bg-surface-container-lowest rounded-xl p-4 shadow-sm space-y-4 scroll-mt-36">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history_edu</span>
              <h2 className="text-lg font-bold font-headline text-primary">Histoire et Antécédents</h2>
            </div>

            <div className="space-y-4">
              {/* Sous-section « Histoire » — le motif actuel et les renseignements d'urgence
                  (Histoire actuelle, dernier repas/boisson, patient mineur, autorisation
                  d'opérer signée). */}
              <div className="rounded-xl bg-white/70 border border-outline-variant/30 p-4 space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>note_alt</span>
                  Histoire
                </h3>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-on-surface-variant">Histoire actuelle</label>
                  <textarea disabled={!peutEditerExamenEtDecision} value={form.histoireActuelle} onChange={setField('histoireActuelle')} className="w-full h-20 bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 disabled:opacity-60" placeholder="Motif de consultation, contexte actuel..."></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-on-surface-variant">Urgence — Dernier repas / Dernière boisson</label>
                    <input disabled={!peutEditerExamenEtDecision} value={form.dernierRepasBoisson} onChange={setField('dernierRepasBoisson')} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="ex: repas à 19h, eau à 22h" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-on-surface-variant">Patient mineur ?<Requis /></label>
                    <div className="flex gap-2">
                      <label className={pilleClass(form.patientMineur === true, peutEditerExamenEtDecision)}>
                        <input disabled={!peutEditerExamenEtDecision} checked={form.patientMineur === true} onChange={() => setForm(f => ({ ...f, patientMineur: true }))} className="hidden" name="patientMineur" type="radio" />OUI
                      </label>
                      <label className={pilleClass(form.patientMineur === false, peutEditerExamenEtDecision)}>
                        <input disabled={!peutEditerExamenEtDecision} checked={form.patientMineur === false} onChange={() => setForm(f => ({ ...f, patientMineur: false }))} className="hidden" name="patientMineur" type="radio" />NON
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-on-surface-variant">Autorisation d'opérer signée ?</label>
                    <div className="flex gap-2">
                      <label className={pilleClass(form.autorisationOpererSignee === true, peutEditerExamenEtDecision)}>
                        <input disabled={!peutEditerExamenEtDecision} checked={form.autorisationOpererSignee === true} onChange={() => setForm(f => ({ ...f, autorisationOpererSignee: true }))} className="hidden" name="autorisationOpererSignee" type="radio" />OUI
                      </label>
                      <label className={pilleClass(form.autorisationOpererSignee === false, peutEditerExamenEtDecision)}>
                        <input disabled={!peutEditerExamenEtDecision} checked={form.autorisationOpererSignee === false} onChange={() => setForm(f => ({ ...f, autorisationOpererSignee: false }))} className="hidden" name="autorisationOpererSignee" type="radio" />NON
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sous-section « Antécédents » — tout le reste de l'ancien bloc Antécédents
                  (antécédents anesthésiques/chirurgicaux, incidents, ATCD médicaux/familiaux,
                  asthme, temps de saignement, obstétricaux, groupe sanguin, transfusions). */}
              <div className="rounded-xl bg-white/70 border border-outline-variant/30 p-4 space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                  Antécédents
                </h3>

            {/* Regroupés ensemble : trois champs directement liés à l'expérience anesthésique/
                chirurgicale passée du patient (ATCD d'anesthésie, ATCD anesthésiques et
                chirurgicaux détaillés, incidents constatés). */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant">Antécédents d'anesthésie ?</label>
                <div className="flex gap-2">
                  <label className={pilleClass(form.antecedentsAnesthesie === true, peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.antecedentsAnesthesie === true} onChange={() => setForm(f => ({ ...f, antecedentsAnesthesie: true }))} className="hidden" name="history" type="radio" />OUI
                  </label>
                  <label className={pilleClass(form.antecedentsAnesthesie === false, peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.antecedentsAnesthesie === false} onChange={() => setForm(f => ({ ...f, antecedentsAnesthesie: false }))} className="hidden" name="history" type="radio" />NON
                  </label>
                </div>
              </div>
              <div className="space-y-2"><label className="block text-sm font-semibold text-on-surface-variant">ATCD anesthésiques et chirurgicaux</label>
                <textarea disabled={!peutEditerExamenEtDecision} value={form.atcdChirurgicaux} onChange={setField('atcdChirurgicaux')} className="w-full h-20 bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Interventions, anesthésies antérieures..."></textarea>
              </div>
              <div className="space-y-2"><label className="block text-sm font-semibold text-on-surface-variant">Incidents</label>
                <textarea disabled={!peutEditerExamenEtDecision} value={form.notesIncidents} onChange={setField('notesIncidents')} className="w-full h-20 bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Décrire tout incident..."></textarea>
              </div>
            </div>

            {/* Regroupés ensemble : les deux champs d'antécédents "généraux" (médicaux, familiaux),
                distincts du bloc anesthésique/chirurgical ci-dessus. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2"><label className="block text-sm font-semibold text-on-surface-variant">ATCD médicaux</label>
                <textarea disabled={!peutEditerExamenEtDecision} value={form.atcdMedicaux} onChange={setField('atcdMedicaux')} className="w-full h-20 bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="HTA, diabète..."></textarea>
              </div>
              <div className="space-y-2"><label className="block text-sm font-semibold text-on-surface-variant">ATCD Familiaux</label>
                <textarea disabled={!peutEditerExamenEtDecision} value={form.atcdFamiliaux} onChange={setField('atcdFamiliaux')} className="w-full h-20 bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="HTA, diabète, asthme..."></textarea>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant">Asthmatique ?</label>
                <div className="flex gap-2">
                  <label className={pilleClass(form.asthme === true, peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.asthme === true} onChange={() => setForm(f => ({ ...f, asthme: true }))} className="hidden" name="asthme" type="radio" />OUI
                  </label>
                  <label className={pilleClass(form.asthme === false, peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.asthme === false} onChange={() => setForm(f => ({ ...f, asthme: false }))} className="hidden" name="asthme" type="radio" />NON
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-on-surface-variant">Temps de saignement</label>
                <div className="flex gap-2">
                  <label className={pilleClass(form.tempsSaignement === 'NORMAL', peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.tempsSaignement === 'NORMAL'} onChange={() => setForm(f => ({ ...f, tempsSaignement: 'NORMAL' }))} className="hidden" name="tempsSaignement" type="radio" />NORMAL
                  </label>
                  <label className={pilleClass(form.tempsSaignement === 'ALLONGE', peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.tempsSaignement === 'ALLONGE'} onChange={() => setForm(f => ({ ...f, tempsSaignement: 'ALLONGE' }))} className="hidden" name="tempsSaignement" type="radio" />ALLONGÉ
                  </label>
                </div>
              </div>
            </div>

            {/* ATCD Obstétricaux + Contraception regroupés — G/P/A ne reçoivent qu'un chiffre
                (quelques unités), donc volontairement étroits plutôt qu'une pleine colonne. */}
            <div className="border-t border-outline-variant/20 pt-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">ATCD Obstétricaux</label>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-16"><label className="text-[10px] font-bold block mb-1">G</label><input disabled={!peutEditerExamenEtDecision} value={form.atcdObstetricauxG} onChange={setField('atcdObstetricauxG')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm text-center disabled:opacity-60" inputMode="numeric" maxLength={3} /></div>
                <div className="w-16"><label className="text-[10px] font-bold block mb-1">P</label><input disabled={!peutEditerExamenEtDecision} value={form.atcdObstetricauxP} onChange={setField('atcdObstetricauxP')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm text-center disabled:opacity-60" inputMode="numeric" maxLength={3} /></div>
                <div className="w-16"><label className="text-[10px] font-bold block mb-1">A</label><input disabled={!peutEditerExamenEtDecision} value={form.atcdObstetricauxA} onChange={setField('atcdObstetricauxA')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm text-center disabled:opacity-60" inputMode="numeric" maxLength={3} /></div>
                <div className="flex-1 min-w-[140px]"><label className="text-[10px] font-bold block mb-1">DDR</label><input disabled={!peutEditerExamenEtDecision} value={form.atcdObstetricauxDdr} onChange={setField('atcdObstetricauxDdr')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm disabled:opacity-60" type="date" /></div>
                <div className="flex-1 min-w-[160px]"><label className="text-[10px] font-bold block mb-1">Contraception</label><input disabled={!peutEditerExamenEtDecision} value={form.contraception} onChange={setField('contraception')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm disabled:opacity-60" /></div>
              </div>
            </div>

            <div className="border-t border-outline-variant/20 pt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2"><label className="text-sm font-semibold text-on-surface-variant block">Allergies médicamenteuses</label>
                <input disabled={!peutEditerExamenEtDecision} value={form.allergiesMedicamenteuses} onChange={setField('allergiesMedicamenteuses')} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Aucune / préciser..." /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-on-surface-variant block">Allergies (autres)</label>
                <input disabled={!peutEditerExamenEtDecision} value={form.allergiesAutres} onChange={setField('allergiesAutres')} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Latex, alimentaire..." /></div>
            </div>

            <div className="border-t border-outline-variant/20 pt-3 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Groupe sanguin</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div><label className="text-[10px] font-bold block mb-1">Groupe (A/B/AB/O)</label>
                  <select disabled={!peutEditerExamenEtDecision} value={form.groupeSanguinCpaGroupe} onChange={setField('groupeSanguinCpaGroupe')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm disabled:opacity-60">
                    <option value="">—</option><option>A</option><option>B</option><option>AB</option><option>O</option>
                  </select>
                </div>
                <div><label className="text-[10px] font-bold block mb-1">Phénotype</label><input disabled={!peutEditerExamenEtDecision} value={form.groupeSanguinCpaPhenotype} onChange={setField('groupeSanguinCpaPhenotype')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm disabled:opacity-60" /></div>
                <div><label className="text-[10px] font-bold block mb-1">RAI</label><input disabled={!peutEditerExamenEtDecision} value={form.groupeSanguinCpaRai} onChange={setField('groupeSanguinCpaRai')} className="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm disabled:opacity-60" placeholder="Négative / positive..." /></div>
              </div>
            </div>

            <div className="border-t border-outline-variant/20 pt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant block">Transfusions antérieures ?</label>
                <div className="flex gap-2">
                  <label className={pilleClass(form.transfusionsAnterieures === true, peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.transfusionsAnterieures === true} onChange={() => setForm(f => ({ ...f, transfusionsAnterieures: true }))} className="hidden" name="transfusions" type="radio" />OUI
                  </label>
                  <label className={pilleClass(form.transfusionsAnterieures === false, peutEditerExamenEtDecision)}>
                    <input disabled={!peutEditerExamenEtDecision} checked={form.transfusionsAnterieures === false} onChange={() => setForm(f => ({ ...f, transfusionsAnterieures: false }))} className="hidden" name="transfusions" type="radio" />NON
                  </label>
                </div>
              </div>
              <div className="space-y-2"><label className="text-sm font-semibold text-on-surface-variant block">Incidents transfusionnels</label>
                <input disabled={!peutEditerExamenEtDecision} value={form.transfusionsIncidents} onChange={setField('transfusionsIncidents')} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Aucun / préciser..." /></div>
            </div>
              </div>
            </div>
          </section>

          {/* Examen clinique */}
          <section id="cpa-examen" className="bg-surface-container-lowest rounded-xl p-4 shadow-sm scroll-mt-36">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">stethoscope</span>
              <h2 className="text-lg font-bold font-headline text-primary">Examen clinique</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-3 bg-surface-container-low rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">CONSTANTES</h3>
                <div className="space-y-3">
                  <div><label className="text-[10px] font-bold block mb-1">Fréquence Cardiaque (BPM)</label><input disabled={!peutEditerExamenEtDecision} value={form.frequenceCardiaque} onChange={setField('frequenceCardiaque')} className="w-full bg-white border-none rounded-lg p-2 text-lg font-bold text-primary disabled:opacity-60" type="number" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold block mb-1">TA Syst.</label><input disabled={!peutEditerExamenEtDecision} value={form.taSystolique} onChange={setField('taSystolique')} className="w-full bg-white border-none rounded-lg p-2 text-sm font-bold disabled:opacity-60" type="number" /></div>
                    <div><label className="text-[10px] font-bold block mb-1">TA Diast.</label><input disabled={!peutEditerExamenEtDecision} value={form.taDiastolique} onChange={setField('taDiastolique')} className="w-full bg-white border-none rounded-lg p-2 text-sm font-bold disabled:opacity-60" type="number" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold block mb-1">Taille (cm)</label><input disabled={!peutEditerExamenEtDecision} value={form.taille} onChange={setField('taille')} className="w-full bg-white border-none rounded-lg p-2 text-sm font-bold disabled:opacity-60" placeholder="170" type="number" /></div>
                    <div><label className="text-[10px] font-bold block mb-1">Poids (kg)</label><input disabled={!peutEditerExamenEtDecision} value={form.poids} onChange={setField('poids')} className="w-full bg-white border-none rounded-lg p-2 text-sm font-bold disabled:opacity-60" placeholder="70" type="number" /></div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 grid grid-cols-1 gap-3">
                <div><label className="text-xs font-bold uppercase tracking-tighter">Cardio-vasculaire</label><textarea disabled={!peutEditerExamenEtDecision} value={form.examenCardiovasculaire} onChange={setField('examenCardiovasculaire')} className={texteRequisClass(form.examenCardiovasculaire)} placeholder="Bruit du coeur..."></textarea></div>
                <div><label className="text-xs font-bold uppercase tracking-tighter">Pulmonaire</label><textarea disabled={!peutEditerExamenEtDecision} value={form.examenPulmonaire} onChange={setField('examenPulmonaire')} className={texteRequisClass(form.examenPulmonaire)} placeholder="Murmure vésiculaire..."></textarea></div>
                <div><label className="text-xs font-bold uppercase tracking-tighter">Neurologique</label><textarea disabled={!peutEditerExamenEtDecision} value={form.examenNeurologique} onChange={setField('examenNeurologique')} className={texteRequisClass(form.examenNeurologique)} placeholder="Etat de conscience..."></textarea></div>
              </div>
              <div className="md:col-span-4 grid grid-cols-1 gap-3">
                <div><label className="text-xs font-bold uppercase tracking-tighter">Coloration Conjonctivale</label>
                  <input disabled={!peutEditerExamenEtDecision} value={form.colorationConjonctivale} onChange={setField('colorationConjonctivale')} className={texteRequisClass(form.colorationConjonctivale, '')} placeholder="Normale, pâleur, ictère..." />
                </div>
                <div><label className="text-xs font-bold uppercase tracking-tighter">Abords veineux</label><textarea disabled={!peutEditerExamenEtDecision} value={form.abordVeineux} onChange={setField('abordVeineux')} className={texteRequisClass(form.abordVeineux)} placeholder="Qualité du réseau..."></textarea></div>
                <div><label className="text-xs font-bold uppercase tracking-tighter">Rachis</label><textarea disabled={!peutEditerExamenEtDecision} value={form.rachis} onChange={setField('rachis')} className={texteRequisClass(form.rachis)} placeholder="Mobilité, déformation..."></textarea></div>
              </div>
            </div>
          </section>

          {/* Voies aériennes */}
          <section id="cpa-voies-aeriennes" className="bg-surface-container-lowest rounded-xl p-4 shadow-sm scroll-mt-36">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">air</span>
              <h2 className="text-lg font-bold font-headline text-primary">Voies aériennes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold block">Mallampati Score</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((score) => (
                    <button key={score} onClick={() => setScoreMallampati(score)} disabled={!peutEditerExamenEtDecision}
                      className={`p-4 rounded-lg border-2 font-bold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed ${scoreMallampati === score ? 'border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-md shadow-primary/25' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-primary-fixed hover:border-primary/40'}`}>
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2"><label className="text-sm font-semibold block">Ouverture buccale</label><input disabled={!peutEditerExamenEtDecision} value={form.ouvertureBuccale} onChange={setField('ouvertureBuccale')} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold block">DMTC</label><input disabled={!peutEditerExamenEtDecision} value={form.distanceMentoThyroidienne} onChange={setField('distanceMentoThyroidienne')} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 border-t border-outline-variant/20 pt-4">
              <div className="space-y-2"><label className="text-sm font-semibold uppercase tracking-widest text-[10px]">DENTS</label>
                <select disabled={!peutEditerExamenEtDecision} value={form.dents} onChange={setField('dents')} className={texteRequisClass(form.dents, '')}>
                  <option value="">— Sélectionner —</option><option>Denture saine</option><option>Prothèse amovible</option><option>Dents fragiles/mobiles</option>
                </select>
              </div>
              <div className="space-y-2"><label className="text-sm font-semibold uppercase tracking-widest text-[10px]">TABAC</label>
                <select disabled={!peutEditerExamenEtDecision} value={form.tabac} onChange={setField('tabac')} className={texteRequisClass(form.tabac, '')}>
                  <option value="">— Sélectionner —</option><option>Non fumeur</option><option>Fumeur actif</option><option>Fumeur passif</option><option>Ancien fumeur</option>
                </select>
              </div>
              <div className="space-y-2"><label className="text-sm font-semibold uppercase tracking-widest text-[10px]">ALCOOLS</label>
                <select disabled={!peutEditerExamenEtDecision} value={form.alcool} onChange={setField('alcool')} className={texteRequisClass(form.alcool, '')}>
                  <option value="">— Sélectionner —</option><option>Aucun</option><option>Occasionnel</option><option>Régulier</option><option>Chronique</option><option>Sevrage</option>
                </select>
              </div>
            </div>
          </section>

          {/* Traitement médicamenteux — traitement en cours uniquement, juste avant la
              Conclusion : le « traitement à suivre » a été supprimé, remplacé par la
              prémédication des instructions pré-opératoires (voir plus bas). */}
          <section id="cpa-traitement" className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm space-y-3 scroll-mt-36 ${!peutEditerExamenEtDecision ? 'opacity-80' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pill</span>
              <h2 className="text-lg font-bold font-headline text-primary">Traitement médicamenteux</h2>
            </div>
            <div className="space-y-2"><label className="text-sm font-semibold text-on-surface-variant block">Traitement en cours</label>
              <textarea disabled={!peutEditerExamenEtDecision} value={form.traitementEnCours} onChange={setField('traitementEnCours')} className="w-full h-20 bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60"></textarea></div>
          </section>

          {/* Conclusion — section 4 de la fiche papier. Score ASA amené ici, aligné avec le champ
              Conclusion (déplacé depuis le bloc ASA & Protocole plus bas) et réduit à la même
              taille que le sélecteur Mallampati (Voies aériennes) pour bien s'aligner à côté du
              texte. */}
          <section id="cpa-conclusion" className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm space-y-3 scroll-mt-36 ${!peutEditerExamenEtDecision ? 'opacity-80' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">summarize</span>
          <h2 className="text-lg font-bold font-headline text-primary">Conclusion</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant block">Conclusion</label>
            <textarea disabled={!peutEditerExamenEtDecision} value={form.conclusion} onChange={setField('conclusion')} className="w-full h-28 bg-surface-container-low border-none rounded-xl p-3 text-sm disabled:opacity-60"></textarea>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold block">Score ASA</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6].map((score) => (
                <button key={score} onClick={() => setScoreASA(score)} disabled={!peutEditerExamenEtDecision}
                  className={`p-4 rounded-lg border-2 font-bold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed ${scoreASA === score ? 'border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-md shadow-primary/25' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-primary-fixed hover:border-primary/40'}`}>
                  {score}
                </button>
              ))}
              <button onClick={() => setScoreASA('E')} disabled={!peutEditerExamenEtDecision}
                className={`col-span-2 rounded-lg border-2 font-bold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed ${scoreASA === 'E' ? 'border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-md shadow-primary/25' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-primary-fixed hover:border-primary/40'}`}>
                E
              </button>
            </div>
          </div>
          </div>
        </section>
        </div>

        {/* Carte Prescription — collée (sticky) le long d'Antécédents / Examen / Voies aériennes /
            Conclusion, là où une prescription complémentaire est le plus susceptible d'être
            nécessaire. top-36 (144px) pour rester sous le TopBar fixe (~96px) ET le sommaire
            sticky de la CPA (~50px), même valeur que le scroll-mt-36 utilisé sur les ancres. */}
        <div className="w-full lg:w-80 lg:sticky lg:top-36 space-y-2">
          <section className={`rounded-2xl p-5 shadow-lg overflow-hidden ${peutDeciderAptitudeCpa ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/40' : 'bg-surface-container-lowest text-on-surface-variant'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-2xl" style={peutDeciderAptitudeCpa ? { fontVariationSettings: "'FILL' 1" } : undefined}>edit_note</span>
              <h2 className="text-lg font-bold font-headline">Prescription</h2>
            </div>
            {!peutDeciderAptitudeCpa ? (
              <p className="text-xs">
                Prescrire pendant la CPA est réservé à l'anesthésiste, au responsable CPA ou au major{roleName ? ` (votre rôle : ${roleName})` : ''}.
              </p>
            ) : (
              <>
                <p className="text-xs text-white/90 mb-3">
                  Au cas où une prescription est nécessaire pendant la CPA{patient?.serviceOrigine ? ` — sera envoyée à ${patient.serviceOrigine}` : ''}.
                </p>
                <button type="button" onClick={() => setShowPrescriptionModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-3.5 bg-white text-indigo-600 rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                  <span className="material-symbols-outlined">edit_note</span> Prescrire
                </button>
              </>
            )}
            <PrescriptionCpaModal
              open={showPrescriptionModal}
              onClose={() => setShowPrescriptionModal(false)}
              patientId={patientId || patient?.id || ''}
              serviceDestOverride={
                patient?.serviceOrigineId && patient?.serviceOrigine
                  ? { serviceId: patient.serviceOrigineId, serviceName: patient.serviceOrigine }
                  : undefined
              }
            />
          </section>
        </div>
      </div>

      {/* Protocole anesthésique — section indépendante, juste après la Conclusion : le protocole
          ne fait pas partie des consignes données au patient, il a quitté les Instructions
          pré-opératoires pour sa propre section pleine largeur. Design inchangé. */}
      <section id="cpa-protocole" className={`scroll-mt-36 ${!peutEditerExamenEtDecision ? 'opacity-80' : ''}`}>
        <div className="bg-white rounded-2xl shadow-md border-2 border-secondary/20 overflow-hidden">
          <div className="bg-gradient-to-r from-secondary to-secondary/80 px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-white">vaccines</span>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-widest">Protocole anesthésique</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/10">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">medication_liquid</span> Type d'anesthésie
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {['Anesthésie Générale (AG)', 'ALR', 'AL'].map(type => (
                  <button key={type} type="button" disabled={!peutEditerExamenEtDecision}
                    onClick={() => setForm(f => ({ ...f, typeAnesthesie: type, sousTypeAnesthesie: '' }))}
                    className={`p-3 rounded-lg border-2 font-bold text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed ${form.typeAnesthesie === type ? 'border-secondary bg-secondary text-white shadow-md' : 'border-secondary/20 bg-white text-on-surface hover:bg-secondary/10'}`}>
                    {type === 'Anesthésie Générale (AG)' ? 'AG' : type}
                  </button>
                ))}
              </div>
              {form.typeAnesthesie === 'Anesthésie Générale (AG)' && (
                <div className="grid grid-cols-2 gap-2">
                  {['Sédation', 'Intubation', 'Masque Laryngé', 'Masque Facial'].map(st => (
                    <button key={st} type="button" disabled={!peutEditerExamenEtDecision}
                      onClick={() => setForm(f => ({ ...f, sousTypeAnesthesie: st }))}
                      className={`p-2.5 rounded-lg border-2 font-semibold text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed ${form.sousTypeAnesthesie === st ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-secondary/20 bg-white text-on-surface-variant hover:bg-secondary/5'}`}>
                      {st}
                    </button>
                  ))}
                </div>
              )}
              {form.typeAnesthesie === 'ALR' && (
                <div className="grid grid-cols-3 gap-2">
                  {['Rachianesthésie', 'APD', 'Blocage'].map(st => (
                    <button key={st} type="button" disabled={!peutEditerExamenEtDecision}
                      onClick={() => setForm(f => ({ ...f, sousTypeAnesthesie: st }))}
                      className={`p-2.5 rounded-lg border-2 font-semibold text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed ${form.sousTypeAnesthesie === st ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-secondary/20 bg-white text-on-surface-variant hover:bg-secondary/5'}`}>
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/10">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">air</span> Technique d'intubation
              </label>
              <select disabled={!peutEditerExamenEtDecision} value={form.techniqueIntubation} onChange={setField('techniqueIntubation')} className="w-full bg-white border border-secondary/20 rounded-xl p-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-secondary/30 outline-none disabled:opacity-60">
                <option value="">— Sélectionner —</option><option>Sonde Endotrachéale</option><option>Masque Laryngé</option><option>IOT Séquence Rapide</option>
              </select>
            </div>
            <div className="p-3 bg-secondary/5 rounded-xl border border-secondary/10">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wide block mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">checklist</span> Recommandations et protocoles
              </label>
              <textarea disabled={!peutEditerExamenEtDecision} value={form.recommandationsProtocole} onChange={setField('recommandationsProtocole')} className="w-full h-20 bg-white border border-secondary/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-secondary/30 outline-none disabled:opacity-60" placeholder="Surveillance renforcée, précautions particulières..."></textarea>
            </div>
          </div>
        </div>
      </section>

      {/* Instructions & Prescription */}
      <div id="cpa-instructions" className="rounded-2xl border-2 border-blue-300 bg-gradient-to-b from-blue-50/80 to-white shadow-md overflow-hidden scroll-mt-36">
        <div className="px-4 py-3 bg-blue-100/70 border-b border-blue-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">assignment</span>
          <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-widest">Instructions Pré-opératoires</h2>
        </div>
        <div className="p-4">
          {/* Jeûne — consignes au patient (règles de jeûne, préparation physique, tâches
              soignantes). Le Protocole anesthésique a rejoint sa propre section, juste après la
              Conclusion. */}
          <div className="space-y-2">
            <div className="h-full bg-white rounded-xl border border-blue-200 p-4 shadow-sm space-y-2">
                <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><span className="material-symbols-outlined text-blue-600">no_food</span> Jeûne</h3>
                <div className="space-y-2"><textarea disabled={!peutEditerExamenEtDecision} value={form.jeune} onChange={setField('jeune')} className="w-full h-20 bg-blue-50/60 border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Instructions spécifiques..."></textarea></div>
                <div className="bg-blue-50/60 rounded-xl p-4 border-l-4 border-blue-400">
                  <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-2">Règles de jeûne</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-3 rounded-lg">
                      <label className="text-[10px] font-bold uppercase block mb-1">Solides</label>
                      <input disabled={!peutEditerExamenEtDecision} value={form.jeuneSolides} onChange={setField('jeuneSolides')} placeholder="À partir de minuit" className="w-full bg-transparent border-none text-sm font-bold p-0 focus:ring-0 disabled:opacity-60 placeholder:font-normal placeholder:text-gray-400" />
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <label className="text-[10px] font-bold uppercase block mb-1">Liquide</label>
                      <input disabled={!peutEditerExamenEtDecision} value={form.jeuneLiquides} onChange={setField('jeuneLiquides')} placeholder="Jusqu'à H-2" className="w-full bg-transparent border-none text-sm font-bold p-0 focus:ring-0 disabled:opacity-60 placeholder:font-normal placeholder:text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-blue-800">Préparation physique</label><textarea disabled={!peutEditerExamenEtDecision} value={form.preparationPhysique} onChange={setField('preparationPhysique')} className="w-full h-20 bg-blue-50/60 border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Douche, dépilation..."></textarea></div>
                <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-blue-800">Tâches soignantes</label><textarea disabled={!peutEditerExamenEtDecision} value={form.tachesInfirmieres} onChange={setField('tachesInfirmieres')} className="w-full h-20 bg-blue-50/60 border-none rounded-xl p-3 text-sm disabled:opacity-60" placeholder="Surveillance, constantes..."></textarea></div>
              </div>
            </div>

          {/* Rangée 2 : Prémédication + Médicaments d'anesthésie et de réanimation, côte à côte et
              à la même hauteur. Médicaments d'anesthésie est volontairement plus large et plus
              coloré : c'est le seul motif de venue de l'anesthésiste sur cette page pour beaucoup
              de passages (prescrire ses médicaments sans forcément refaire toute la CPA), il ne
              doit jamais se perdre à le chercher au milieu des autres champs. */}
          <div className={`grid grid-cols-1 md:grid-cols-5 gap-8 items-stretch mt-4 pt-4 border-t border-surface-container ${!peutEditerExamenEtDecision ? 'opacity-80' : ''}`}>
            <div className="md:col-span-2">
              <div className="h-full bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-blue-600">pill</span> Prémédication</h3>
              <div className="overflow-hidden border border-surface-container rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container text-[10px] uppercase font-bold text-on-surface-variant">
                    <tr><th className="px-4 py-3">Prémédication</th><th className="px-4 py-3">Dose</th><th className="px-4 py-3">Voie d'Admin</th><th className="px-4 py-3">Début</th><th className="px-4 py-3">Fréquence</th><th className="px-4 py-3">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {medicaments.map((med, i) => (
                      <tr key={i} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-4 py-3 font-semibold">{med.premedication}</td><td className="px-4 py-3">{med.dose}</td><td className="px-4 py-3">{med.voieAdmin}</td><td className="px-4 py-3">{med.debut || '-'}</td><td className="px-4 py-3">{med.frequence || '-'}</td>
                        <td className="px-4 py-3">
                          {peutEditerExamenEtDecision && (
                            <button onClick={() => supprimerMedicament(i)} className="text-error"><span className="material-symbols-outlined text-sm">delete</span></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {peutEditerExamenEtDecision && (
                  <button onClick={() => setShowMedicamentModal(true)} className="w-full py-3 text-xs font-bold text-primary hover:bg-primary-fixed/20 transition-colors">+ AJOUTER UN MÉDICAMENT</button>
                )}
              </div>
              </div>

              {showMedicamentModal && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                    <h3 className="text-lg font-extrabold mb-2">Ajouter un médicament</h3>
                    <div className="space-y-3">
                      <div><label className="text-xs font-bold block mb-1">Prémédication</label><input type="text" value={nouveauMedicament.premedication} onChange={(e) => setNouveauMedicament({ ...nouveauMedicament, premedication: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div><label className="text-xs font-bold block mb-1">Dose</label><input type="text" value={nouveauMedicament.dose} onChange={(e) => setNouveauMedicament({ ...nouveauMedicament, dose: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div><label className="text-xs font-bold block mb-1">Voie d'administration</label><input type="text" value={nouveauMedicament.voieAdmin} onChange={(e) => setNouveauMedicament({ ...nouveauMedicament, voieAdmin: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div><label className="text-xs font-bold block mb-1">Début</label><input type="text" value={nouveauMedicament.debut} onChange={(e) => setNouveauMedicament({ ...nouveauMedicament, debut: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div><label className="text-xs font-bold block mb-1">Fréquence</label><input type="text" value={nouveauMedicament.frequence} onChange={(e) => setNouveauMedicament({ ...nouveauMedicament, frequence: e.target.value })} className="w-full border rounded-lg p-2 text-sm" /></div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setShowMedicamentModal(false)} className="px-6 py-2 border rounded-lg text-sm font-bold">Annuler</button>
                      <button onClick={ajouterMedicament} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold">Ajouter</button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>

            <div className="md:col-span-3">
              <div className="h-full flex flex-col rounded-2xl border-2 border-indigo-300 shadow-lg shadow-indigo-500/20 overflow-hidden bg-white">
                <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-widest">Médicaments d'anesthésie et de réanimation</h3>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-sm text-on-surface-variant mb-3">À prévoir pour l'anesthésie et une éventuelle réanimation peropératoire — distinct de la prémédication, rempli par l'anesthésiste.</p>
                  {!peutEditerMedicamentsEtVpa && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      Réservé à l'anesthésiste{roleName ? ` (votre rôle : ${roleName})` : ''}.
                    </div>
                  )}
                  <button type="button" onClick={() => peutEditerMedicamentsEtVpa && setShowCatalogueModal(true)} disabled={!peutEditerMedicamentsEtVpa}
                    className="mt-auto w-full flex items-center justify-between gap-3 p-5 bg-indigo-600 text-white rounded-xl font-extrabold shadow-md shadow-indigo-500/30 hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
                    <span className="flex items-center gap-2 text-base">
                      <span className="material-symbols-outlined text-2xl">checklist</span>
                      Liste des médicaments ({medicamentsSelectionnes.length}/{TOTAL_MEDICAMENTS} sélectionnés)
                    </span>
                    <span className="text-xs font-bold underline underline-offset-2 shrink-0">{peutEditerMedicamentsEtVpa ? 'Ouvrir la liste complète' : 'Voir la liste'}</span>
                  </button>
                </div>

                <MedicamentsAnesthesieModal
                  open={showCatalogueModal}
                  onClose={() => setShowCatalogueModal(false)}
                  rows={medicamentsAnesthesieRows}
                  onRowsChange={setMedicamentsAnesthesieRows}
                />
              </div>
            </div>
          </div>

          {/* Décision Finale — seul champ réellement obligatoire de la consultation : mise en
              évidence forte (cadre doré) pour la distinguer de tous les autres champs libres */}
          <div id="cpa-decision" className="mt-4 pt-4 border-t border-surface-container scroll-mt-36">
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/80 to-white shadow-md overflow-hidden">
              <div className="px-4 py-3 bg-amber-100/70 border-b border-amber-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">gavel</span>
                <h2 className="text-sm font-extrabold text-amber-900 uppercase tracking-widest">Décision Finale</h2>
                <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase rounded-full">Obligatoire</span>
              </div>
              <div className="p-4">
                {!peutEditerExamenEtDecision && !cpaDejaRemplie && (
                  <div className="mb-3 p-2 bg-amber-100 border border-amber-300 rounded-lg text-xs text-amber-900">
                    Décision réservée au responsable CPA, au major, ou à l'anesthésiste s'il réalise seul sa CPA{roleName ? ` (votre rôle : ${roleName})` : ''}.
                  </div>
                )}
                {estUrgent && (
                  <p className="text-[11px] text-red-700 font-semibold mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    Patient urgent — pas de report possible : apte (à opérer directement) ou inapte.
                  </p>
                )}
                <div className={`grid grid-cols-1 gap-2 ${estUrgent ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                  {[
                    { key: 'APTE', label: "Apte à l'anesthésie", icon: 'check_circle', activeClass: 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm' },
                    { key: 'INAPTE', label: 'Inapte à ce jour', icon: 'cancel', activeClass: 'bg-red-50 border-red-400 text-red-700 shadow-sm' },
                    ...(estUrgent ? [] : [{ key: 'REPORT', label: 'CPA à reporter', sousLabel: '(pas l\'opération — à refaire après examens)', icon: 'schedule', activeClass: 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm' }]),
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                        setDecision(opt.key as any);
                        // Urgent : binaire, pas de sous-choix "devenir de l'opération" à afficher —
                        // apte = à opérer directement (RETENUE), inapte = non opérable (REFUSEE).
                        setDecisionOperation(estUrgent ? (opt.key === 'APTE' ? 'RETENUE' : opt.key === 'INAPTE' ? 'REFUSEE' : '') : '');
                      }} disabled={!peutEditerExamenEtDecision}
                      className={`w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                        decision === opt.key ? opt.activeClass + ' scale-[1.02]' : 'border-outline-variant bg-white text-on-surface-variant hover:border-amber-300 hover:bg-amber-50'
                      }`}>
                      <span className="material-symbols-outlined text-2xl" style={decision === opt.key ? { fontVariationSettings: "'FILL' 1" } : undefined}>{opt.icon}</span>
                      <span className="font-bold text-sm text-center">{opt.label}</span>
                      {opt.sousLabel && <span className="text-[10px] font-medium text-center leading-tight text-on-surface-variant/70">{opt.sousLabel}</span>}
                    </button>
                  ))}
                </div>

                {/* Devenir de l'opération — sous-choix affiché une fois l'aptitude tranchée.
                    Distinct du bouton "CPA à reporter" ci-dessus : ici la CPA est terminée, on
                    statue sur l'opération elle-même. Le rendez-vous n'est pas obligatoire en cas
                    de report. */}
                {!estUrgent && (decision === 'APTE' || decision === 'INAPTE') && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60">
                    <label className="text-xs font-bold text-amber-900 uppercase tracking-wide block mb-2">Devenir de l'opération</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(decision === 'APTE'
                        ? [
                            { key: 'RETENUE', label: "Date d'opération retenue", icon: 'event_available', activeClass: 'bg-emerald-50 border-emerald-400 text-emerald-700' },
                            { key: 'REPORTEE', label: "Date d'opération reportée", icon: 'event_busy', activeClass: 'bg-orange-50 border-orange-400 text-orange-700' },
                          ]
                        : [
                            { key: 'REPORTEE', label: "Date d'opération reportée", icon: 'event_busy', activeClass: 'bg-orange-50 border-orange-400 text-orange-700' },
                            { key: 'REFUSEE', label: 'Opération refusée (impossible)', icon: 'block', activeClass: 'bg-red-50 border-red-400 text-red-700' },
                          ]
                      ).map(opt => (
                        <button key={opt.key} type="button" onClick={() => setDecisionOperation(opt.key as any)} disabled={!peutEditerExamenEtDecision}
                          className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                            decisionOperation === opt.key ? opt.activeClass : 'border-outline-variant bg-white text-on-surface-variant hover:border-amber-300 hover:bg-amber-50'
                          }`}>
                          <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {decisionOperation === 'REPORTEE' && (
                      <div className="mt-2">
                        <label className="text-xs font-bold text-orange-700 block mb-1">Nouvelle date et heure d'opération</label>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <input disabled={!peutEditerExamenEtDecision} className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm disabled:opacity-60" type="date"
                            value={dateOperationReportee} onChange={e => setDateOperationReportee(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                          <input disabled={!peutEditerExamenEtDecision} className="flex-none w-32 bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm disabled:opacity-60" type="time"
                            value={heureOperationReportee} onChange={e => setHeureOperationReportee(e.target.value)} />
                        </div>
                        <p className="text-[11px] text-orange-700 mt-1">Dès la validation, la date en haut de page est mise à jour et le service demandeur est notifié. Facultatif : laissez vide si la nouvelle date n'est pas encore connue.</p>
                      </div>
                    )}
                  </div>
                )}

                {decision === 'INAPTE' && (
                  <div className="mt-3">
                    <label className="text-xs font-bold text-red-700 block mb-1">Motif du refus *</label>
                    <textarea disabled={!peutEditerExamenEtDecision} value={motifRefus} onChange={e => setMotifRefus(e.target.value)}
                      className="w-full h-20 bg-red-50 border border-red-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-300 outline-none disabled:opacity-60" placeholder="Expliquez le motif de l'inaptitude..." />
                  </div>
                )}
                {decision === 'REPORT' && (
                  <div className="mt-3">
                    <p className="text-[11px] text-orange-700 mb-2">Ce report concerne la CPA elle-même (à refaire plus tard, par exemple si des examens complémentaires sont nécessaires avant de statuer) — pas la date de l'opération.</p>
                    <label className="text-xs font-bold text-orange-700 block mb-1">Motif du report *</label>
                    <textarea disabled={!peutEditerExamenEtDecision} value={motifRefus} onChange={e => setMotifRefus(e.target.value)}
                      className="w-full h-20 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-300 outline-none disabled:opacity-60" placeholder="Ex : bilan biologique complémentaire nécessaire avant de statuer sur l'aptitude..." />
                    <label className="text-xs font-bold text-orange-700 block mt-3 mb-1">Date de report (facultatif — pour refaire la CPA)</label>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <input disabled={!peutEditerExamenEtDecision} className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm disabled:opacity-60" type="date" value={dateReportCpa} onChange={e => setDateReportCpa(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                      <input disabled={!peutEditerExamenEtDecision} className="flex-none w-32 bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm disabled:opacity-60" type="time" value={heureReportCpa} onChange={e => setHeureReportCpa(e.target.value)} />
                    </div>
                  </div>
                )}
                {/* Pas de saisie manuelle ici : quand ce n'est pas le Responsable CPA qui soumet
                    la fiche, la validation téléphonique du Responsable CPA est actée
                    automatiquement à l'enregistrement (voir handleValider) — aucun workflow
                    d'approbation à gérer sur la plateforme. */}
              </div>
            </div>
          </div>

          {historiqueCpa.length > 0 && (
            <div className="mt-3 rounded-2xl border border-outline-variant/40 bg-white overflow-hidden">
              <button type="button" onClick={() => setOngletHistorique(v => !v)}
                className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">history</span>
                <span className="text-sm font-bold text-on-surface">Historique des CPA précédentes</span>
                <span className="ml-1 px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-extrabold rounded-full">{historiqueCpa.length}</span>
                <span className="material-symbols-outlined ml-auto text-on-surface-variant">{ongletHistorique ? 'expand_less' : 'expand_more'}</span>
              </button>
              {ongletHistorique && (
                <div className="px-4 pb-4 space-y-2">
                  {historiqueCpa.map((h: any) => (
                    <div key={h.id} className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{h.dateConsultation ? new Date(h.dateConsultation).toLocaleDateString('fr-FR') : '—'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          h.decision === 'APTE' ? 'bg-emerald-100 text-emerald-700' : h.decision === 'INAPTE' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>{h.decision === 'REPORT' ? 'CPA reportée' : h.decision}</span>
                      </div>
                      {h.motifRefus && <p className="text-xs text-on-surface-variant">Motif : {h.motifRefus}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vérification à la veille — plus un vrai "créneau" à planifier : elle a toujours lieu
              la veille de l'opération, la date est donc attribuée automatiquement (voir l'effet
              plus haut) à partir de la date d'intervention connue, pas choisie dans un calendrier.
              Sans objet pour un patient urgent (chirurgie immédiate, pas de "veille"), ni pour
              REPORT (voir la date de report ci-dessus) ou INAPTE. Sans cette date, le patient
              restait bloqué à CPA_REALISE, invisible du Fil de travail tant qu'un anesthésiste ne
              rouvrait pas manuellement la fiche. */}
          {(peutEditerExamenEtDecision || peutEditerMedicamentsEtVpa) && !estUrgent && decision === 'APTE' && (
            <div className="mt-4 p-4 bg-surface-container-low rounded-xl border space-y-2">
              <label className="text-sm font-bold block">Vérification à la veille de l'opération</label>
              <p className="text-xs text-on-surface-variant mb-1">
                {patient?.dateIntervention
                  ? `Date attribuée automatiquement (veille de l'opération du ${new Date(patient.dateIntervention).toLocaleDateString('fr-FR')}) — modifiable si besoin.`
                  : "Date d'opération pas encore connue : renseignez-la vous-même, ou laissez vide — le patient restera visible dans le Fil de travail en attendant."}
              </p>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <input className="flex-1 bg-white border-none rounded-lg p-2 text-sm" type="date" value={dateVPA} onChange={e => setDateVPA(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                <input className="flex-none w-32 bg-white border-none rounded-lg p-2 text-sm" type="time" value={heureVPA} onChange={e => setHeureVPA(e.target.value)} />
              </div>
            </div>
          )}

          {/* Export / Partage — capture la fiche CPA telle que remplie à l'instant en PDF, à
              envoyer au professeur responsable de CPA, par WhatsApp ou email (pas de partage
              "appareil" : la fiche ne part jamais vers quelqu'un à proximité). */}
          <div className="mt-4 pt-4 border-t border-surface-container">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">ios_share</span> Exporter / Partager la fiche CPA
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={handleTelechargerPdf} disabled={exportEnCours}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-base">picture_as_pdf</span> Télécharger en PDF
              </button>
              <button type="button" onClick={handlePartagerWhatsApp} disabled={exportEnCours}
                className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-base">chat</span> WhatsApp
              </button>
              <button type="button" onClick={handlePartagerEmail} disabled={exportEnCours}
                className="flex items-center gap-2 px-4 py-2 bg-on-surface-variant text-white rounded-lg text-xs font-bold hover:opacity-90 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-base">mail</span> Email
              </button>
              <button type="button" onClick={ouvrirModaleDestinataire}
                className="text-xs font-bold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
                {destinataireCpa?.email || destinataireCpa?.telephone ? 'Modifier le destinataire' : 'Définir le destinataire'}
              </button>
            </div>
            {(destinataireCpa?.email || destinataireCpa?.telephone) && (
              <p className="text-[11px] text-on-surface-variant mt-1.5">
                Destinataire mémorisé : {destinataireCpa.email || '—'}{destinataireCpa.telephone ? ` · ${destinataireCpa.telephone}` : ''}
              </p>
            )}
          </div>

          {/* Modale de saisie du destinataire — demandée une seule fois (au premier partage
              WhatsApp/email), puis mémorisée en localStorage pour les partages suivants. */}
          {showDestinataireModal && createPortal(
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-extrabold text-on-surface mb-1">Destinataire du partage CPA</h3>
                <p className="text-xs text-on-surface-variant mb-4">Coordonnées du professeur responsable de CPA — mémorisées pour les prochains partages.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant mb-1 block">Email</label>
                    <input type="email" className="w-full border border-outline-variant/30 rounded-lg p-2.5 text-sm" placeholder="professeur@exemple.mg"
                      value={destinataireEmailSaisi} onChange={e => setDestinataireEmailSaisi(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant mb-1 block">Téléphone WhatsApp</label>
                    <input type="tel" className="w-full border border-outline-variant/30 rounded-lg p-2.5 text-sm" placeholder="+261 34 00 000 00"
                      value={destinataireTelephoneSaisi} onChange={e => setDestinataireTelephoneSaisi(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowDestinataireModal(false); setDestinataireActionEnAttente(null); }}
                    className="px-4 py-2 border border-outline-variant/30 rounded-lg text-sm font-bold hover:bg-surface-container-low">Annuler</button>
                  <button type="button" onClick={handleConfirmerDestinataire} disabled={!destinataireEmailSaisi.trim() && !destinataireTelephoneSaisi.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50">Enregistrer</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Bouton Valider */}
          <div className="mt-4 pt-4 border-t border-surface-container flex justify-end">
            {(() => {
              const peutSoumettre = cpaDejaRemplie ? peutEditerMedicamentsEtVpa : peutEditerExamenEtDecision;
              const libelle = loading
                ? (cpaDejaRemplie ? 'Enregistrement...' : 'Validation...')
                : !peutSoumettre
                  ? 'Accès non autorisé'
                  : cpaDejaRemplie
                    ? 'Enregistrer les médicaments et la vérification veille'
                    : 'Valider la CPA';
              return (
                <button onClick={handleOuvrirRecap} disabled={loading || chargementCpa || !peutSoumettre}
                  className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50">
                  {libelle}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      <ConfirmationRecapModal
        open={showRecap}
        titre={estUrgent ? 'Visite Pré-Anesthésique (VPA)' : 'Consultation Pré-Anesthésique (CPA)'}
        sousTitre="Relisez la fiche complète avant de confirmer — rien n'est encore enregistré"
        sections={construireSectionsCpa()}
        onAnnuler={() => setShowRecap(false)}
        onConfirmer={handleValider}
        confirmEnCours={loading}
        labelConfirmer={cpaDejaRemplie ? 'Confirmer et enregistrer' : 'Confirmer et valider la CPA'}
      />
    </main>
  );
}
