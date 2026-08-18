interface ErreurChargementBannerProps {
  visible: boolean
  onRecharger: () => void
  message?: string
}

// Le chargement de la fiche patient échouait jusqu'ici en silence (catch(console.error) sans
// retour visible) — l'écran s'affichait avec un patient vide, sans que personne ne sache si
// c'est parce que la fiche est réellement introuvable ou juste un problème réseau passager.
export default function ErreurChargementBanner({
  visible,
  onRecharger,
  message = 'Impossible de charger les informations du patient — vérifiez votre connexion.',
}: ErreurChargementBannerProps) {
  if (!visible) return null
  return (
    <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800 flex flex-wrap items-center gap-3">
      <span className="material-symbols-outlined text-lg text-red-600">error</span>
      <span className="flex-1 min-w-[220px] font-semibold">{message}</span>
      <button
        type="button"
        onClick={onRecharger}
        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
