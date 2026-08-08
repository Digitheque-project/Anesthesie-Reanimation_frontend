import { PrescriptionEnCours } from './types';

export function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

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

export function filterExpired(prescriptions: PrescriptionEnCours[]): PrescriptionEnCours[] {
  const now = Date.now();
  return prescriptions.filter(p => {
    if (p.statut !== 'ACTIVE') return false;
    return p.medicaments?.some(med => {
      if (!med.dateDebut || !med.duree) return true;
      const start = new Date(med.dateDebut).getTime();
      return (start + parseDureeMs(med.duree)) > now;
    });
  });
}

export function getFrequenceText(type: string, valeur: number): string {
  switch (type) {
    case 'HEURES': return `Toutes les ${valeur}h`;
    case 'PAR_JOUR': return `${valeur}× par jour`;
    case 'SOS': return 'Si besoin (SOS)';
    case 'CONTINU': return 'En continu (perfusion)';
    default: return type;
  }
}

export function formatAriary(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' Ar';
}
