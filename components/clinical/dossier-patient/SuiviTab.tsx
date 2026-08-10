'use client';

import { useState, useEffect } from 'react';
import { History, Thermometer, Activity, Heart, Wind, Stethoscope, Calendar, User, ChevronRight, AlertCircle } from 'lucide-react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { ehr } from '@/lib/clinical/ehr-theme';
import { getDirectoryUser, formatDirectoryUserName, type DirectoryUser } from '@/lib/clinical/user-directory-api';

interface Suivi {
  id: string;
  jourHospitalisation?: string;
  temperature?: number;
  taSystolique?: string;
  taDiastolique?: string;
  frequenceCardiaque?: string;
  frequenceRespiratoire?: string;
  evaDouleur?: number;
  glasgow?: string;
  etatGeneral?: string;
  examenClinique?: string;
  evolution?: string;
  signesAlerte?: boolean;
  auteur?: string;
  createdBy?: string;
  auteurId?: string;
  userId?: string;
  createdAt: string;
}

const etatColors: Record<string, { bg: string; color: string; label: string }> = {
  Stable: { bg: '#dcfce7', color: '#16a34a', label: 'STABLE' },
  Amélioré: { bg: '#fef9c3', color: '#ca8a04', label: 'AMÉLIORÉ' },
  Aggravé: { bg: '#fee2e2', color: '#dc2626', label: 'AGGRAVÉ' },
  Critique: { bg: '#fee2e2', color: '#dc2626', label: 'CRITIQUE' },
  Guéri: { bg: '#dcfce7', color: '#16a34a', label: 'GUÉRI' },
};

// Classe Tailwind réutilisée pour les libellés en lecture seule.
const labelClass = 'block text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.05em] mb-0.5';

