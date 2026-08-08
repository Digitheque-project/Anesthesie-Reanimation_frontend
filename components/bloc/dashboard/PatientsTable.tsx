import { PatientBloc, NiveauUrgence } from "@/types/bloc";
import { libelleUrgence, styleUrgence } from "@/lib/urgence";

interface PatientsTableProps {
  patients: PatientBloc[];
}

export default function PatientsTable({ patients }: PatientsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">person_check</span>
        <h2 className="font-headline font-bold text-xl text-on-surface">
          Vos patients aujourd'hui
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                <th className="px-6 py-4">Priorité</th>
                <th className="px-6 py-4">Patient & ID</th>
                <th className="px-6 py-4">Intervention</th>
                <th className="px-6 py-4">Heure</th>
                <th className="px-6 py-4">Durée prévue</th>
                <th className="px-6 py-4 text-right">Départ Bloc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <PriorityBadge priorite={patient.priorite} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface uppercase">
                        {patient.nom}, {patient.prenom}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        #{patient.patientId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant font-medium">
                    {patient.intervention}
                  </td>
                  <td className={`px-6 py-4 font-bold ${getHeureColor(patient.priorite)}`}>
                    {patient.heure}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {patient.dureePrevue}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-outline">
                      {patient.departBloc}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priorite }: { priorite: NiveauUrgence }) {
  return (
    <span className={`${styleUrgence(priorite).fondPlein} text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase`}>
      {libelleUrgence(priorite)}
    </span>
  );
}

function getHeureColor(priorite: NiveauUrgence) {
  return priorite === 'NORMAL' ? 'text-on-surface' : styleUrgence(priorite).texte;
}
