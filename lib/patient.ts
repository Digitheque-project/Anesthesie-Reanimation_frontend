// Formatage du nom patient — jamais d'ID affiché à la place (interdit) : si l'identité n'a pas
// pu être récupérée depuis le service Accueil, on affiche "Patient inconnu". Certains patients
// n'ont pas de prénom enregistré (valeur null côté Accueil) — on ne l'affiche que s'il existe.
export function formaterNomPatient(patient?: { nom?: string | null; prenom?: string | null } | null): string {
  const nom = patient?.nom?.trim()
  if (!nom) return 'Patient inconnu'
  const prenom = patient?.prenom?.trim()
  return prenom ? `${nom} ${prenom}` : nom
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// N° de dossier à afficher — jamais l'id technique du patient (interdit), même en repli. Certains
// enregistrements (identité non résolue côté Accueil, admission ancienne...) se retrouvent avec
// `idDossier` égal à l'id patient brut plutôt qu'un vrai numéro de dossier ; on le détecte et on
// n'affiche rien plutôt que de divulguer un identifiant interne.
export function formaterIdDossier(idDossier?: string | null): string | null {
  const valeur = idDossier?.trim()
  if (!valeur || UUID_RE.test(valeur)) return null
  return valeur
}
