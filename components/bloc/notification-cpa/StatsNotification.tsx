'use client'
import { Icone } from '@/components/ui/Icone'

interface StatsNotificationProps {
  stats: {
    total: number
    enAttente: number
    prioriteHaute: number
    rdvFixes24h: number
  }
}

export default function StatsNotification({ stats }: StatsNotificationProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2">
        <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          Total
        </span>
        <div className="flex items-end justify-between gap-4">
          <span className="text-3xl font-extrabold text-on-surface font-headline">
            {stats.total}
          </span>
          <Icone nom="notifications" className="text-on-surface-variant" />
        </div>
      </div>

      <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2">
        <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          En attente
        </span>
        <span className="text-3xl font-extrabold text-primary font-headline">
          {stats.enAttente}
        </span>
      </div>

      <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2">
        <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          Priorité Haute
        </span>
        <div className="flex items-end justify-between gap-4">
          <span className="text-3xl font-extrabold text-tertiary font-headline">
            {stats.prioriteHaute}
          </span>
          <Icone nom="priority_high" className="text-tertiary" />
        </div>
      </div>

      <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2">
        <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          RDV Fixés
        </span>
        <div className="flex items-end justify-between gap-4">
          <span className="text-3xl font-extrabold text-secondary font-headline">
            {stats.rdvFixes24h}
          </span>
          <Icone nom="check_circle" className="text-secondary" />
        </div>
      </div>
    </div>
  )
}
