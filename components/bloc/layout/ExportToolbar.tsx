'use client'

import { useState } from 'react'

type ExportToolbarProps = {
  onImprimer: () => void
  onCSV: () => void | Promise<void>
  onExcel: () => void | Promise<void>
  onPDF: () => void | Promise<void>
  className?: string
}

// Barre d'actions d'export réutilisable (Archives + Rapport) : impression, CSV, Excel, PDF.
// Les handlers sont fournis par la page appelante (chaque page connaît la forme de ses
// propres données) ; ce composant ne gère que l'UI et l'état de chargement pendant la
// génération Excel/PDF (import dynamique des libs).
export default function ExportToolbar({ onImprimer, onCSV, onExcel, onPDF, className = '' }: ExportToolbarProps) {
  const [enCours, setEnCours] = useState<'excel' | 'pdf' | null>(null)

  const lancer = async (type: 'excel' | 'pdf', action: () => void | Promise<void>) => {
    setEnCours(type)
    try {
      await action()
    } catch (err) {
      console.error(err)
      alert("❌ Erreur lors de l'export")
    } finally {
      setEnCours(null)
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 print:hidden ${className}`}>
      <button onClick={onImprimer}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-outline-variant/30 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all shadow-sm">
        <span className="material-symbols-outlined text-base">print</span> Imprimer
      </button>
      <button onClick={onCSV}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm">
        <span className="material-symbols-outlined text-base">csv</span> CSV
      </button>
      <button onClick={() => lancer('excel', onExcel)} disabled={enCours !== null}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-green-200 rounded-lg text-xs font-bold text-green-700 hover:bg-green-50 transition-all shadow-sm disabled:opacity-50">
        <span className="material-symbols-outlined text-base">{enCours === 'excel' ? 'progress_activity' : 'table_view'}</span>
        {enCours === 'excel' ? 'Génération...' : 'Excel'}
      </button>
      <button onClick={() => lancer('pdf', onPDF)} disabled={enCours !== null}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-700 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50">
        <span className="material-symbols-outlined text-base">{enCours === 'pdf' ? 'progress_activity' : 'picture_as_pdf'}</span>
        {enCours === 'pdf' ? 'Génération...' : 'PDF'}
      </button>
    </div>
  )
}
