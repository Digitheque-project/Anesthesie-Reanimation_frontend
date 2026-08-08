import type { ArticlePharmacie } from '@/lib/api/pharmacie.service'

// Nom de base d'un article du catalogue interne (avant la première parenthèse/deux-points qui
// introduit les variantes de dosage) — c'est cette partie qu'on rapproche du `dci` Pharmacie.
const nomBase = (label: string) => label.split(/[(:]/)[0]

const DIACRITIQUES = /[̀-ͯ]/g

const normaliser = (texte: string) =>
  texte.normalize('NFD').replace(DIACRITIQUES, '').toLowerCase().trim()

// Le catalogue interne mélange noms de marque (Perfalgan, Doliprane, Flagyl...) et
// abréviations (SSI, SGH...) qui n'ont aucune chance de matcher tel quel le nom en DCI utilisé
// par la Pharmacie. Table restreinte aux correspondances non ambiguës et bien établies — pas de
// devinette pharmacologique risquée sur les entrées moins certaines (Hestar, Nesdonal...), qui
// resteront simplement "non disponible" tant qu'aucune correspondance directe n'existe.
const SYNONYMES: { motCle: string; dci: string[] }[] = [
  { motCle: 'perfalgan', dci: ['paracetamol'] },
  { motCle: 'doliprane', dci: ['paracetamol'] },
  { motCle: 'flagyl', dci: ['metronidazole'] },
  { motCle: 'betadine', dci: ['povidone iodee', 'povidone'] },
  { motCle: 'ssi', dci: ['serum sale isotonique', 'serum physiologique', 'chlorure de sodium'] },
]

function nomsARapprocher(label: string): string[] {
  const cible = normaliser(nomBase(label))
  const synonyme = SYNONYMES.find((s) => cible.includes(s.motCle))
  return synonyme ? [cible, ...synonyme.dci] : [cible]
}

// Rapprochement par nom, tolérant : le nom de base du médicament interne (ou l'un de ses
// synonymes connus) doit contenir le dci Pharmacie ou en être contenu (ex. "Perfalgan" →
// "paracetamol" ⊂ "paracetamol 500mg"). Pas de correspondance exacte exigée — les catalogues ne
// sont pas garantis alignés mot pour mot.
export function trouverArticlePharmacie(label: string, catalogue: ArticlePharmacie[]): ArticlePharmacie | null {
  const cibles = nomsARapprocher(label).filter(Boolean)
  if (!cibles.length) return null
  return (
    catalogue.find((a) => {
      const dci = normaliser(a.dci)
      if (dci.length <= 2) return false
      return cibles.some((cible) => cible.includes(dci) || dci.includes(cible))
    }) || null
  )
}
