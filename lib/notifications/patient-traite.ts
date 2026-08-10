// Un patient dont la CPA a déjà été traitée — validée (CPA_REALISE), inapte, ou plus avancé dans
// le parcours (vérification veille, prêt pour bloc, opération, réveil, sortie) — ne doit plus
// apparaître dans les listes "à traiter" (fil Prescription, tableau de bord...), même comportement
// que la cloche qui retire les notifications lues. Les notifications sans PatientBloc (demandes
// externes) ne sont pas concernées : `patient.statut` y est absent et elles restent actionnables.
export const STATUTS_PATIENT_TRAITES = new Set([
  'CPA_REALISE',
  'CPA_INAPTE',
  'EN_ATTENTE_VERIFICATION_VEILLE',
  'VERIFICATION_VEILLE_REALISEE',
  'PRET_POUR_BLOC',
  'EN_COURS_OPERATION',
  'EN_SALLE_REVEIL',
  'SORTI',
])

export function estPatientTraite(n: { patient?: { statut?: string } }): boolean {
  const statutPatient = n.patient?.statut
  if (!statutPatient) return false
  return STATUTS_PATIENT_TRAITES.has(statutPatient)
}
