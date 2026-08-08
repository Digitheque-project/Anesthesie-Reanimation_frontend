'use client'

interface HeaderNotificationProps {
  onActualiser?: () => void
  onToggleFiltres?: () => void
}

export default function HeaderNotification({ onActualiser, onToggleFiltres }: HeaderNotificationProps) {
  return (
    <div className="bg-surface-bright/80 backdrop-blur-xl rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">
          Notifications des Prescriptions CPA
        </h1>
        <p className="text-on-surface-variant text-sm font-medium mt-1">
          Liste des patients en attente de rendez-vous CPA — prescriptions internes et demandes des services externes
        </p>
      </div>

      <div className="flex flex-col items-end gap-4 mt-4 md:mt-0">
        <div className="flex items-center gap-4">
          <button onClick={onToggleFiltres}
            className="bg-surface-container-high text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-dim transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined">filter_list</span>
            Filtrer
          </button>
          <button onClick={onActualiser}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-container transition-colors">
            <span className="material-symbols-outlined">sync</span>
            Actualiser
          </button>
        </div>
      </div>
    </div>
  )
}
