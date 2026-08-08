export type ObservationStatus = 'DRAFT' | 'FINALIZED';

// Champs confirmes via le swagger du backend dossier-patient
// (https://dossier-patient-back-production.up.railway.app/dossier-patient/docs-json).
export interface Observation {
  id: string;
  patientId: string;
  chuId: string;
  serviceId: string;
  observationType: 'GENERAL' | 'PEDIATRIQUE' | 'NEONATAL' | string;
  symptoms?: string;
  medicalHistory?: string;
  physicalExamination?: string;
  clinicalImpressions?: string;
  currentTreatments?: string;
  complementaryExams?: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  isDraft: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// POST /observations — seul appel reseau de tout le cycle de saisie :
// l'observation est enregistree une fois, definitivement (isDraft: false).
// Tant qu'elle n'est pas envoyee, elle ne vit qu'en local (anti-coupure).
export interface CreateObservationDto {
  chuId: string;
  serviceId: string;
  patientId: string;
  observationType: 'GENERAL';
  createdBy?: string;
  symptoms: string;
  medicalHistory: string;
  physicalExamination: string;
  clinicalImpressions: string;
  currentTreatments: string;
  complementaryExams: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  isDraft: false;
}

export function getObservationStatus(obs: Pick<Observation, 'isDraft'>): ObservationStatus {
  return obs.isDraft ? 'DRAFT' : 'FINALIZED';
}
