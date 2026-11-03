'use client';

import { useState, useEffect } from 'react';
import { getHistoriquePatient } from '@/features/prescription/lib/api';
import { Icone } from '@/components/ui/Icone';

interface Props {
  patientId: string;
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
  onRefresh?: () => void;
}

function formatAriary(v: number): string {
  return `${v.toLocaleString('fr-FR')} Ar`;
}

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  medicale: { label: 'Médicamenteuse', icon: 'medication', color: 'var(--navy)' },
  nonMedicale: { label: 'Non médicamenteuse', icon: 'self_care', color: 'var(--green-success, #16a34a)' },
  soinsInfirmier: { label: 'Soins infirmier', icon: 'health_and_safety', color: '#7c3aed' },
  actesOrl: { label: 'Actes ORL', icon: 'hearing', color: '#0891b2' },
  surveillance: { label: 'Surveillance', icon: 'monitor_heart', color: 'var(--navy, #006A8C)' },
};

function formatDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return d; }
}

function formatDateTime(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function frequenceTypeLabel(type?: string): string {
  switch (type) {
    case 'HEURES': return 'heure(s)';
    case 'PAR_JOUR': return 'jour';
    case 'SOS': return 'si besoin';
    case 'CONTINU': return 'continu';
    default: return type || '';
  }
}

export default function PrescriptionTermineeTab({ patientId, patientType, onRefresh }: Props) {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const isHospitalise = patientType === 'hospitalise';

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError('');
      try {
        if (!isHospitalise) {
          setPrescriptions([]);
          return;
        }
        const all = await getHistoriquePatient(patientId);
        const terminees = all.filter((p: any) => p.statut === 'TERMINEE');
        setPrescriptions(terminees);
      } catch {
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [patientId, isHospitalise]);

  const q = search.toLowerCase().trim();
  const byType = filter === 'all' ? prescriptions : prescriptions.filter(p => p._type === filter);
  const filtered = q
    ? byType.filter(p => {
        const meds = p.medicaments?.some((m: any) =>
          m.nom?.toLowerCase().includes(q) ||
          m.dose?.toLowerCase().includes(q) ||
          m.voie?.toLowerCase().includes(q) ||
          m.frequence?.toLowerCase().includes(q)
        );
        const items = p.items?.some((i: any) =>
          i.typeLabel?.toLowerCase().includes(q) ||
          i.type?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
        );
        const params = p.parametres?.some((pr: any) =>
          pr.parametre?.toLowerCase().includes(q) ||
          pr.type?.toLowerCase().includes(q)
        );
        const demandes = p.demandes?.some((d: any) =>
          d.typeActe?.toLowerCase().includes(q)
        );
        const doc = p.prescripteur?.nom?.toLowerCase().includes(q) ||
          p.nomMedecinPrescripteur?.toLowerCase().includes(q);
        return meds || items || params || demandes || doc;
      })
    : byType;
  const typeCounts = prescriptions.reduce((acc: Record<string, number>, p: any) => {
    acc[p._type] = (acc[p._type] || 0) + 1;
    return acc;
  }, {});

  function renderMedicale(p: any) {
    if (!p.medicaments?.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {p.medicaments.map((med: any, idx: number) => {
          const freq = med.frequence || (med.frequenceType && med.frequenceValeur != null ? `${med.frequenceValeur}×/${frequenceTypeLabel(med.frequenceType)}` : '');
          const dur = med.duree || (med.dureeJours ? `${med.dureeJours} jour(s)` : '');
          const dateStr = med.dateDebut ? formatDate(med.dateDebut) : '';
          return (
            <div key={idx} style={{ padding: '10px 12px', background: 'var(--inp)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{med.nom} {med.dose}</strong>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--navy)', color: '#fff', fontWeight: 600 }}>
                  qté {med.quantite}
                </span>
                {med.premierSoin && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--amber)', color: '#fff', fontWeight: 600 }}>PS</span>
                )}
                {med.prixUnitaire != null && (
                  <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{formatAriary(med.prixUnitaire)}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', lineHeight: 1.6 }}>
                {med.voie && <span>Voie : <strong>{med.voie}</strong></span>}
                {freq && <span>Fréquence : <strong>{freq}</strong></span>}
                {dur && <span>Durée : <strong>{dur}</strong></span>}
                {dateStr && <span>Début : <strong>{dateStr}</strong></span>}
                {med.heureDebut && <span>Heure : <strong>{med.heureDebut}</strong></span>}
              </div>
              {med.instructions && (
                <div style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic', marginTop: 4, padding: '4px 8px', background: 'rgba(0,0,0,.03)', borderRadius: 4 }}>
                  {med.instructions}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderNonMedicale(p: any) {
    if (!p.items?.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {p.items.map((item: any, idx: number) => (
          <div key={idx} style={{ padding: '10px 12px', background: 'var(--inp)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.typeLabel || item.type}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{item.description}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 4 }}>
              {item.duree && <span>Durée: {item.duree}</span>}
              {item.frequence && <span>Fréquence: {item.frequence}</span>}
              {item.dateDebut && <span>Début: {formatDate(item.dateDebut)}</span>}
              {item.heureDebut && <span>Heure: {item.heureDebut}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSoinsInfirmier(p: any) {
    if (!p.items?.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {p.items.map((item: any, idx: number) => (
          <div key={idx} style={{ padding: '10px 12px', background: 'var(--inp)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.typeLabel || item.type}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{item.description}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 4 }}>
              {item.duree && <span>Durée: {item.duree}</span>}
              {item.dureeJours && <span>Durée: {item.dureeJours} jour(s)</span>}
              {item.frequence && <span>Fréquence: {item.frequence}</span>}
              {item.frequenceType && <span>Type fréquence: {item.frequenceType}{item.frequenceValeur ? ` (${item.frequenceValeur})` : ''}</span>}
              {item.dateDebut && <span>Début: {formatDate(item.dateDebut)}</span>}
              {item.heureDebut && <span>Heure: {item.heureDebut}</span>}
              {item.instructions && <span style={{ fontStyle: 'italic' }}>{item.instructions}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSurveillance(p: any) {
    if (!p.parametres?.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {p.parametres.map((param: any, idx: number) => (
          <div key={idx} style={{ padding: '10px 12px', background: 'var(--inp)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{param.parametre || param.type}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
              {param.frequence && <span>Fréquence: {param.frequence}</span>}
              {param.duree && <span>Durée: {param.duree}</span>}
              {param.seuilMin && <span>Min: {param.seuilMin}</span>}
              {param.seuilMax && <span>Max: {param.seuilMax}</span>}
              {param.instructions && <span style={{ fontStyle: 'italic' }}>{param.instructions}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderActesOrl(p: any) {
    if (!p.demandes?.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {p.demandes.map((d: any, idx: number) => (
          <div key={idx} style={{ padding: '10px 12px', background: 'var(--inp)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{d.typeActe}</div>
            {d.remarques && <div style={{ fontSize: 12, color: 'var(--txt2)', fontStyle: 'italic' }}>{d.remarques}</div>}
            {d.statut && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: d.statut === 'REALISEE' ? 'var(--green-success, #16a34a)' : 'var(--txt3)', color: '#fff', marginTop: 4, display: 'inline-block' }}>
                {d.statut}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderContent(p: any) {
    switch (p._type) {
      case 'medicale': return renderMedicale(p);
      case 'nonMedicale': return renderNonMedicale(p);
      case 'soinsInfirmier': return renderSoinsInfirmier(p);
      case 'surveillance': return renderSurveillance(p);
      case 'actesOrl': return renderActesOrl(p);
      default: return null;
    }
  }

  return (
    <div>
      <div className="active-rx" style={{ maxWidth: 700 }}>
        <div className="active-rx-header">
          <Icone nom="task_alt" />
          <span>Prescriptions terminées</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid var(--bdr)' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filter === 'all' ? 700 : 500,
              background: filter === 'all' ? 'var(--navy)' : 'var(--inp)',
              color: filter === 'all' ? '#fff' : 'var(--txt2)',
            }}
          >
            Tous ({prescriptions.length})
          </button>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            typeCounts[key] ? (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filter === key ? 700 : 500,
                  background: filter === key ? meta.color : 'var(--inp)',
                  color: filter === key ? '#fff' : 'var(--txt2)',
                }}
              >
                {meta.label} ({typeCounts[key]})
              </button>
            ) : null
          ))}
        </div>

        {prescriptions.length > 3 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ position: 'relative' }}>
              <Icone nom="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--txt3)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par médicament, type, médecin, acte..."
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--inp)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16, lineHeight: 1, padding: 0 }}>
                  <Icone nom="close" />
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="active-rx-item">
            <Icone nom="autorenew" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <span style={{ marginLeft: 8 }}>Chargement...</span>
          </div>
        )}

        {error && (
          <div className="active-rx-item" style={{ color: 'var(--red)' }}>{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="active-rx-item">
            <span style={{ color: 'var(--txt3)' }}>
              {q ? 'Aucun résultat pour cette recherche' : 'Aucune prescription terminée'}
            </span>
          </div>
        )}

        {!loading && !error && filtered.map((p: any) => {
          const meta = TYPE_META[p._type] || { label: p._type, icon: 'description', color: 'var(--txt3)' };
          return (
            <div key={`${p._type}-${p.id}`} style={{ padding: '12px', borderBottom: '1px solid var(--bdr)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                  background: meta.color, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Icone nom={meta.icon} style={{ fontSize: 12 }} />
                  {meta.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {formatDateTime(p.createdAt)}
                </span>
                {p.updatedAt && p.updatedAt !== p.createdAt && (
                  <span style={{ fontSize: 11, color: 'var(--red, #dc2626)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Icone nom="task_alt" style={{ fontSize: 13 }} />
                    Terminée le {formatDateTime(p.updatedAt)}
                  </span>
                )}
                {(p.nomMedecinPrescripteur || p.prescripteur?.nom) && (
                  <span style={{ fontSize: 11, color: 'var(--txt2)', marginLeft: 'auto' }}>
                    Dr {p.nomMedecinPrescripteur || p.prescripteur?.nom}
                  </span>
                )}
                {p.notifierInfirmier && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--blue-ps-lt)', color: 'var(--navy)' }}>
                    Infirmier notifié
                  </span>
                )}
              </div>

              {renderContent(p)}

              {p.motif && (
                <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 6, padding: '4px 8px', background: 'var(--inp)', borderRadius: 6 }}>
                  <strong>Motif:</strong> {p.motif}
                </div>
              )}

              {p.observation && (
                <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4, padding: '4px 8px', background: 'var(--inp)', borderRadius: 6 }}>
                  <strong>Observation:</strong> {p.observation}
                </div>
              )}

              {p.renseignements && (
                <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4, padding: '4px 8px', background: 'var(--inp)', borderRadius: 6 }}>
                  <strong>Renseignements:</strong> {p.renseignements}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
