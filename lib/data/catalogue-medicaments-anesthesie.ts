import type { MedicamentTableAccent } from '@/components/bloc/medicaments-anesthesie/MedicamentTable'

// Source : fiche papier « USFR Anesthésie Réanimation — CHU Fianarantsoa » (avec annotations
// manuscrites) + mockup HTML « Liste des médicaments nécessaires pour l'Anesthésie et la
// Réanimation », relue et corrigée article par article contre la fiche papier originale. Les
// écarts trouvés lors de cette relecture (articles en réalité distincts, ex. Pancuronium/
// Vécuronium, ou déplacés de section, ex. Poche à urine) ont été corrigés ici — la fiche papier
// fait foi, pas le mockup HTML ni un décompte figé.

export type CategorieMedicament =
  | 'SERUMS'
  | 'PRODUITS_ANESTHESIQUES'
  | 'ANTALGIQUES'
  | 'KIT_ASEPSIE'
  | 'ANTIBIOTIQUES_AUTRES'
  | 'DISPOSITIFS_MEDICAUX'
  | 'CONSOMMABLES'

export type MedicamentItemDef = {
  /** Libellé affiché et clé de rapprochement (Pharmacie, CPA déjà enregistrées). */
  label: string
  /** Valeurs cliquables pour remplir directement le champ Dosage/Quantité sans avoir à les
   * taper — reprises telles quelles de la fiche source (concentration, volume, calibre, forme
   * galénique...), jamais une posologie inventée. Un seul élément quand la fiche n'indique
   * qu'une valeur possible : un clic suffit quand même, pas besoin de taper. */
  variantes?: string[]
}

export type CategorieMedicamentDef = {
  titre: string
  accent: MedicamentTableAccent
  icon: string
  items: MedicamentItemDef[]
}

