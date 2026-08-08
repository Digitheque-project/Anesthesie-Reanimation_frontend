import { PanierItem } from '@/features/prescription/contexts/PrescriptionPanierContext';

export function formatPayloadSummary(item: PanierItem): string {
  const p = item.payload;
  if (!p) return item.summary;
  switch (item.type) {
    case 'medicale':
      if (p.medicaments?.length) {
        return p.medicaments.map((m: any) => `${m.nom} ${m.dose} — ${m.quantite} ${m.quantiteType || ''}`).join('\n');
      }
      return item.summary;
    case 'non-medicale':
      if (p.items?.length) {
        return p.items.map((it: any) => `${it.typeLabel}: ${it.description}`).join('\n');
      }
      return item.summary;
    case 'surveillance':
      if (p.parametres?.length) {
        return p.parametres.map((par: any) => `${par.parametre} — ${par.frequenceType} ${par.frequenceValeur || ''}`).join('\n');
      }
      return item.summary;
    case 'transfusion':
      if (p.produits?.length) {
        return p.produits.map((pr: any) => `${pr.produit} — ${pr.quantite}`).join('\n');
      }
      return item.summary;
    default:
      return item.summary;
  }
}
