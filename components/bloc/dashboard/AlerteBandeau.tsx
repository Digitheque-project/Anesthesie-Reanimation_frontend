'use client';

import { useRouter } from 'next/navigation';

export interface PatientTresUrgent {
  id: string;
  nom: string;
  intervention?: string;
}

interface AlerteBandeauProps {
  patients: PatientTresUrgent[];
}

// Bannière d'alerte pour les patients très urgents en attente de prise en charge — un bouton
// "Voir" par patient, qui envoie directement faire la VPA (Visite Pré-Anesthésique). Pour un
// patient urgent, la VPA EST la CPA elle-même réalisée immédiatement (page /bloc/consultation-cpa,
// avec statut=STAT) — /bloc/verification-veille est une étape complètement différente (contrôle
// la veille de l'opération, pour des patients déjà passés par une CPA classique), jamais la bonne
// destination ici.
export default function AlerteBandeau({ patients }: AlerteBandeauProps) {
  const router = useRouter();
  if (patients.length <= 0) return null;

  const voirVpa = (p: PatientTresUrgent) => {
    const params = new URLSearchParams({ patientId: p.id, patientNom: p.nom, statut: 'STAT' });
    if (p.intervention) params.set('intervention', p.intervention);
    router.push(`/bloc/consultation-cpa?${params.toString()}`);
  };

  return (
    <div className="border border-red-300 bg-red-50 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <span className="material-symbols-outlined text-red-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          warning
        </span>
        <span className="text-sm font-bold text-red-700 flex-1 uppercase">
          {patients.length} patient{patients.length > 1 ? 's' : ''} TRÈS URGENT en attente de prise en charge
        </span>
      </div>
      <div className="divide-y divide-red-200/70 border-t border-red-200/70">
        {patients.map((p) => (
          <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3 bg-white/60">
            <span className="text-sm font-semibold text-red-900">{p.nom}</span>
            <button onClick={() => voirVpa(p)} className="text-xs font-bold text-red-700 underline cursor-pointer hover:opacity-80 transition-opacity shrink-0">
              Voir (VPA)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
