// Types de conditionnement/forme acceptés par le backend (enum QuantiteType).
// Le backend rejette toute valeur qui n'est pas exactement l'une de ces clés.
export const QUANTITE_TYPES = [
  'UNITE', 'BOITE', 'GELULE', 'CACHET', 'COMPRIME', 'ML', 'L', 'G', 'MG', 'UG',
  'GOUTTE', 'FLACON', 'SACHET', 'POCHE', 'AMPOULE', 'SERINGUE', 'PATCH',
  'SUPPOSITOIRE', 'OVULE', 'POMMADE_TUBE', 'CREME_POT', 'SPRAY', 'INHALATEUR',
] as const;

export type QuantiteType = (typeof QUANTITE_TYPES)[number];

// Libellés affichés à l'utilisateur (fr) pour chaque valeur enum.
export const QUANTITE_TYPE_LABELS: Record<QuantiteType, string> = {
  UNITE: 'Unité',
  BOITE: 'Boîte',
  GELULE: 'Gélule',
  CACHET: 'Cachet',
  COMPRIME: 'Comprimé',
  ML: 'ml',
  L: 'L',
  G: 'g',
  MG: 'mg',
  UG: 'µg',
  GOUTTE: 'Goutte',
  FLACON: 'Flacon',
  SACHET: 'Sachet',
  POCHE: 'Poche',
  AMPOULE: 'Ampoule',
  SERINGUE: 'Seringue',
  PATCH: 'Patch',
  SUPPOSITOIRE: 'Suppositoire',
  OVULE: 'Ovule',
  POMMADE_TUBE: 'Pommade (tube)',
  CREME_POT: 'Crème (pot)',
  SPRAY: 'Spray',
  INHALATEUR: 'Inhalateur',
};

// Options prêtes à l'emploi pour un <select> ou une liste de suggestions.
export const QUANTITE_TYPE_OPTIONS: { value: QuantiteType; label: string }[] =
  QUANTITE_TYPES.map((value) => ({ value, label: QUANTITE_TYPE_LABELS[value] }));

// Normalise une chaîne pour la comparaison : sans accents, sans µ, en
// majuscules et sans caractères non alphanumériques.
function canon(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00b5\u03bc]/g, 'U') // µ (micro sign) / μ (mu grec) -> U (pour UG)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// Table de correspondance : valeur canonique -> valeur enum.
const LOOKUP: Record<string, QuantiteType> = (() => {
  const map: Record<string, QuantiteType> = {};
  for (const value of QUANTITE_TYPES) {
    map[canon(value)] = value; // la clé enum elle-même
    map[canon(QUANTITE_TYPE_LABELS[value])] = value; // le libellé français
  }
  // Alias / synonymes fréquents saisis à la main.
  const aliases: Record<string, QuantiteType> = {
    U: 'UNITE',
    UNITES: 'UNITE',
    BTE: 'BOITE',
    BOITES: 'BOITE',
    GEL: 'GELULE',
    CP: 'COMPRIME',
    CPR: 'COMPRIME',
    COMP: 'COMPRIME',
    COMPRIMES: 'COMPRIME',
    MILLILITRE: 'ML',
    MILLILITRES: 'ML',
    CC: 'ML',
    LITRE: 'L',
    LITRES: 'L',
    GRAMME: 'G',
    GRAMMES: 'G',
    MILLIGRAMME: 'MG',
    MILLIGRAMMES: 'MG',
    MICROGRAMME: 'UG',
    MICROGRAMMES: 'UG',
    MCG: 'UG',
    GTT: 'GOUTTE',
    GOUTTES: 'GOUTTE',
    POMMADE: 'POMMADE_TUBE',
    POMMADETUBE: 'POMMADE_TUBE',
    CREME: 'CREME_POT',
    CREMEPOT: 'CREME_POT',
  };
  for (const key in aliases) {
    map[canon(key)] = aliases[key];
  }
  return map;
})();

// Convertit n'importe quelle saisie (libellé fr, alias, casse/accents variés)
// vers une valeur enum valide. Retourne `fallback` si rien ne correspond.
export function normalizeQuantiteType(
  input?: string | null,
  fallback: QuantiteType = 'UNITE',
): QuantiteType {
  if (!input) return fallback;
  return LOOKUP[canon(input)] ?? fallback;
}

// Libellé affichable pour une valeur enum (ou une saisie libre).
export function quantiteTypeLabel(value?: string | null): string {
  if (!value) return '';
  const key = LOOKUP[canon(value)];
  return key ? QUANTITE_TYPE_LABELS[key] : value;
}
