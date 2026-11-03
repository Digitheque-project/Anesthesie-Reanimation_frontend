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
  chuId?: string;
  serviceId?: string;
}

export interface FormProps {
  patient: Patient;
  prescripteur: Prescripteur;
}

export type Urgence = "NORMAL" | "URGENT" | "TRES_URGENT";

export const urgenceClasses: Record<Urgence, string> = {
  NORMAL: "un",
  URGENT: "uu",
  TRES_URGENT: "utu",
};
