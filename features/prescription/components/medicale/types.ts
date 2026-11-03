export interface Medicament {
  id: string;
  nom: string;
  dose: string;
  quantite: number;
  quantiteType?: string;
  voie: string;
  frequenceType: string;
  frequenceValeur: number;
  dureeJours: number;
  dateDebut: string;
  heureDebut: string;
  instructions: string;
  remarques: string;
  prixUnitaire?: number;
  premierSoin?: boolean;
  articleId?: string;
  notifierInfirmier?: boolean;
  serviceNotifId?: string;
}

export interface CocktailComposant {
  id: string;
  nom: string;
  dose: string;
  quantite: number;
  quantiteType?: string;
  articleId?: string;
  prixUnitaire?: number;
  premierSoin?: boolean;
}

export interface CocktailPrescription {
  id: string;
  nom?: string;
  instructionsMelange?: string;
  voie?: string;
  frequenceType?: string;
  frequenceValeur?: number;
  dureeJours?: number;
  dateDebut?: string;
  heureDebut?: string;
  instructions?: string;
  remarques?: string;
  quantiteType?: string;
  articleId?: string;
  prixUnitaire?: number;
  premierSoin?: boolean;
  composants: CocktailComposant[];
  notifierInfirmier?: boolean;
  serviceNotifId?: string;
}

export interface PrescriptionMedicamentEnCours {
  id?: string;
  nom: string;
  dose: string;
  quantite: number;
  quantiteType?: string;
  frequence: string;
  frequenceType?: string;
  frequenceValeur?: number;
  voie?: string;
  dateDebut?: string;
  heureDebut?: string;
  duree?: string;
  dureeJours?: number;
  instructions?: string;
  remarques?: string;
  prixUnitaire?: number;
  premierSoin?: boolean;
  planningActif?: boolean;
  notifierInfirmier?: boolean;
  serviceNotifId?: string;
}

export interface PrescriptionEnCours {
  _type?: string;
  statut?: string;
  id: string;
  medicaments?: PrescriptionMedicamentEnCours[];
  cocktails?: {
    id?: string;
    nom?: string;
    instructionsMelange?: string;
    voie?: string;
    frequenceType?: string;
    frequenceValeur?: number;
    dureeJours?: number;
    dateDebut?: string;
    heureDebut?: string;
    instructions?: string;
    remarques?: string;
    premierSoin?: boolean;
    composants?: CocktailComposant[];
    planningActif?: boolean;
    notifierInfirmier?: boolean;
    serviceNotifId?: string;
  }[];
  items?: { id?: string; typeLabel?: string; type?: string; description?: string; duree?: string; frequence?: string; dateDebut?: string; heureDebut?: string; instructions?: string; notifierInfirmier?: boolean; serviceNotifId?: string; dureeJours?: number; frequenceType?: string; frequenceValeur?: number }[];
  parametres?: { id?: string; parametre?: string; type?: string; frequence?: string; duree?: string; seuilMin?: string; seuilMax?: string; instructions?: string; notifierInfirmier?: boolean; serviceNotifId?: string }[];
  demandes?: { id?: string; typeActe?: string; remarques?: string }[];
  prescripteur?: { nom?: string; prenoms?: string };
  nomMedecinPrescripteur?: string;
  notifierInfirmier?: boolean;
  createdAt: string;
  statutValid?: string;
  ordonnance?: {
    id: string;
    statut: string;
    totalAPayer: number;
    totalPremierSoin: number;
  };
}

export interface StockItem {
  code: string;
  nom: string;
  dose: string;
  conditionnement: string;
  stockDisponible: number;
  forme?: string;
  purchasePrice?: number;
}

import { Patient, Prescripteur } from '../types';

export type { Patient, Prescripteur };

export interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
}

export interface ValidatedPrescription {
  medicaments: Medicament[];
  remarques: string;
  notifier: boolean;
  patient: Patient & { age: number | null; sexeLabel?: string };
  prescripteur: Prescripteur;
  date: string;
  isOrdonnance?: boolean;
}
