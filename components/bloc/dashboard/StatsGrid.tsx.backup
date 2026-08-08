'use client'

interface StatsGridProps {
  stats: {
    totalPatients: number
    totalOperations: number
    totalUrgences: number
    totalMedecins: number
  }
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Patients</p>
        <p className="text-2xl font-extrabold text-primary">{stats.totalPatients}</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Opérations</p>
        <p className="text-2xl font-extrabold text-secondary">{stats.totalOperations}</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Urgences</p>
        <p className="text-2xl font-extrabold text-tertiary">{stats.totalUrgences}</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/30">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Médecins</p>
        <p className="text-2xl font-extrabold text-on-surface">{stats.totalMedecins}</p>
      </div>
    </div>
  )
}
