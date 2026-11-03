'use client';

import { useState, useEffect } from 'react';
import { getQuotaPremierSoin, getHistoriquePremierSoin } from '@/features/prescription/lib/api';
import { formatAriary } from './utils';
import { Icone } from '@/components/ui/Icone';

interface Props {
  patientId: string;
  chuId?: string;
  serviceId?: string;
}

interface KitEntry {
  id: string;
  createdAt: string;
  hospitalisationId: string;
  montantCouvert: number;
  montantPlafondApplique: number;
  dispensationIdPharmacie?: string | null;
  medicamentsInclus: { nom: string; quantite: number; prixUnitaire: number; coutTotal: number }[];
}

export default function PremierSoinTab({ patientId, chuId, serviceId }: Props) {
  const [quota, setQuota] = useState<{ used: number; remaining: number; max: number; eligible?: boolean } | null>(null);
  const [historique, setHistorique] = useState<KitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getQuotaPremierSoin(patientId, chuId, serviceId).catch(() => null),
      getHistoriquePremierSoin(patientId).catch(() => []),
    ]).then(([q, h]) => {
      if (!cancelled) {
        if (q) setQuota(q);
        setHistorique(Array.isArray(h) ? h : []);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, chuId, serviceId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--txt3)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--bdr)', borderTop: '2px solid var(--navy)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
        <span style={{ fontSize: 12 }}>Chargement...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const dejaUtilise = quota?.eligible === false && (quota?.used ?? 0) > 0;

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Quota Summary */}
      {quota && (
        <div style={{
          background: dejaUtilise ? 'var(--navy-lt)' : quota.used >= quota.max ? 'var(--red-lt)' : 'var(--blue-ps-lt)',
          border: `1px solid ${dejaUtilise ? 'var(--navy-mid)' : quota.used >= quota.max ? 'var(--red-bdr)' : 'var(--blue-ps-bdr)'}`,
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icone nom="local_hospital" style={{ fontSize: 22, color: dejaUtilise ? 'var(--navy)' : quota.used >= quota.max ? 'var(--red)' : 'var(--blue-ps)' }} />
              <div>
                <div style={{ fontSize: 11, color: dejaUtilise ? 'var(--navy)' : quota.used >= quota.max ? 'var(--red-dk)' : 'var(--blue-ps-dk)', opacity: 0.8 }}>
                  {formatAriary(quota.max)} par patient hospitalisé · usage unique par séjour
                </div>
              </div>
            </div>
            {dejaUtilise && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--navy)',
                padding: '3px 10px', borderRadius: 4,
              }}>
                UTILISÉ
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <div style={{ flex: 1, background: 'var(--card)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: dejaUtilise ? 'var(--navy)' : 'var(--blue-ps)' }}>{formatAriary(quota.used)}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Utilisé</div>
            </div>
            <div style={{ flex: 1, background: 'var(--card)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: dejaUtilise ? 'var(--txt3)' : quota.remaining <= 0 ? 'var(--red)' : 'var(--green)' }}>{formatAriary(quota.remaining)}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{dejaUtilise ? 'Restant (informatif)' : 'Restant'}</div>
            </div>
          </div>

          <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'var(--bdr)', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min((quota.used / quota.max) * 100, 100)}%`,
              height: '100%', borderRadius: 5,
              background: dejaUtilise ? 'var(--navy)' : quota.used >= quota.max ? 'var(--red)' : quota.used / quota.max >= 0.8 ? 'var(--amber-warn)' : 'var(--green)',
              transition: 'width 0.3s ease',
            }} />
          </div>

          {dejaUtilise && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic' }}>
              Ce montant est définitif pour cet séjour. Nouvelle éligibilité possible lors d&apos;une ré-hospitalisation.
            </div>
          )}
        </div>
      )}

      {/* Historique de tous les kits */}
      <div className="card" style={{ padding: 16 }}>
        <div className="sh mb12">
          <Icone nom="history" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
          Historique des premiers soins
          <span style={{ background: 'var(--navy)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, marginLeft: 5 }}>
            {historique.length}
          </span>
        </div>

        {historique.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--txt3)', fontSize: 13 }}>
            Aucun premier soin enregistré pour ce patient
          </div>
        ) : (
          historique.map(kit => (
            <div key={kit.id} style={{
              border: '1px solid var(--bdr)', borderRadius: 10, padding: 12, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                  {new Date(kit.createdAt).toLocaleDateString('fr-FR')} à {new Date(kit.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                  {formatAriary(kit.montantCouvert)}
                </span>
              </div>

              {/* Médicaments inclus */}
              {Array.isArray(kit.medicamentsInclus) && kit.medicamentsInclus.map((m, idx) => (
                <div key={idx} style={{ fontSize: 12, color: 'var(--txt2)', padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.nom} — qté : {m.quantite}</span>
                  <span style={{ color: 'var(--txt3)' }}>{formatAriary(m.coutTotal)}</span>
                </div>
              ))}

              {/* Plafond appliqué */}
              <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 6, borderTop: '1px solid var(--bdr)', paddingTop: 4 }}>
                Plafond appliqué : {formatAriary(kit.montantPlafondApplique)}
                {kit.dispensationIdPharmacie && (
                  <span style={{ marginLeft: 8 }}>· Dispensation : {kit.dispensationIdPharmacie}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

