// Formatage du nom patient — jamais d'ID affiché à la place (interdit) : si l'identité n'a pas
// pu être récupérée depuis le service Accueil, on affiche "Patient inconnu". Certains patients
// n'ont pas de prénom enregistré (valeur null côté Accueil) — on ne l'affiche que s'il existe.
export function formaterNomPatient(patient?: { nom?: string | null; prenom?: string | null } | null): string {
  const nom = patient?.nom?.trim()
  if (!nom) return 'Patient inconnu'
  const prenom = patient?.prenom?.trim()
  return prenom ? `${nom} ${prenom}` : nom
}
