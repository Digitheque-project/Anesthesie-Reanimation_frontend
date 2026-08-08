'use client'

import Link from 'next/link'

type Props = {
  patientId: string | null | undefined
  /** "button" (par défaut, en-tête d'écran patient), "icon" (colonne Action d'un tableau) ou
   * "link" (texte souligné compact). */
  variant?: 'button' | 'icon' | 'link'
  className?: string
}

// Bouton "voir dossier patient" réutilisable — pointe vers le dossier intégré (identité,
// statut/CPA à jour, parcours), pour éviter de dupliquer le même router.push/Link dans chaque
// écran (voir consultation-cpa/page.tsx et PatientsListTable.tsx, qui utilisaient déjà cette
// cible avant l'introduction de ce composant).
export default function VoirDossierButton({ patientId, variant = 'button', className = '' }: Props) {
  if (!patientId) return null
  const href = `/bloc/dossier-patient/${patientId}/complet`

  if (variant === 'icon') {
    return (
      <Link
        href={href}
        title="Voir le dossier patient à jour"
        aria-label="Voir le dossier patient à jour"
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors ${className}`}
      >
        <span className="material-symbols-outlined text-lg">folder_shared</span>
      </Link>
    )
  }

  if (variant === 'link') {
    return (
      <Link href={href} className={`inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline ${className}`}>
        <span className="material-symbols-outlined text-sm">folder_shared</span> Voir dossier
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-base">folder_shared</span> Voir dossier patient
    </Link>
  )
}
