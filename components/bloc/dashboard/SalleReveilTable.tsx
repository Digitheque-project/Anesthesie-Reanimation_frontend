import { PatientReveil } from "@/types/bloc";

interface SalleReveilTableProps {
  patients: PatientReveil[];
}

export default function SalleReveilTable({ patients }: SalleReveilTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">bed</span>
        <h2 className="font-headline font-bold text-xl text-on-surface">
          Salle de Réveil
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                <th className="px-6 py-4">Patient & ID</th>
                <th className="px-6 py-4">Intervention terminée</th>
                <th className="px-6 py-4">Salle / Lit</th>
                <th className="px-6 py-4">Durée prévue séjour</th>
                <th className="px-6 py-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-surface-container-lowest transition-colors">
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
                  <td className="px-6 py-4 text-on-surface font-bold">
                    {patient.salleLit}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {patient.dureePrevue}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      {patient.statut}
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
