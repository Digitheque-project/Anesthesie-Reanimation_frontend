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

// Détermine le niveau d'urgence (TRES_URGENT/URGENT/NORMAL) d'une notification/prescription à
// partir du champ numérique `urgence` (1 = faible, 2 = moyen, 3+ = élevé) ou, à défaut, du
// booléen `estUrgent` transmis par les notifications internes CPA.
export function niveauUrgenceNotification(n: any): 'TRES_URGENT' | 'URGENT' | 'NORMAL' {
  const urgence = n?.urgence
  if (typeof urgence === 'number') {
    if (urgence >= 3) return 'TRES_URGENT'
    if (urgence === 2) return 'URGENT'
    return 'NORMAL'
  }
  if (n?.estUrgent) return 'URGENT'
  return 'NORMAL'
}
