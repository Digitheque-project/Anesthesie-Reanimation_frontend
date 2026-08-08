/** Réponses possibles aux questions de la checklist de sortie du bloc. */
export type ChecklistSortieReponse = "oui" | "non" | "na";

/** Les quatre questions obligatoires (valeur `null` tant que non répondu). */
export interface ChecklistSortieQuestions {
  intervention: ChecklistSortieReponse | null;
  compteFinal: ChecklistSortieReponse | null;
  etiquetage: ChecklistSortieReponse | null;
  signalement: ChecklistSortieReponse | null;
}

/** Données persistées pour la checklist après intervention / sortie du bloc. */
export interface ChecklistSortie {
  patientId: string;
  checklist: ChecklistSortieQuestions;
  observations: string;
  /** Horodatage ISO de la validation définitive (signature simulée). */
  dateValidation?: string;
  /** Libellé ou référence de signature électronique simulée. */
  signature?: string;
  /** Indique si la checklist a été validée une première fois (verrouillage). */
  validated?: boolean;
  /** Dernière mise à jour du brouillon ou du dossier. */
  updatedAt?: string;
  /** Heure affichée / saisie pour la sortie du bloc (mock ou future donnée métier). */
  heureSortieBloc?: string;
}
