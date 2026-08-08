import { PatientSortie } from "@/types/bloc";

export default function HeaderPatient({ patient }: { patient: PatientSortie }) {
  const statusColor = {
    stable: "text-secondary bg-secondary/10",
    instable: "text-tertiary bg-tertiary/10",
    critique: "text-error bg-error/10",
  };

  return (
    <div className="bg-white p-6 flex items-center justify-between shadow-sm border-l-4 border-l-primary rounded-xl">
      <div className="flex items-center gap-16">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Patient</p>
          <p className="font-bold text-xl text-on-surface">
            {patient.nom}, {patient.prenom}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">ID Dossier</p>
          <p className="font-semibold text-lg text-on-surface">{patient.idDossier}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Chambre</p>
          <p className="font-semibold text-lg text-on-surface">{patient.chambre}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <span className={`px-4 py-1.5 ${statusColor[patient.statut]} text-xs font-bold flex items-center gap-2 uppercase tracking-wide rounded-sm`}>
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          {patient.statut}
        </span>
      </div>
    </div>
  );
}
