export interface RespiratoireData {
  etatInitial: { intubation: boolean; curarisation: boolean };
  reponse: { intubation: boolean; curarisation: boolean };
}

export interface DouleurData {
  evs: number | null;
  eqa: number | null;
  eva: number;
}

export interface ScoreSCCREData {
  motricite: number;
  respiration: number;
  pression: number;
  conscience: number;
  coloration: number;
}

export interface SalleReveilData {
  heureArrivee: string;
  respiratoire: RespiratoireData;
  douleur: DouleurData;
  scoreSCCRE: ScoreSCCREData;
  retourService: boolean;
  dateValidation?: string;
  signature?: string;
}
