export function parseDureeMs(d: string): number {
  const parts = d.split(' ');
  if (parts.length !== 2) return 0;
  const val = Number(parts[0]);
  const unit = parts[1];
  if (isNaN(val)) return 0;
  switch (unit) {
    case 'heures': return val * 3600_000;
    case 'jours':  return val * 86400_000;
    case 'mois':   return val * 30 * 86400_000;
    default: return 0;
  }
}

export function filterExpired<T extends { statut?: string }>(
  prescriptions: T[],
  itemsField: keyof T & string,
): T[] {
  const now = Date.now();
  return prescriptions.filter(p => {
    if (p.statut !== 'ACTIVE') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (p as any)[itemsField];
    if (!Array.isArray(items)) return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.some((item: any) => {
      if (item.planningActif === false) return false;
      if (item.frequenceType === 'SOS' || item.frequenceType === 'CONTINU') return true;
      if (!item.dateDebut || !item.duree) return true;
      const start = new Date(item.dateDebut).getTime();
      return (start + parseDureeMs(item.duree)) > now;
    });
  });
}
