'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
  /** Par défaut : historique du navigateur (router.back()). Passer une fonction pour une
   * destination fixe (ex. retour vers une liste précise plutôt que l'historique). */
  onClick?: () => void;
  label?: string;
  className?: string;
}

// Bouton retour unique, réutilisé sur tout l'écran plutôt que réimplémenté page par page —
// jusqu'ici chaque page avait sa propre taille/forme (lien texte, pastille, bouton bordé...).
export default function BackButton({ onClick, label = 'Retour', className = '' }: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => router.back())}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border border-outline-variant/30 bg-white px-4 py-2 text-sm font-bold text-on-surface-variant shadow-sm transition-all hover:bg-surface-container hover:text-primary ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      {label}
    </button>
  );
}
