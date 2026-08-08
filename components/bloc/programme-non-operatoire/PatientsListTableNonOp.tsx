"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { styleUrgence } from "@/lib/urgence";
import { formaterNomPatient } from "@/lib/patient";
import { libelleStatutPatient, styleStatutPatient } from "@/lib/statut";
import { useRole } from "@/lib/hooks/useRole";

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  operation: string;
  serviceOrigine?: string;
  etat: string;
  statut?: string;
  chirurgien?: string;
  dateIntervention?: string | null;
  salle?: string;
  realId?: string;
}

const formaterHeureDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

interface PatientsListTableNonOpProps {
  patients: Patient[];
}

// Variante de PatientsListTable (Programme opératoire) pour le Programme non-opératoire : mêmes
// actions et même mécanique (Sign In/Time Out/Sign Out identiques), mais sans colonne "type de
// chirurgie" — remplacée par le service d'origine (Imagerie, Endoscopie, Urgence...), seule
// information pertinente pour ces patients qui ne sont jamais opérés au programme du Bloc
// lui-même.
export default function PatientsListTableNonOp({ patients }: PatientsListTableNonOpProps) {
  const router = useRouter();
  const { estChirurgien, estIbode } = useRole();
  const [loadingPatients, setLoadingPatients] = useState<Set<string>>(new Set());

  const handleDemarrer = async (patient: Patient) => {
    setLoadingPatients((prev) => new Set(prev).add(patient.id));
    const cleanId = patient.realId || patient.id.replace("#", "");
    const nom = encodeURIComponent(formaterNomPatient(patient));
    const intervention = encodeURIComponent(patient.operation || '');
    const cible = patient.statut === 'EN_COURS_OPERATION'
      ? `/bloc/activite-pendant-operation?patientId=${cleanId}&patientNom=${nom}&intervention=${intervention}`
      : estChirurgien
      ? `/bloc/protocole-operatoire?patientId=${cleanId}&patientNom=${nom}`
      : estIbode
      ? `/bloc/activite-pendant-operation?patientId=${cleanId}&patientNom=${nom}&intervention=${intervention}`
      : `/bloc/arrivee-bloc?patientId=${cleanId}&patientNom=${nom}&intervention=${intervention}`;
    router.push(cible);
    setTimeout(() => setLoadingPatients((prev) => {
      const next = new Set(prev);
      next.delete(patient.id);
      return next;
    }), 1000);
  };

  const handleDossier = (patient: Patient) => {
    const cleanId = patient.realId || patient.id.replace("#", "");
    router.push(`/bloc/dossier-patient/${cleanId}/complet`);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-surface-container">
      <div className="px-8 py-6 bg-white border-b border-surface-container flex items-center justify-between">
        <h4 className="text-xl font-extrabold text-on-surface tracking-tight font-headline">Liste des patients</h4>
        <span className="text-sm font-bold text-on-surface-variant">{patients.length} patient{patients.length > 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Heure / Date prévue</th>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nom & Prénom</th>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Service d'origine</th>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Chirurgien / Prescripteur</th>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Salle</th>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
              <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {patients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-sm text-on-surface-variant">
                  Aucun patient ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
            {patients.map((patient) => {
              const isLoading = loadingPatients.has(patient.id);
              const styleStatut = styleStatutPatient(patient.statut);
              return (
                <tr key={patient.id} className="hover:bg-surface-container-high/40 transition-colors duration-200">
                  <td className="px-8 py-5"><span className="text-sm font-medium text-on-surface-variant whitespace-nowrap">{formaterHeureDate(patient.dateIntervention)}</span></td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${patient.etat === 'NORMAL' ? 'bg-primary-fixed text-primary' : `${styleUrgence(patient.etat).fondClair} ${styleUrgence(patient.etat).texte}`}`}>
                        {patient.nom?.charAt(0)}{patient.prenom?.charAt(0)}
                      </div>
                      <span className="font-bold text-on-surface">{formaterNomPatient(patient)}</span>
                      {patient.etat !== 'NORMAL' && (
                        <span className={`w-1.5 h-1.5 rounded-full ${styleUrgence(patient.etat).point} animate-pulse`} title={patient.etat === 'TRES_URGENT' ? 'Très urgent' : 'Urgent'} />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5"><span className="text-sm font-medium text-on-surface">{patient.serviceOrigine || '—'}</span></td>
                  <td className="px-8 py-5"><span className="text-sm text-on-surface-variant">{patient.chirurgien || '—'}</span></td>
                  <td className="px-8 py-5"><span className="text-sm text-on-surface-variant">{patient.salle || '—'}</span></td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${styleStatut.badge}`}>
                      {libelleStatutPatient(patient.statut)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleDemarrer(patient)} disabled={isLoading}
                        className="min-w-[100px] px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm disabled:opacity-70">
                        {isLoading ? '...' : 'Démarrer'}
                      </button>
                      <button onClick={() => handleDossier(patient)}
                        className="px-4 py-1.5 bg-white text-primary border border-primary/30 rounded-lg text-xs font-bold hover:bg-primary-fixed transition-all active:scale-95 shadow-sm">
                        Dossier
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
