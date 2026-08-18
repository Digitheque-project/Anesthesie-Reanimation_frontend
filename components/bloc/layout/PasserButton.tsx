'use client';

interface PasserButtonProps {
  onClick: () => void;
  /** Aucun brouillon à recharger pour ce patient sur cet écran — le bouton reste affiché (toujours
   * visible, symétrique de BackButton) mais grisé et inactif plutôt que masqué. */
  disabled?: boolean;
  label?: string;
  className?: string;
}

// Symétrique de BackButton (même taille/forme, toujours affiché en haut à droite) — actif dès
// qu'un brouillon existe pour ce patient sur cet écran (voir useDraftAutosave), pour reprendre une
// saisie laissée en plan après un clic sur "Retour" sans avoir validé ; grisé sinon, jamais masqué.
// Teinte ambre à l'état actif : même convention que la bannière "saisie non enregistrée" déjà
// utilisée sur CPA/vérification veille.
export default function PasserButton({ onClick, disabled = false, label = 'Passer', className = '' }: PasserButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Aucune saisie en attente à reprendre pour ce patient' : 'Reprendre la saisie déjà commencée pour ce patient'}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition-all ${
        disabled
          ? 'border-outline-variant/30 bg-white text-on-surface-variant/50 cursor-not-allowed shadow-none'
          : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
      } ${className}`}
    >
      {label}
      <span className="material-symbols-outlined text-[20px]">history</span>
    </button>
  );
}