export function SuiviTab({ patientId, chuId, serviceId }: { patientId: string; chuId?: string; serviceId?: string }) {
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(5);
  const [authors, setAuthors] = useState<Record<string, DirectoryUser>>({});

  useEffect(() => { load(); }, [patientId, chuId, serviceId]);

  // Récupère les infos (nom prénom + job) des auteurs depuis le service user,
  // à partir de l'identifiant de l'utilisateur ayant créé chaque suivi (token → createdBy).
  useEffect(() => {
    const ids = Array.from(
      new Set(
        suivis
          .map((s) => s.createdBy ?? s.auteurId ?? s.userId)
          .filter((v): v is string => Boolean(v)),
      ),
    ).filter((id) => !authors[id]);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => [id, await getDirectoryUser(id)] as const),
      );
      if (cancelled) return;
      setAuthors((prev) => {
        const next = { ...prev };
        for (const [id, u] of entries) if (u) next[id] = u;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [suivis, authors]);

  const load = async () => {
    try {
      const res = await api.get(`/patients/${patientId}/suivis`, {
        params: { chuId, serviceId },
      });
      setSuivis(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getTempColor = (temp?: number) => {
    if (!temp) return ehr.text;
    if (temp >= 38.5) return ehr.danger;
    if (temp >= 37.5) return '#f97316';
    return ehr.text;
  };

  const getEvaColor = (eva?: number) => {
    if (eva === undefined || eva === null) return ehr.text;
    if (eva >= 7) return ehr.danger;
    if (eva >= 4) return '#f97316';
    return ehr.primary;
  };

  const suivisFiltres = suivis.filter(s => !filterDate || s.createdAt.startsWith(filterDate));

  return (
    <div className="flex gap-8 h-full min-h-0 text-[#1e293b] font-['Manrope',sans-serif]">

      {/* Main Content: Timeline */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Header Section (fixe, ne défile pas) */}
        <div className="flex justify-between items-start gap-4 flex-wrap mb-4 shrink-0 pb-4 border-b border-[#e2e8f0]">
          <div>
            <div>
              <h1 className="text-2xl font-extrabold m-0 tracking-[-0.02em]">Suivi / Évolution</h1>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748b]">
              <Calendar size={14} />
              <span className="text-[13px] font-medium">Observations et constantes de l&apos;épisode actuel</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#64748b] tracking-[0.05em]">AFFICHER</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="w-20 h-[38px] px-3 text-[13px] font-bold cursor-pointer border border-[#e2e8f0] rounded-[10px] text-[#1e293b] outline-none box-border bg-white transition-all"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={1000}>Tous</option>
              </select>
            </div>

            {/* Search by Date */}
            <div className="flex flex-col items-end gap-1">
              <div className="relative">
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-[180px] pl-10 pr-[14px] py-[10px] text-[13px] rounded-[10px] text-[#1e293b] outline-none box-border transition-all"
                  style={{
                    backgroundColor: filterDate ? ehr.highlightBlueTint : '#F8FAFC',
                    border: `1px solid ${filterDate ? ehr.primary : ehr.borderSoft}`,
                  }}
                />
              </div>
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="text-[11px] font-extrabold text-[#E74C3C] bg-transparent border-none cursor-pointer py-0.5 px-1 uppercase tracking-[0.02em]"
                >
                  Effacer le filtre
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Zone défilante : seule la liste défile, l'en-tête reste fixe */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">

        {loading && (
          <div className="flex justify-center py-[60px]">
            <div className="text-[#64748b] text-sm font-semibold">Chargement du suivi...</div>
          </div>
        )}

        {!loading && suivis.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-dashed border-[#E0E0E0] text-[#64748b]">
            <History size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-base font-bold m-0 text-[#1e293b]">Aucune observation enregistrée</p>
            <p className="text-sm mt-2">Cliquez sur le bouton ci-dessus pour ajouter le premier suivi.</p>
          </div>
        )}

        {!loading && filterDate && suivisFiltres.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-dashed border-[#E0E0E0] text-[#64748b]">
            <History size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-base font-bold m-0 text-[#1e293b]">Aucun résultat</p>
            <p className="text-sm mt-2">Aucune observation ne correspond à la date sélectionnée.</p>
          </div>
        )}

        <div className="flex flex-col gap-0 pl-3">
          {suivisFiltres
            .slice(0, pageSize)
            .map((s, index, array) => {
              const es = etatColors[s.etatGeneral || 'Stable'] || etatColors['Stable'];
              const creatorId = s.createdBy ?? s.auteurId ?? s.userId ?? null;
              const author = creatorId ? authors[creatorId] : null;
              const authorName = formatDirectoryUserName(author) || s.auteur || '—';
              const authorJob = author?.job || '';
              const cardStyle = { boxShadow: index === 0 ? '0 4px 20px rgba(0,0,0,0.03)' : 'none' };
              const badgeStyle = { color: es.color, backgroundColor: es.bg };
              const tempColorStyle = { color: getTempColor(s.temperature) };
              const evaColorStyle = { color: getEvaColor(s.evaDouleur) };
              return (
                <div key={s.id} className="flex gap-6 relative pb-10">
                  {/* Ligne verticale timeline */}
                  {index < array.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-[#e2e8f0] z-0" />
                  )}

                  {/* Point Timeline */}
                  <div className="shrink-0 z-[1] mt-1.5">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{
                        backgroundColor: index === 0 ? ehr.primary : '#fff',
                        border: `4px solid ${index === 0 ? ehr.highlightBlueTint : ehr.borderSoft}`,
                        boxShadow: index === 0 ? '0 0 0 2px rgba(5, 102, 141, 0.1)' : 'none',
                      }}
                    />
                  </div>

                  {/* Card Contenu */}
                  <div
                    className="flex-1 bg-white rounded-2xl border border-[#e2e8f0] p-5"
                    style={cardStyle}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-base font-extrabold">{formatDate(s.createdAt)}</span>
                          {s.signesAlerte && (
                            <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#E74C3C] bg-[#fee2e2] py-0.5 px-2 rounded-md">
                              <AlertCircle size={12} /> ALERTE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[#64748b]">
                          <User size={12} className="text-[#05668D]" />
                          <span className="text-[13px] font-bold text-[#05668D]">{authorName}</span>
                          {authorJob && (
                            <span className="text-[10px] font-extrabold text-[#05668D] bg-[#EBF5FB] px-1.5 py-0.5 rounded uppercase tracking-[0.03em]">{authorJob}</span>
                          )}
                          <span className="text-md font-semibold text-[#5d646e]">• {formatTime(s.createdAt)}</span>
                        </div>
                      </div>

                      <div
                        className="text-[10px] font-extrabold py-1 px-3 rounded-lg tracking-[0.05em]"
                        style={badgeStyle}
                      >
                        {es.label}
                      </div>
                    </div>

                    {/* Constantes Grid */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-5 bg-[#F8FAFC] p-4 rounded-xl mb-5">
                      {s.temperature && (
                        <div className="flex items-center gap-2.5">
                          <div style={tempColorStyle}><Thermometer size={18} /></div>
                          <div>
                            <p className={labelClass}>TEMP</p>
                            <p className="text-[15px] font-extrabold m-0" style={tempColorStyle}>{s.temperature}°C</p>
                          </div>
                        </div>
                      )}
                      {(s.taSystolique || s.taDiastolique) && (
                        <div className="flex items-center gap-2.5">
                          <div className="text-[#05668D]"><Activity size={18} /></div>
                          <div>
                            <p className={labelClass}>TA</p>
                            <p className="text-[15px] font-extrabold m-0">{s.taSystolique}/{s.taDiastolique}</p>
                          </div>
                        </div>
                      )}
                      {s.frequenceCardiaque && (
                        <div className="flex items-center gap-2.5">
                          <div className="text-[#ef4444]"><Heart size={18} /></div>
                          <div>
                            <p className={labelClass}>FC</p>
                            <p className="text-[15px] font-extrabold m-0">{s.frequenceCardiaque} <span className="text-[10px] font-semibold text-[#64748b]">bpm</span></p>
                          </div>
                        </div>
                      )}
                      {s.frequenceRespiratoire && (
                        <div className="flex items-center gap-2.5">
                          <div className="text-[#3b82f6]"><Wind size={18} /></div>
                          <div>
                            <p className={labelClass}>FR</p>
                            <p className="text-[15px] font-extrabold m-0">{s.frequenceRespiratoire} <span className="text-[10px] font-semibold text-[#64748b]">m/m</span></p>
                          </div>
                        </div>
                      )}
                      {s.glasgow && (
                        <div className="flex items-center gap-2.5">
                          <div className="text-[#05668D]"><Activity size={18} /></div>
                          <div>
                            <p className={labelClass}>GLASGOW</p>
                            <p className="text-[15px] font-extrabold m-0">{s.glasgow}</p>
                          </div>
                        </div>
                      )}
                      {s.evaDouleur !== undefined && s.evaDouleur !== null && (
                        <div className="flex items-center gap-2.5">
                          <div style={evaColorStyle}><Stethoscope size={18} /></div>
                          <div>
                            <p className={labelClass}>EVA</p>
                            <p className="text-[15px] font-extrabold m-0" style={evaColorStyle}>{s.evaDouleur}/10</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes & Commentaires */}
                    <div className="flex flex-col gap-3">
                      {s.evolution && (
                        <div className="flex gap-2.5">
                          <div className="text-[#05668D] mt-0.5"><ChevronRight size={14} strokeWidth={3} /></div>
                          <div>
                            <span className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.05em]">Évolution / Note</span>
                            <p className="text-sm font-semibold mt-0.5 mb-0 leading-normal">{s.evolution}</p>
                          </div>
                        </div>
                      )}
                      {s.examenClinique && (
                        <div className="flex gap-2.5">
                          <div className="text-[#05668D] mt-0.5"><ChevronRight size={14} strokeWidth={3} /></div>
                          <div>
                            <span className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.05em]">Examen Clinique</span>
                            <p className="text-sm font-semibold mt-0.5 mb-0 leading-normal">{s.examenClinique}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        </div>
      </div>
    </div>
  );
}