export const CATALOGUE_MEDICAMENTS: Record<CategorieMedicament, CategorieMedicamentDef> = {
  SERUMS: {
    titre: 'Sérums',
    accent: 'primary',
    icon: 'water_drop',
    items: [
      { label: 'SGH 5%', variantes: ['5% - 500 ml', '5% - 1000 ml', '10% - 500 ml', '10% - 1000 ml'] },
      { label: 'SSI 9‰ (Sérum Salé Isotonique)', variantes: ['9‰', '8‰'] },
      { label: 'RL (Ringer Lactate)' },
      { label: 'Hestar', variantes: ['500 mg'] },
      { label: 'DNS', variantes: ['500 mg'] },
      { label: 'Mannitol 20%', variantes: ['100 ml', '200 ml', '300 ml', '400 ml', '500 ml'] },
      { label: 'Sérum composé', variantes: ['500 ml'] },
    ],
  }, // 7
  PRODUITS_ANESTHESIQUES: {
    titre: 'Produits anesthésiques',
    accent: 'secondary',
    icon: 'vaccines',
    items: [
      { label: 'Nesdonal', variantes: ['1 g'] },
      { label: 'Pancuronium', variantes: ['4 mg'] },
      { label: 'Vécuronium', variantes: ['4 mg'] },
      { label: 'Fentanyl', variantes: ['100 µg', '200 µg', '300 µg', '400 µg', '500 µg'] },
      { label: 'Kétamine', variantes: ['500 mg'] },
      { label: 'Pravive 1%', variantes: ['20 ml'] },
      { label: 'Propofol Lipuro 1%', variantes: ['20 ml'] },
      { label: 'Diazépam injectable', variantes: ['10 mg'] },
      { label: 'Midazolam injectable' },
      { label: 'Atropine', variantes: ['0,50 mg', '0,25 mg'] },
      { label: 'Atarax injectable', variantes: ['100 mg'] },
      { label: 'Bupivacaïne Rachi 0,50%', variantes: ['4 ml'] },
      { label: 'Bupivacaïne ALR 0,50% sans adrénaline', variantes: ['20 ml'] },
      { label: 'Bupivacaïne ALR 0,50% avec adrénaline', variantes: ['20 ml'] },
      {
        label: 'Lidocaïne 1%–2% (avec/sans adrénaline)',
        variantes: ['1% sans Adré', '1% avec Adré', '2% sans Adré', '2% avec Adré'],
      },
      { label: 'Stimuplex', variantes: ['50 mm'] },
      {
        label: "Sévoflurane (remplace l'Halothane)",
        variantes: ['50 ml', '100 ml', '150 ml', '200 ml', '250 ml', '300 ml'],
      },
    ],
  }, // 17
  ANTALGIQUES: {
    titre: 'Antalgiques',
    accent: 'tertiary',
    icon: 'medication',
    items: [
      { label: 'Perfalgan', variantes: ['500 mg', '1000 mg'] },
      { label: 'Doliprane suppositoire', variantes: ['100 mg', '150 mg', '200 mg', '300 mg', '1000 mg'] },
      { label: 'Profénid', variantes: ['100 mg injectable', '100 mg suppositoire'] },
      { label: 'Lamaline suppositoire' },
      { label: 'Nifluril', variantes: ['400 mg injectable', '400 mg suppositoire'] },
      { label: 'Tramadol injectable', variantes: ['100 mg'] },
      { label: 'Acupan injectable', variantes: ['20 mg'] },
    ],
  }, // 7
  KIT_ASEPSIE: {
    titre: 'Kit pour asepsie',
    accent: 'primary-container',
    icon: 'sanitizer',
    items: [
      { label: 'Blouse' },
      { label: 'Calot' },
      { label: 'Champ stérile', variantes: ['PM', 'GM'] },
      { label: 'Set pour voie centrale' },
      { label: 'Set pour voie périphérique' },
      { label: 'Set pour sondage urinaire' },
      { label: 'Paire de gants non stériles' },
      { label: 'Paire de gants stériles' },
      { label: 'Kit bloc' },
    ],
  }, // 9
  ANTIBIOTIQUES_AUTRES: {
    titre: 'Antibiotiques & autres',
    accent: 'error',
    icon: 'biotech',
    items: [
      { label: 'Flagyl perfusion', variantes: ['500 mg'] },
      { label: 'Céfuroxime', variantes: ['1,5 g'] },
      { label: 'Métronidazole' },
      { label: 'Héparine (Lovenox)', variantes: ['0,20', '0,40', '0,60'] },
      { label: 'Méthylprednisolone', variantes: ['40 mg', '80 mg', '120 mg'] },
      { label: 'Loxen injectable', variantes: ['10 mg'] },
      { label: 'Calcium injectable', variantes: ['1 g'] },
      { label: 'Nitriderm', variantes: ['10 mg'] },
    ],
  }, // 8
  DISPOSITIFS_MEDICAUX: {
    titre: 'Dispositifs médicaux',
    accent: 'inverse-primary',
    icon: 'medical_services',
    items: [
      { label: 'Perfuseur' },
      { label: 'Perfuseur pédiatrique' },
      { label: 'Transfuseur' },
      { label: 'Cathéter veineux', variantes: ['24 G', '22 G', '20 G', '18 G', '16 G'] },
      { label: 'Kit pour voie centrale' },
      { label: 'Kit pour APD (péridurale)' },
      { label: 'Aiguille PL', variantes: ['22 G', '23 G', '24 G', '25 G', '26 G', '27 G'] },
      { label: 'Robinet à 3 voies' },
      { label: 'Électrode' },
      {
        label: "Sonde d'intubation",
        variantes: ['CH3', 'CH3,5', 'CH4', 'CH4,5', 'CH5', 'CH5,5', 'CH6', 'CH6,5', 'CH7', 'CH7,5', 'CH8'],
      },
      { label: 'Filtre antibactérien avec connecteur' },
      { label: 'Canule de Guedel', variantes: ['N°0', 'N°1', 'N°2', 'N°3'] },
      { label: "Sonde d'aspiration", variantes: ['CH14', 'CH8', 'CH6'] },
      { label: 'Sonde nasogastrique' },
      { label: 'Drain de Redon', variantes: ['CH12', 'CH14', 'CH16'] },
      { label: 'Sonde vésicale', variantes: ['CH8', 'CH10', 'CH12', 'CH14', 'CH16', 'CH18', 'CH20', 'CH22'] },
    ],
  }, // 16
  CONSOMMABLES: {
    titre: 'Consommables',
    accent: 'secondary',
    icon: 'inventory_2',
    items: [
      { label: 'Poche à urine' },
      { label: 'Coton' },
      { label: 'Alcool' },
      { label: 'Sparadrap standard', variantes: ['70 cm'] },
      { label: 'Dakin Cooper stabilisé', variantes: ['250 cc', '500 cc'] },
      { label: 'Bétadine jaune' },
      { label: 'Bétadine rouge' },
      { label: 'Seringue 50cc', variantes: ['50 cc'] },
      { label: 'Seringue 20cc', variantes: ['20 cc'] },
      { label: 'Seringue 10cc', variantes: ['10 cc'] },
      { label: 'Seringue 5cc', variantes: ['5 cc'] },
      { label: 'Sécurifix PM' },
      { label: 'Sécurifix GM' },
      { label: 'Lunettes nasales' },
      { label: 'Lunettes nasales enfant' },
      { label: 'Kit AG' },
      { label: 'Kit ALR' },
    ],
  }, // 17
}
// Total réel après relecture de la fiche papier : 7+17+7+9+8+16+17 = 81
// (81, pas 77 : Pancuronium/Vécuronium, Diazépam/Midazolam, Provive/Propofol Lipuro et
// Sécurifix PM/GM sont en réalité des articles distincts sur la fiche, pas un choix unique —
// corrigé lors de cette relecture.)

export const TOTAL_MEDICAMENTS = Object.values(CATALOGUE_MEDICAMENTS).reduce(
  (total, categorie) => total + categorie.items.length,
  0,
)
