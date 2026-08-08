export type Cim10Entry = {
  code: string;
  label: string;
};

/**
 * Référentiel CIM-10 (seed) — codes les plus fréquents (général, pédiatrie, néonatalogie).
 *
 * ⚠️ Ce jeu est volontairement réduit. Pour une couverture complète, remplace ce tableau
 * par la liste officielle OMS CIM-10 (import CSV/JSON) ou branche un endpoint backend
 * (ex: GET /cim10?q=...) renvoyant la même forme { code, label }.
 */
export const CIM10_CODES: Cim10Entry[] = [
  // — Infectieux / général —
  { code: 'A09', label: 'Diarrhée et gastro-entérite d\'origine présumée infectieuse' },
  { code: 'A15.0', label: 'Tuberculose pulmonaire' },
  { code: 'A33', label: 'Tétanos néonatal' },
  { code: 'A41.9', label: 'Septicémie, sans précision' },
  { code: 'A90', label: 'Dengue classique' },
  { code: 'B50.9', label: 'Paludisme à Plasmodium falciparum, sans précision' },
  { code: 'B54', label: 'Paludisme, sans précision' },

  // — Respiratoire —
  { code: 'J00', label: 'Rhinopharyngite aiguë (rhume banal)' },
  { code: 'J02.9', label: 'Pharyngite aiguë, sans précision' },
  { code: 'J03.9', label: 'Amygdalite aiguë, sans précision' },
  { code: 'J04.0', label: 'Laryngite aiguë' },
  { code: 'J06.9', label: 'Infection aiguë des voies respiratoires supérieures, sans précision' },
  { code: 'J18.9', label: 'Pneumonie, sans précision' },
  { code: 'J20.9', label: 'Bronchite aiguë, sans précision' },
  { code: 'J21.0', label: 'Bronchiolite aiguë due au virus respiratoire syncytial' },
  { code: 'J21.9', label: 'Bronchiolite aiguë, sans précision' },
  { code: 'J44.9', label: 'Bronchopneumopathie chronique obstructive, sans précision' },
  { code: 'J45.9', label: 'Asthme, sans précision' },

  // — Cardiovasculaire —
  { code: 'I10', label: 'Hypertension essentielle (primitive)' },
  { code: 'I20.9', label: 'Angine de poitrine, sans précision' },
  { code: 'I21.9', label: 'Infarctus aigu du myocarde, sans précision' },
  { code: 'I50.9', label: 'Insuffisance cardiaque, sans précision' },
  { code: 'I63.9', label: 'Infarctus cérébral, sans précision' },
  { code: 'I64', label: 'Accident vasculaire cérébral, non précisé' },

  // — Endocrinien / métabolique / nutrition —
  { code: 'E10.9', label: 'Diabète sucré de type 1, sans complication' },
  { code: 'E11.9', label: 'Diabète sucré de type 2, sans complication' },
  { code: 'E43', label: 'Malnutrition protéino-énergétique grave, sans précision' },
  { code: 'E44.0', label: 'Malnutrition protéino-énergétique modérée' },
  { code: 'E66.9', label: 'Obésité, sans précision' },
  { code: 'E86', label: 'Déshydratation / hypovolémie' },

  // — Digestif —
  { code: 'K21.9', label: 'Reflux gastro-œsophagien sans œsophagite' },
  { code: 'K29.7', label: 'Gastrite, sans précision' },
  { code: 'K35.80', label: 'Appendicite aiguë, sans précision' },
  { code: 'K52.9', label: 'Gastro-entérite et colite non infectieuses, sans précision' },
  { code: 'K59.0', label: 'Constipation' },

  // — Rénal / urinaire —
  { code: 'N17.9', label: 'Insuffisance rénale aiguë, sans précision' },
  { code: 'N18.9', label: 'Maladie rénale chronique, sans précision' },
  { code: 'N39.0', label: 'Infection des voies urinaires, siège non précisé' },

  // — Neurologique —
  { code: 'G03.9', label: 'Méningite, sans précision' },
  { code: 'G40.9', label: 'Épilepsie, sans précision' },
  { code: 'G93.1', label: 'Lésion cérébrale anoxique, non classée ailleurs' },
  { code: 'R56.0', label: 'Convulsions fébriles' },

  // — Hématologie —
  { code: 'D50.9', label: 'Anémie par carence en fer, sans précision' },
  { code: 'D57.1', label: 'Drépanocytose sans crise' },
  { code: 'D64.9', label: 'Anémie, sans précision' },

  // — Symptômes & signes (R) —
  { code: 'R05', label: 'Toux' },
  { code: 'R06.0', label: 'Dyspnée' },
  { code: 'R10.4', label: 'Douleurs abdominales, autres et non précisées' },
  { code: 'R11', label: 'Nausées et vomissements' },
  { code: 'R42', label: 'Étourdissements et vertiges' },
  { code: 'R50.9', label: 'Fièvre, sans précision' },
  { code: 'R51', label: 'Céphalée' },
  { code: 'R55', label: 'Syncope et collapsus' },

  // — Pédiatrie / néonatalogie (P) —
  { code: 'P07.1', label: 'Autre faible poids de naissance' },
  { code: 'P07.3', label: 'Prématurité (autres enfants prématurés)' },
  { code: 'P21.9', label: 'Asphyxie à la naissance, sans précision' },
  { code: 'P22.0', label: 'Syndrome de détresse respiratoire du nouveau-né' },
  { code: 'P36.9', label: 'Septicémie bactérienne du nouveau-né, sans précision' },
  { code: 'P59.9', label: 'Ictère néonatal, sans précision' },
  { code: 'P92.0', label: 'Vomissements du nouveau-né' },

  // — Divers fréquents —
  { code: 'H10.9', label: 'Conjonctivite, sans précision' },
  { code: 'H66.9', label: 'Otite moyenne, sans précision' },
  { code: 'L03.9', label: 'Cellulite (dermohypodermite), sans précision' },
  { code: 'S06.0', label: 'Commotion cérébrale' },
  { code: 'T14.9', label: 'Traumatisme, sans précision' },
  { code: 'F32.9', label: 'Épisode dépressif, sans précision' },
  { code: 'F41.9', label: 'Trouble anxieux, sans précision' },
  { code: 'M54.5', label: 'Lombalgie basse' },
  { code: 'Z00.0', label: 'Examen médical général' },
];
