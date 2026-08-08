// Utilitaires d'export partagés (Archives + Rapport) : CSV, Excel, PDF et impression.
// Tout se fait côté client, sans dépendance backend — cohérent avec le reste de l'app qui
// affiche des données déjà chargées en mémoire.

export type Colonne = { cle: string; titre: string }

function telechargerBlob(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function valeurCellule(ligne: Record<string, any>, cle: string): string {
  const v = ligne[cle]
  if (v == null) return ''
  if (v instanceof Date) return v.toLocaleString('fr-FR')
  return String(v)
}

export function exporterCSV(colonnes: Colonne[], lignes: Record<string, any>[], nomFichier: string) {
  const echapper = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const entetes = colonnes.map(c => echapper(c.titre)).join(';')
  const corps = lignes.map(l => colonnes.map(c => echapper(valeurCellule(l, c.cle))).join(';')).join('\n')
  const contenu = '﻿' + entetes + '\n' + corps // BOM pour qu'Excel détecte l'UTF-8
  telechargerBlob(new Blob([contenu], { type: 'text/csv;charset=utf-8;' }), `${nomFichier}.csv`)
}

export async function exporterExcel(feuilles: { nom: string; colonnes: Colonne[]; lignes: Record<string, any>[] }[], nomFichier: string) {
  const XLSX = await import('xlsx')
  const classeur = XLSX.utils.book_new()
  for (const feuille of feuilles) {
    const donnees = feuille.lignes.map(l => {
      const ligne: Record<string, any> = {}
      feuille.colonnes.forEach(c => { ligne[c.titre] = valeurCellule(l, c.cle) })
      return ligne
    })
    const ws = XLSX.utils.json_to_sheet(donnees, { header: feuille.colonnes.map(c => c.titre) })
    XLSX.utils.book_append_sheet(classeur, ws, feuille.nom.substring(0, 31))
  }
  XLSX.writeFile(classeur, `${nomFichier}.xlsx`)
}

export async function exporterPDF(
  titre: string,
  sousTitre: string,
  sections: { titre: string; colonnes: Colonne[]; lignes: Record<string, any>[] }[],
  nomFichier: string
) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.setTextColor(0, 94, 184) // primary
  doc.text(titre, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(sousTitre, 14, 25)
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 30)

  let y = 38
  for (const section of sections) {
    if (!section.lignes.length) continue
    if (y > 260) { doc.addPage(); y = 18 }
    doc.setFontSize(12)
    doc.setTextColor(0, 94, 184)
    doc.text(section.titre, 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [section.colonnes.map(c => c.titre)],
      body: section.lignes.map(l => section.colonnes.map(c => valeurCellule(l, c.cle))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 94, 184] },
      margin: { left: 14, right: 14 },
    })
    // @ts-ignore — jspdf-autotable étend l'instance avec lastAutoTable au runtime
    y = (doc as any).lastAutoTable.finalY + 12
  }

  doc.save(`${nomFichier}.pdf`)
}

// Impression : bascule une classe sur <body> pour n'imprimer que le conteneur ciblé (voir
// règles @media print dans globals.css), puis restaure l'état normal après le dialogue.
export function imprimerSection() {
  window.print()
}

// Export "fiche" (clé/valeur par section) — pour un document ponctuel type CPA, distinct
// d'exporterPDF ci-dessus qui attend des tableaux de lignes homogènes. Retourne aussi le Blob
// généré (en plus de déclencher le téléchargement) pour permettre un partage direct via l'API
// Web Share, sans avoir à régénérer le PDF une seconde fois.
export async function exporterFichePdf(
  titre: string,
  sousTitre: string,
  sections: { titre: string; champs: { label: string; valeur: string }[] }[],
  nomFichier: string
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.setTextColor(0, 94, 184)
  doc.text(titre, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(sousTitre, 14, 25)
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 30)

  let y = 38
  for (const section of sections) {
    const champsRemplis = section.champs.filter(c => c.valeur && c.valeur.trim() !== '' && c.valeur !== '—')
    if (!champsRemplis.length) continue
    if (y > 260) { doc.addPage(); y = 18 }
    doc.setFontSize(12)
    doc.setTextColor(0, 94, 184)
    doc.text(section.titre, 14, y)
    autoTable(doc, {
      startY: y + 3,
      body: champsRemplis.map(c => [c.label, c.valeur]),
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] }, 1: { cellWidth: 'auto' } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    })
    // @ts-ignore — jspdf-autotable étend l'instance avec lastAutoTable au runtime
    y = (doc as any).lastAutoTable.finalY + 10
  }

  doc.save(`${nomFichier}.pdf`)
  return doc.output('blob') as Blob
}
