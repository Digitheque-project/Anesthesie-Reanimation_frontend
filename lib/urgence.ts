// Code couleur et libellés unifiés pour le niveau d'urgence patient (NiveauUrgence côté
// backend : le terme STAT n'est plus utilisé, ni en base ni à l'affichage — remplacé par
// TRES_URGENT partout (valeur enum renommée en base, vocabulaire aligné sur les services
// prescripteurs externes qui envoient déjà "TRES_URGENT").
//   TRÈS URGENT → rouge · URGENT → orange · NORMAL → bleu

export const URGENCE_LABEL: Record<string, string> = {
  TRES_URGENT: 'TRÈS URGENT',
  STAT: 'TRÈS URGENT', // compatibilité ascendante (anciennes données/sources)
  URGENT: 'URGENT',
  NORMAL: 'NORMAL',
}

export function libelleUrgence(niveau?: string | null): string {
  if (!niveau) return URGENCE_LABEL.NORMAL
  return URGENCE_LABEL[niveau] || niveau.toUpperCase()
}

type StyleUrgence = {
  texte: string
  fondClair: string
  fondPlein: string
  point: string
  badge: string
  bordure: string
}

const STYLE_TRES_URGENT: StyleUrgence = {
  texte: 'text-red-700',
  fondClair: 'bg-red-50',
  fondPlein: 'bg-red-600',
  point: 'bg-red-600',
  badge: 'bg-red-100 text-red-700',
  bordure: 'border-red-300',
}

export const URGENCE_STYLE: Record<string, StyleUrgence> = {
  TRES_URGENT: STYLE_TRES_URGENT,
  STAT: STYLE_TRES_URGENT, // compatibilité ascendante (anciennes données/sources)
  URGENT: {
    texte: 'text-orange-700',
    fondClair: 'bg-orange-50',
    fondPlein: 'bg-orange-500',
    point: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    bordure: 'border-orange-300',
  },
  NORMAL: {
    texte: 'text-blue-700',
    fondClair: 'bg-blue-50',
    fondPlein: 'bg-blue-600',
    point: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    bordure: 'border-blue-300',
  },
}

export function styleUrgence(niveau?: string | null): StyleUrgence {
  if (!niveau) return URGENCE_STYLE.NORMAL
  return URGENCE_STYLE[niveau] || URGENCE_STYLE.NORMAL
}

// Échelle numérique des services demandeurs (1 = faible ... 5 = immédiat), identique à celle du
// backend (backend_bloc_operatoire/src/common/urgence.ts) :
//   1-2 → NORMAL   3-4 → URGENT   5 → TRES_URGENT
// Elle existait ici en deux versions divergentes (">= 3 → TRES_URGENT" pour la couleur du badge,
// ">= 4" pour `estUrgent`), toutes deux différentes de celle du backend : une demande transmise
// en urgence 3 s'affichait "TRÈS URGENT" en rouge alors qu'elle n'était marquée urgente ni dans
// la cloche, ni sur le créneau, ni dans la fiche patient.
export function niveauDepuisEchelle(urgence?: number | null): 'TRES_URGENT' | 'URGENT' | 'NORMAL' {
  const valeur = Number(urgence)
  if (!Number.isFinite(valeur)) return 'NORMAL'
  if (valeur >= 5) return 'TRES_URGENT'
  if (valeur >= 3) return 'URGENT'
  return 'NORMAL'
}

// Un niveau "urgent" au sens des badges, sons et créneaux d'urgence : tout sauf NORMAL.
export function estEchelleUrgente(urgence?: number | null): boolean {
  return niveauDepuisEchelle(urgence) !== 'NORMAL'
}

// Détermine le niveau d'urgence (TRES_URGENT/URGENT/NORMAL) d'une notification/prescription. Le
// champ `niveauUrgence`, stocké directement sur la notification, est prioritaire — sans lui,
// TRES_URGENT ne pouvait pas se distinguer d'URGENT une fois réduit au booléen `estUrgent` (voir
// Bug 5). Repli sur l'échelle numérique `urgence` puis sur `estUrgent`, pour les notifications
// créées avant l'ajout de ce champ.
export function niveauUrgenceNotification(n: any): 'TRES_URGENT' | 'URGENT' | 'NORMAL' {
  if (n?.niveauUrgence === 'TRES_URGENT' || n?.niveauUrgence === 'URGENT' || n?.niveauUrgence === 'NORMAL') {
    return n.niveauUrgence
  }
  const urgence = n?.urgence
  if (typeof urgence === 'number') return niveauDepuisEchelle(urgence)
  if (n?.estUrgent) return 'URGENT'
  return 'NORMAL'
}
