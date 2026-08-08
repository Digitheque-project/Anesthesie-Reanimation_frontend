'use client';

import React, { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import {
  Microscope,
  Image,
  Activity,
  FileText,
  Stethoscope,
  File,
} from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

type TypeExamen = 'laboratoire' | 'imagerie' | 'endoscopie' | 'anatomopathologie' | 'autre';
type Statut = 'demande' | 'en_cours' | 'disponible' | 'lu';

interface ResultatParaclinique {
  id: string;
  type: TypeExamen;
  examen: string;
  dateDemande: string;
  dateResultat: string | null;
  resultatTexte: string | null;
  resultatFichiers: string[] | null;
  prescripteur: string | null;
  statut: Statut;
  commentaire: string | null;
}

interface Props {
  patientId: string;
}

const typeIcons = {
  laboratoire: <Microscope size={20} />,
  imagerie: <Image size={20} />,
  endoscopie: <Activity size={20} />,
  anatomopathologie: <FileText size={20} />,
  autre: <Stethoscope size={20} />,
};

const typeLabels = {
  laboratoire: 'Laboratoire',
  imagerie: 'Imagerie',
  endoscopie: 'Endoscopie',
  anatomopathologie: 'Anatomo-patho',
  autre: 'Autre',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#F8FAFC',
  color: ehr.text,
  outline: 'none',
  fontFamily: "'Manrope', sans-serif",
};

const statutLabels = {
  demande: 'Demandé',
  en_cours: 'En cours',
  disponible: 'Disponible',
  lu: 'Lu',
};

export default function ResultatsParacliniquesTab({ patientId }: Props) {
  const [resultats, setResultats] = useState<ResultatParaclinique[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TypeExamen | 'tous'>('tous');
  const [selectedResult, setSelectedResult] = useState<ResultatParaclinique | null>(null);

  useEffect(() => {
    fetchResultats();
  }, [patientId]);

  const fetchResultats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/resultats`);
      setResultats(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      // L'endpoint des résultats paracliniques n'est pas encore disponible côté
      // backend (404) : on affiche un état vide au lieu de faire échouer l'onglet.
      if (err?.response?.status === 404) {
        setResultats([]);
      } else {
        console.error('Erreur chargement résultats:', err);
        setResultats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerLu = async (id: string) => {
    try {
      await api.patch(`/patients/${patientId}/resultats/${id}/lu`);
      await fetchResultats();
      if (selectedResult?.id === id) {
        setSelectedResult({ ...selectedResult, statut: 'lu' });
      }
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  const selectResult = (result: ResultatParaclinique) => {
    setSelectedResult(result);
    if (result.statut !== 'lu') {
      handleMarquerLu(result.id);
    }
  };

  const filteredResultats = resultats.filter(r => {
    if (filterType !== 'tous' && r.type !== filterType) return false;
    return true;
  });

  if (!selectedResult && filteredResultats.length > 0) {
    setSelectedResult(filteredResultats[0]);
  }

  return (
    <div style={{ display: 'flex', gap: '32px', fontFamily: "'Manrope', sans-serif", color: ehr.text }}>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Résultats paracliniques</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Suivi des examens biologiques et imagerie</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value as TypeExamen | 'tous')} style={selectStyle}>
              <option value="tous">Tous les types</option>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: ehr.textMuted }}>Chargement des résultats...</div>
        ) : selectedResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Detail Card */}
            <div style={{
              backgroundColor: '#fff',
              border: `1px solid ${ehr.borderSoft}`,
              borderRadius: 16,
              padding: 24,
              boxShadow: ehr.shadowCard
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    backgroundColor: ehr.highlightBlueTint,
                    color: ehr.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {typeIcons[selectedResult.type]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedResult.examen}</h2>
                    <div style={{ fontSize: 13, color: ehr.textMuted, fontWeight: 600, marginTop: 2 }}>
                      {typeLabels[selectedResult.type]} · ID: {selectedResult.id}
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  backgroundColor: selectedResult.statut === 'lu' ? '#F0FDF4' : '#FFF7ED',
                  color: selectedResult.statut === 'lu' ? '#16A34A' : '#C2410C',
                  border: `1px solid ${selectedResult.statut === 'lu' ? '#BBF7D0' : '#FED7AA'}`
                }}>
                  {statutLabels[selectedResult.statut].toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, padding: '20px 0', borderTop: `1px solid ${ehr.borderSoft}`, borderBottom: `1px solid ${ehr.borderSoft}` }}>
                <DetailField label="DEMANDÉ LE" value={new Date(selectedResult.dateDemande).toLocaleDateString('fr-FR')} />
                <DetailField label="RÉSULTAT LE" value={selectedResult.dateResultat ? new Date(selectedResult.dateResultat).toLocaleDateString('fr-FR') : 'En attente'} />
                <DetailField label="PRESCRIPTEUR" value={selectedResult.prescripteur || '—'} />
                <DetailField label="LABORATOIRE/CENTRE" value="Centre Hospitalier Universitaire" />
              </div>

              <div style={{ marginTop: 32 }}>
                <label style={labelStyle}>RÉSULTATS DÉTAILLÉS</label>
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 24,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: ehr.text,
                  minHeight: 120,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedResult.resultatTexte || 'Aucune donnée textuelle disponible.'}
                </div>
              </div>

              {selectedResult.resultatFichiers && selectedResult.resultatFichiers.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <label style={labelStyle}>DOCUMENTS JOINTS</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {selectedResult.resultatFichiers.map((file, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', borderRadius: 10,
                        border: `1px solid ${ehr.borderSoft}`,
                        backgroundColor: '#fff', cursor: 'pointer'
                      }}>
                        <File size={16} color={ehr.primary} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: ehr.primary }}>{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedResult.commentaire && (
                <div style={{ marginTop: 32, padding: 20, backgroundColor: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: 12 }}>
                  <label style={{ ...labelStyle, color: '#A16207' }}>COMMENTAIRE CLINIQUE</label>
                  <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#854D0E', fontWeight: 500 }}>{selectedResult.commentaire}</p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={{ backgroundColor: '#fff', border: `1px solid ${ehr.borderSoft}`, padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Imprimer</button>
              <button style={{ backgroundColor: '#fff', border: `1px solid ${ehr.borderSoft}`, padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Transférer</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 0', color: ehr.textMuted }}>
            <p>Sélectionnez un examen pour voir les détails</p>
          </div>
        )}
      </div>

      {/* Sidebar: Historique des examens */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <div style={{
          border: `1px solid ${ehr.borderSoft}`,
          borderRadius: 16,
          backgroundColor: '#fff',
          overflow: 'hidden',
          boxShadow: ehr.shadowCard,
          position: 'sticky',
          top: 0
        }}>
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${ehr.borderSoft}`,
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historique</h3>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: ehr.primary, color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{filteredResultats.length}</span>
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            {filteredResultats.map((result) => (
              <button
                key={result.id}
                onClick={() => selectResult(result)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px',
                  backgroundColor: selectedResult?.id === result.id ? ehr.highlightBlueTint : '#fff',
                  borderRadius: 12,
                  border: `1px solid ${selectedResult?.id === result.id ? ehr.primary : 'transparent'}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  backgroundColor: selectedResult?.id === result.id ? '#fff' : '#F1F5F9',
                  color: selectedResult?.id === result.id ? ehr.primary : ehr.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {typeIcons[result.type]}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ehr.textMuted }}>{new Date(result.dateDemande).toLocaleDateString('fr-FR')}</span>
                    {result.statut !== 'lu' && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EF4444' }}></div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ehr.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {result.examen}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: ehr.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      <div style={{ fontSize: 14, fontWeight: 700, color: ehr.text }}>{value}</div>
    </div>
  );
}
