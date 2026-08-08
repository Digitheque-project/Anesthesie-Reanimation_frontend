'use client'

// Bannière non destructive signalant qu'un autre poste a mis à jour ce document pendant que
// l'utilisateur le remplit — jamais d'écrasement silencieux du formulaire en cours de saisie,
// juste une invitation à recharger si besoin.
export default function RealtimeUpdateBanner({ visible, onRecharger }: { visible: boolean; onRecharger: () => void }) {
  if (!visible) return null
  return (
    <div className="mb-4 p-3 bg-tertiary/10 border border-tertiary/30 rounded-xl flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 font-semibold text-tertiary">
        <span className="material-symbols-outlined text-lg">sync</span>
        Ce document a été mis à jour depuis un autre poste.
      </span>
      <button type="button" onClick={onRecharger} className="px-3 py-1.5 bg-tertiary text-on-tertiary text-xs font-bold rounded-lg">
        Recharger
      </button>
    </div>
  )
}
