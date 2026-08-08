'use client';

import { useState, useEffect } from 'react';
import { getQuotaPremierSoin, getHistoriquePremierSoin } from '@/features/prescription/lib/api';
import { formatAriary } from './utils';

interface Props {
  patientId: string;
}

interface PremierSoinEntry {
  id: string;
  createdAt: string;
  medicaments?: { nom: string; dose: string; quantite: number; prixUnitaire?: number }[];
  montantTotal?: number;
  prescripteur?: { nom: string };
}

export default function PremierSoinTab({ patientId }: Props) {
  const [quota, setQuota] = useState<{ used: number; remaining: number; max: number } | null>(null);
  const [historique, setHistorique] = useState<PremierSoinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getQuotaPremierSoin(patientId).catch(() => null),
      getHistoriquePremierSoin(patientId).catch(() => []),
    ]).then(([q, h]) => {
      if (!cancelled) {
        if (q) setQuota(q);
        setHistorique(Array.isArray(h) ? h : []);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--txt3)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--bdr)', borderTop: '2px solid var(--navy)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
        <span style={{ fontSize: 12 }}>Chargement...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Quota Summary */}
      {quota && (
        <div style={{
          background: quota.used >= quota.max ? '#fef2f2' : '#f0f4ff',
          border: `1px solid ${quota.used >= quota.max ? '#fca5a5' : '#93c5fd'}`,
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span className="ms" style={{ fontSize: 22, color: quota.used >= quota.max ? '#dc2626' : '#2563eb' }}>local_hospital</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: quota.used >= quota.max ? '#991b1b' : '#1e40af' }}>
                Quota Premier Soin
              </div>
              <div style={{ fontSize: 11, color: quota.used >= quota.max ? '#991b1b' : '#1e40af', opacity: 0.8 }}>
                {formatAriary(quota.max)} maximum par patient hospitalisé
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{formatAriary(quota.used)}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Utilisé</div>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: quota.remaining <= 0 ? '#dc2626' : '#16a34a' }}>{formatAriary(quota.remaining)}</div>
              <div style={{ fontSize: 10, color: 'var(--txt3)' }}>Restant</div>
            </div>
          </div>

          <div style={{ width: '100%', height: 10, borderRadius: 5, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min((quota.used / quota.max) * 100, 100)}%`,
              height: '100%', borderRadius: 5,
              background: quota.used >= quota.max ? '#dc2626' : quota.used / quota.max >= 0.8 ? '#f59e0b' : '#16a34a',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="card" style={{ padding: 16 }}>
        <div className="sh mb12">
          <span className="ms" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }}>history</span>
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
          historique.map(entry => (
            <div key={entry.id} style={{
              border: '1px solid var(--bdr)', borderRadius: 10, padding: 12, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                  {new Date(entry.createdAt).toLocaleDateString('fr-FR')} à {new Date(entry.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {entry.montantTotal != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{formatAriary(entry.montantTotal)}</span>
                )}
              </div>
              {entry.medicaments?.map((m, idx) => (
                <div key={idx} style={{ fontSize: 12, color: 'var(--txt2)', padding: '2px 0' }}>
                  {m.nom} {m.dose} — qté: {m.quantite}
                  {m.prixUnitaire != null && <span style={{ color: 'var(--txt3)', marginLeft: 6 }}>{formatAriary(m.prixUnitaire)}</span>}
                </div>
              ))}
              {entry.prescripteur && (
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4 }}>
                  Dr {entry.prescripteur.nom}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
