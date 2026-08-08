'use client';

import React, { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { History, Clock, User } from 'lucide-react';

type TypeAction = 'creation' | 'modification' | 'consultation' | 'suppression' | 'sortie' | 'transfert';

interface HistoriqueEntry {
  id: string;
  action: TypeAction;
  module: string;
  anciennesValeurs: any;
  nouvellesValeurs: any;
  utilisateur: string;
  commentaire: string;
  dateAction: string;
}

interface Props {
  patientId: string;
}

const actionLabels: Record<TypeAction, string> = {
  creation: 'Création',
  modification: 'Modification',
  consultation: 'Consultation',
  suppression: 'Suppression',
  sortie: 'Sortie',
  transfert: 'Transfert',
};

const actionColors: Record<TypeAction, string> = {
  creation: 'bg-green-100 text-green-700',
  modification: 'bg-[#EBF5FB] text-[#05668D]',
  consultation: 'bg-gray-100 text-gray-700',
  suppression: 'bg-red-100 text-red-700',
  sortie: 'bg-purple-100 text-purple-700',
  transfert: 'bg-orange-100 text-orange-700',
};

export default function HistoriqueTab({ patientId }: Props) {
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>('Tous');

  useEffect(() => {
    fetchHistorique();
  }, [patientId]);

  const fetchHistorique = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/historique`);
      setHistorique(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      // L'endpoint d'historique n'est pas encore disponible côté backend (404) :
      // on affiche un état vide au lieu de faire échouer l'onglet.
      if (err?.response?.status === 404) {
        setHistorique([]);
      } else {
        console.error('Erreur chargement historique:', err);
        setHistorique([]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500" style={{ fontFamily: "'Manrope', sans-serif" }}>Chargement de l'historique...</div>;
  }

  if (historique.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <History size={48} className="mx-auto mb-3 text-gray-300" />
        <p>Aucun historique disponible pour ce patient.</p>
      </div>
    );
  }

  const uniqueModules = Array.from(new Set(historique.map(h => h.module).filter(Boolean)));
  const filteredHistorique = historique.filter(h => filterModule === 'Tous' || h.module === filterModule);

  const renderDetails = (valeurs: any, depth = 0) => {
    if (!valeurs) return null;

    // Si c'est une prescription avec une liste de médicaments ou produits ou paramètres
    if (depth === 0 && valeurs.medicaments && Array.isArray(valeurs.medicaments)) {
      return (
        <div className="space-y-2 mt-2 bg-white p-3 rounded border">
          <div className="font-semibold text-gray-800">Éléments prescrits :</div>
          <ul className="list-disc pl-5 space-y-2">
            {valeurs.medicaments.map((med: any, idx: number) => (
              <li key={idx} className="text-gray-700 text-sm">
                <span className="font-semibold">{med.nom || med.produit || med.type || med.parametre} {med.dose || ''}</span>
                {med.quantite && <span> — Qté : {med.quantite}</span>}
                {med.frequence && <span> · {med.frequence}</span>}
                {med.voie && <span> · {med.voie}</span>}
                {med.duree && <span> · Pendant {med.duree}</span>}
                {med.cible && <span> · Cible : {med.cible}</span>}
                {med.description && <span> · {med.description}</span>}
                {med.instructions && <div className="text-[11px] text-gray-500 italic mt-0.5">{med.instructions}</div>}
              </li>
            ))}
          </ul>
          {valeurs.remarques && (
            <div className="mt-3 text-gray-700 text-sm bg-gray-50 p-2 rounded">
              <span className="font-semibold">Remarques :</span> {valeurs.remarques}
            </div>
          )}
          {valeurs.notifierInfirmier !== undefined && (
            <div className="mt-1 text-gray-700 text-sm">
              <span className="font-semibold">Infirmier notifié :</span> {valeurs.notifierInfirmier ? 'Oui' : 'Non'}
            </div>
          )}
        </div>
      );
    }

    // Affichage récursif plus propre pour d'autres types d'objets (comme Labo et Imagerie)
    if (typeof valeurs === 'object' && valeurs !== null) {
      return (
        <div className={`grid grid-cols-1 gap-2 ${depth === 0 ? 'mt-2 bg-white p-3 rounded border' : 'mt-1 pl-3 border-l-2 border-gray-200'} text-sm`}>
          {Object.entries(valeurs).map(([key, value]) => {
            if (depth === 0 && ['id', 'patientId', 'prescripteurId', 'createdAt', 'updatedAt'].includes(key)) return null;
            if (value === null || value === undefined || value === '') return null;

            // Formatage lisible des clés (ex: estHospitalise -> Est Hospitalise)
            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
            const capitalizeKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

            if (Array.isArray(value)) {
              if (value.length === 0) return null;
              return (
                <div key={key} className="text-gray-700">
                  <span className="font-semibold">{capitalizeKey} :</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {value.map((item, idx) => (
                      <li key={idx}>{typeof item === 'object' ? renderDetails(item, depth + 1) : String(item)}</li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (typeof value === 'object') {
              return (
                <div key={key} className="text-gray-700">
                  <span className="font-semibold">{capitalizeKey} :</span>
                  {renderDetails(value, depth + 1)}
                </div>
              );
            }

            // Booléens traduits
            const displayValue = typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value);

            return (
              <div key={key} className="text-gray-700">
                <span className="font-semibold">{capitalizeKey} :</span> {displayValue}
              </div>
            );
          })}
        </div>
      );
    }

    return <span>{String(valeurs)}</span>;
  };

  return (
    <div className="space-y-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <div className="flex flex-wrap items-center justify-between border-b pb-2 gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <History size={20} />
          <h3 className="font-medium">Journal des actions</h3>
        </div>
        {uniqueModules.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Filtrer par module :</span>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#05668D]"
            >
              <option value="Tous">Tous les modules</option>
              {uniqueModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {filteredHistorique.map(entry => (
          <div key={entry.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[entry.action]}`}>
                  {actionLabels[entry.action]}
                </span>
                {entry.module && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{entry.module}</span>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={12} />
                {entry.dateAction
                  ? new Date(entry.dateAction).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-700">
              {entry.utilisateur && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <User size={12} /> {entry.utilisateur}
                </div>
              )}
              {entry.commentaire && <p className="text-gray-600 mt-1">{entry.commentaire}</p>}
              {(entry.anciennesValeurs || entry.nouvellesValeurs) && (
                <details className="mt-3 text-sm bg-gray-50 p-3 rounded-lg border">
                  <summary className="cursor-pointer font-medium text-[#05668D] hover:underline">Voir les détails de l'action</summary>
                  <div className="mt-3 space-y-4">
                    {entry.action === 'modification' && entry.anciennesValeurs && (
                      <div>
                        <strong className="text-gray-600 block mb-1">Avant modification :</strong>
                        {renderDetails(entry.anciennesValeurs)}
                      </div>
                    )}
                    {entry.nouvellesValeurs && (
                      <div>
                        <strong className="text-gray-600 block mb-1">
                          {entry.action === 'modification' ? 'Après modification :' : 'Données enregistrées :'}
                        </strong>
                        {renderDetails(entry.nouvellesValeurs)}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
