interface PatientStatsCardsProps {
  stats: {
    total: number;
    tresUrgent: number;
    urgents: number;
    normaux: number;
  };
}

export default function PatientStatsCards({ stats }: PatientStatsCardsProps) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col md:flex-row md:items-center gap-8">
      {/* Icon and Total */}
      <div className="flex items-center gap-6 border-r border-surface-container pr-8">
        <div className="w-16 h-16 bg-surface-container-low rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl">
            groups
          </span>
        </div>
        <div>
          <p className="text-primary text-[10px] font-bold uppercase tracking-widest">
            TOTAL PATIENTS (TRÈS URGENT + URGENT + NORMAL)
          </p>
          <h3 className="text-5xl font-black text-on-surface leading-none">
            {stats.total}
          </h3>
        </div>
      </div>

      {/* Breakdown */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {/* TRÈS URGENT */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
            Très urgent: <span className="font-black">{stats.tresUrgent.toString().padStart(2, '0')}</span>
          </span>
        </div>

        {/* URGENT */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
            Urgent: <span className="font-black">{stats.urgents.toString().padStart(2, '0')}</span>
          </span>
        </div>

        {/* NORMAL */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
            Normal: <span className="font-black">{stats.normaux.toString().padStart(2, '0')}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
