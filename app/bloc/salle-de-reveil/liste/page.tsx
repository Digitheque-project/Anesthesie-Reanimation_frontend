'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { salleReveilService } from '@/lib/api/salle-reveil.service';
import { libelleUrgence, styleUrgence } from '@/lib/urgence';
import { formaterNomPatient } from '@/lib/patient';
import RoleGate from '@/components/bloc/auth/RoleGate';
import { RoleClinique } from '@/lib/auth/role-clinique';
import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton';
import ProgrammeAVenirModal from '@/components/bloc/patient-du-jour/ProgrammeAVenirModal';

interface PatientReveil {
  id: string;
  nom: string;
  prenom: string;
  idDossier: string;
  intervention: string;
  niveauUrgence: 'TRES_URGENT' | 'URGENT' | 'NORMAL' | string;
  entree: Date | null;
  depuis: string;
}

type Tri = 'RECENT' | 'ANCIEN';

export default function ListeSalleReveil() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientReveil[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreUrgence, setFiltreUrgence] = useState<'TOUS' | 'TRES_URGENT' | 'URGENT' | 'NORMAL'>('TOUS');
  const [filtreDate, setFiltreDate] = useState(() => {
    const d = new Date();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mois}-${jour}`;
  });
  const [tri, setTri] = useState<Tri>('RECENT');
  // Vue d'ensemble de la charge à venir (patients à opérer, triés par date) — même popup que sur
  // Programme opératoire / non-chirurgical et Fil de travail : utile ici pour anticiper les
  // prochaines arrivées en salle de réveil sans changer d'écran.
  const [showProgrammeAVenir, setShowProgrammeAVenir] = useState(false);

  useEffect(() => {
    chargerPatients();
  }, []);

  const chargerPatients = async () => {
    try {
      setLoading(true);
      const data = await salleReveilService.getPatientsEnReveil();
      setPatients((data || []).map((p: any) => {
        const entree = p.updatedAt ? new Date(p.updatedAt) : null;
        return {
          id: p.patientId || p.id,
          nom: p.nom || '',
          prenom: p.prenom || '',
          idDossier: p.idDossier || '—',
          intervention: p.libelle || p.typeChirurgie || 'Non spécifiée',
          niveauUrgence: p.niveauUrgence || 'NORMAL',
          entree,
          depuis: entree ? entree.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
        };
      }));
    } catch (err) {
      console.error('Erreur chargement:', err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const getUrgenceBadge = (niveau: string) => libelleUrgence(niveau);

  const getUrgenceColor = (niveau: string) => styleUrgence(niveau).badge;

  // Date locale (YYYY-MM-DD) — cohérente avec la valeur du champ de date, pour que le filtre
  // « aujourd'hui » par défaut ne rate pas des patients à cause du décalage UTC.
  const dateLocale = (d: Date) => {
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mois}-${jour}`;
  };

  const patientsAffiches = patients
    .filter((p) => filtreUrgence === 'TOUS' || p.niveauUrgence === filtreUrgence)
    .filter((p) => !filtreDate || (p.entree && dateLocale(p.entree) === filtreDate))
    .filter((p) => !recherche.trim() || formaterNomPatient(p).toLowerCase().includes(recherche.trim().toLowerCase()))
    .sort((a, b) => {
      const ta = a.entree?.getTime() ?? 0;
      const tb = b.entree?.getTime() ?? 0;
      return tri === 'RECENT' ? tb - ta : ta - tb;
    });

  return (
    <RoleGate allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.IBODE, RoleClinique.MAJOR]} message="Vous n'avez pas accès à la salle de réveil.">
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🛏️ Tous les patients en salle de réveil</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowProgrammeAVenir(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Voir le programme à venir
          </button>
          <button
            onClick={chargerPatients}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un patient..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[180px]"
        />
        <select
          value={filtreUrgence}
          onChange={(e) => setFiltreUrgence(e.target.value as typeof filtreUrgence)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="TOUS">Toutes urgences</option>
          <option value="NORMAL">Normal</option>
          <option value="URGENT">Urgent</option>
          <option value="TRES_URGENT">Très urgent</option>
        </select>
        <input
          type="date"
          value={filtreDate}
          onChange={(e) => setFiltreDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          title="Filtrer par date d'entrée en salle de réveil"
        />
        {filtreDate && (
          <button onClick={() => setFiltreDate('')} className="text-xs text-blue-600 font-bold hover:underline">
            Effacer la date
          </button>
        )}
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as Tri)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm ml-auto"
        >
          <option value="RECENT">Plus récent d'abord</option>
          <option value="ANCIEN">Plus ancien d'abord</option>
        </select>
        <span className="text-xs font-bold text-gray-500">{patientsAffiches.length} patient{patientsAffiches.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des patients...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intervention</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Depuis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgence</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patientsAffiches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {patients.length === 0 ? 'Aucun patient en salle de réveil' : 'Aucun résultat pour ces filtres'}
                  </td>
                </tr>
              ) : (
                patientsAffiches.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{formaterNomPatient(patient)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{patient.intervention}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{patient.depuis}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${getUrgenceColor(patient.niveauUrgence)}`}>
                        {getUrgenceBadge(patient.niveauUrgence)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => router.push(`/bloc/salle-de-reveil/suivi?patientId=${patient.id}&patientNom=${encodeURIComponent(formaterNomPatient(patient))}&intervention=${encodeURIComponent(patient.intervention)}`)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition shadow-md hover:shadow-lg"
                        >
                          📋 Surveiller
                        </button>
                        <VoirDossierButton patientId={patient.id} variant="icon" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProgrammeAVenirModal
        open={showProgrammeAVenir}
        onClose={() => setShowProgrammeAVenir(false)}
      />
    </div>
    </RoleGate>
  );
}
