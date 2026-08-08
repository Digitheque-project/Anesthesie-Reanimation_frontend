// Distingue les patients du Programme opératoire (chirurgie classique, ex: Pédiatrie, Unité
// Chirurgicale) de ceux du Programme non-opératoire (venus par une demande de CPA externe d'un
// service qui n'opère pas au Bloc — Imagerie/scanner, Endoscopie, Urgence — et pour qui
// l'anesthésiste du Bloc se déplace, avec les mêmes checklists, sans jamais passer par le
// programme opératoire du Bloc lui-même). Correspondance par mot-clé (insensible à la
// casse/accents) sur `serviceOrigine`, comme pour les rôles cliniques (voir role-clinique.ts) :
// on ne maîtrise pas l'orthographe exacte du nom de service tel qu'enregistré côté SSO central.
const DIACRITIQUES = new RegExp('[\\u0300-\\u036f]', 'g')

const MOTS_CLES_NON_OPERATOIRE = ['imagerie', 'scanner', 'endoscopie', 'urgence']

export function estServiceNonOperatoire(serviceOrigine?: string | null): boolean {
  if (!serviceOrigine) return false
  const normalise = serviceOrigine
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
  return MOTS_CLES_NON_OPERATOIRE.some((mot) => normalise.includes(mot))
}
