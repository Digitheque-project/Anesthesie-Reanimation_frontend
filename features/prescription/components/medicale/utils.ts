
export function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function getFrequenceText(type: string, valeur: number): string {
  switch (type) {
    case 'HEURES': return `Toutes les ${valeur}h`;
    case 'MINUTES': return `Toutes les ${valeur} minutes`;
    case 'PAR_JOUR': return `${valeur}× par jour`;
    case 'SOS': return 'Si besoin';
    case 'CONTINU': return 'En continu (perfusion)';
    default: return type;
  }
}

/**
 * Durée affichée d'un élément (médicament, cocktail, soin...).
 * - "X jour(s)" si une durée en jours est fournie
 * - "X jours" si une durée libre ("7 jours") est fournie
 * - "Jusqu'à nouvelle ordre" si une fréquence à valeur (heures/minutes/fois par
 *   jour) est prescrite sans durée (durée illimitée par design)
 * - "" sinon (SOS / En continu / sans fréquence)
 */
export function getDureeText(item: any): string {
  if (item.dureeJours) {
    return `${item.dureeJours} jour${item.dureeJours > 1 ? 's' : ''}`;
  }
  if (item.duree) return item.duree;
  if (item.frequenceType && ['HEURES', 'MINUTES', 'PAR_JOUR'].includes(item.frequenceType)) {
    return "Jusqu'à nouvelle ordre";
  }
  return '';
}

export function formatAriary(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' Ar';
}

export function nowDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nowHeureStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
