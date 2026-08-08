export default function PatientContextBar() {
  return (
    <div className="bg-surface-container-high px-8 py-3 flex items-center border-b border-surface-dim justify-between">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Patient</div>
          <div className="text-sm font-bold text-primary">DUPONT Jean-Marc</div>
        </div>
        <div className="w-px h-6 bg-surface-dim" />
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Âge</div>
          <div className="text-sm font-bold text-primary">58 ans</div>
        </div>
        <div className="w-px h-6 bg-surface-dim" />
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">ID Dossier</div>
          <div className="text-sm font-bold text-primary">#SS-98234-2024</div>
        </div>
        <div className="w-px h-6 bg-surface-dim" />
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Intervention</div>
          <div className="text-sm font-bold text-primary">Cholecystectomie</div>
        </div>
        <div className="w-px h-6 bg-surface-dim" />
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Médecin Responsable</div>
          <div className="text-sm font-bold text-primary">Dr. Martin (Anesthésiste)</div>
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex flex-col items-end gap-2">
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Heure d'arrivée</div>
          <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-white/40">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <input type="time" defaultValue="14:25" className="bg-transparent border-none text-sm font-medium focus:ring-0 outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
