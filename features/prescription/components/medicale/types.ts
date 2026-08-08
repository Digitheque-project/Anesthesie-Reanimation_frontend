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
}

export interface PrescriptionEnCours {
  statut?: string;
  id: string;
  medicaments: { nom: string; dose: string; quantite: number; frequence: string; voie?: string; dateDebut?: string; duree?: string }[];
  prescripteur?: { nom: string };
  notifierInfirmier?: boolean;
  createdAt: string;
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

export interface Patient {
  id: string;
  nom?: string;
  prenom?: string;
  sexe?: string;
  dateNaissance?: string;
  allergies?: string[];
  groupeSanguin?: string;
}

export interface Prescripteur {
  id?: string;
  nom?: string;
  prenom?: string;
  service?: string;
}

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
