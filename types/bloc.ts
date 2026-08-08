export interface NavItem {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
}

export interface Medecin {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  initiales: string;
}

export interface StatCard {
  label: string;
  value: string;
  subLabel: string;
  icon: string;
  color: string; // Tailwind color name like 'primary', 'secondary', etc.
}

export type NiveauUrgence = 'TRES_URGENT' | 'URGENT' | 'NORMAL';

export interface PatientBloc {
  id: string;
  nom: string;
  prenom: string;
  patientId: string;
  intervention: string;
  heure: string;
  dureePrevue: string;
  departBloc: string;
  priorite: NiveauUrgence;
}

export interface PatientReveil {
  id: string;
  nom: string;
  prenom: string;
  patientId: string;
  intervention: string;
  salleLit: string;
  dureePrevue: string;
  statut: string;
}

export interface NotificationCPA {
  id: string;
  heurePrescription: string;
  patient: {
    nom: string;
    idDossier: string;
  };
  intervention: string;
  chirurgien: {
    initiales: string;
    nom: string;
  };
  professeurCPA: string;
  estUrgent: boolean;
}

export interface ScoreSCCRE {
  motricite: number;
  respiration: number;
  pression: number;
  conscience: number;
  coloration: number;
}

export interface PatientSortie {
  id: string;
  nom: string;
  prenom: string;
  idDossier: string;
  chambre: string;
  intervention: string;
  statut: 'stable' | 'instable' | 'critique';
  scoreSCCRE: number;
  heureValidation: string;
}

export type ServiceDestination = {
  id: string;
  label: string;
};

export interface FiltresPatient {
  statut: string;
  specialite: string;
  recherche?: string;
  sexe?: string;
  heureDebut?: string;
  heureFin?: string;
}

// ── Checklist OMS ─────────────────────────────────────────────────────────────

export type RadioVal = 'oui' | 'non' | 'na' | null;

export interface BoolPair {
  oui: boolean;
  non: boolean;
}

export interface ChecklistPhase1 {
  identite: RadioVal;
  siteConfirme: RadioVal;
  docsDisponibles: RadioVal;
  installation: RadioVal;
  materielChir: BoolPair;
  materielAnes: BoolPair;
  allergie: BoolPair;
  risqueIntubation: BoolPair;
  risqueSaignement: BoolPair;
}

export interface InfoPartage {
  radio: RadioVal;
  notes: string;
}

export interface ChecklistPhase2 {
  v6_identite: BoolPair;
  v6_intervention: BoolPair;
  v6_site: BoolPair;
  v6_installation: BoolPair;
  v6_documents: BoolPair;
  chirurgical: InfoPartage;
  anesth: InfoPartage;
  ideIbode: InfoPartage;
  antibio: RadioVal;
}

export interface ChecklistData {
  phase1: ChecklistPhase1;
  phase2: ChecklistPhase2;
}

export const CHECKLIST_INITIAL: ChecklistData = {
  phase1: {
    identite: null,
    siteConfirme: null,
    docsDisponibles: null,
    installation: null,
    materielChir: { oui: false, non: false },
    materielAnes: { oui: false, non: false },
    allergie: { oui: false, non: false },
    risqueIntubation: { oui: false, non: false },
    risqueSaignement: { oui: false, non: false },
  },
  phase2: {
    v6_identite: { oui: false, non: false },
    v6_intervention: { oui: false, non: false },
    v6_site: { oui: false, non: false },
    v6_installation: { oui: false, non: false },
    v6_documents: { oui: false, non: false },
    chirurgical: { radio: null, notes: '' },
    anesth: { radio: null, notes: '' },
    ideIbode: { radio: null, notes: '' },
    antibio: null,
  },
};
