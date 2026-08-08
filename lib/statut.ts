// Code couleur et libellés unifiés pour le statut du parcours patient (PatientStatut côté
// backend, backend_bloc_operatoire/src/entities/patient-bloc.entity.ts).

export const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE_CPA: 'En attente CPA',
  CPA_REALISE: 'CPA réalisée',
  CPA_INAPTE: 'Inapte (CPA)',
  EN_ATTENTE_VERIFICATION_VEILLE: 'En attente VPA',
  VERIFICATION_VEILLE_REALISEE: 'VPA réalisée',
  PRET_POUR_BLOC: 'Prêt pour bloc',
  EN_COURS_OPERATION: 'En cours d\'opération',
  EN_SALLE_REVEIL: 'En salle de réveil',
  SORTI: 'Sorti',
}

export function libelleStatutPatient(statut?: string | null): string {
  if (!statut) return '—'
  return STATUT_LABEL[statut] || statut
}

type StyleStatut = {
  texte: string
  fondClair: string
  badge: string
}

const STYLE_ATTENTE: StyleStatut = { texte: 'text-slate-600', fondClair: 'bg-slate-50', badge: 'bg-slate-100 text-slate-700' }
const STYLE_OK: StyleStatut = { texte: 'text-emerald-700', fondClair: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' }
const STYLE_ALERTE: StyleStatut = { texte: 'text-red-700', fondClair: 'bg-red-50', badge: 'bg-red-100 text-red-700' }
const STYLE_EN_COURS: StyleStatut = { texte: 'text-blue-700', fondClair: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' }
const STYLE_TERMINE: StyleStatut = { texte: 'text-gray-500', fondClair: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600' }

export const STATUT_STYLE: Record<string, StyleStatut> = {
  EN_ATTENTE_CPA: STYLE_ATTENTE,
  CPA_REALISE: STYLE_OK,
  CPA_INAPTE: STYLE_ALERTE,
  EN_ATTENTE_VERIFICATION_VEILLE: STYLE_ATTENTE,
  VERIFICATION_VEILLE_REALISEE: STYLE_OK,
  PRET_POUR_BLOC: STYLE_OK,
  EN_COURS_OPERATION: STYLE_EN_COURS,
  EN_SALLE_REVEIL: STYLE_EN_COURS,
  SORTI: STYLE_TERMINE,
}

export function styleStatutPatient(statut?: string | null): StyleStatut {
  if (!statut) return STYLE_ATTENTE
  return STATUT_STYLE[statut] || STYLE_ATTENTE
}
