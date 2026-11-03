'use client';

import { useState, useEffect } from 'react';
import { getQuotaPremierSoin } from '@/features/prescription/lib/api';
import { formatAriary } from './utils';
import { Icone } from '@/components/ui/Icone';

interface Props {
  patientId: string;
  chuId?: string;
  serviceId?: string;
  refreshKey?: number;
  draftPremierSoinTotal?: number;
}

export default function PremierSoinQuotaBar({ patientId, chuId, serviceId, refreshKey, draftPremierSoinTotal = 0 }: Props) {
  const [quota, setQuota] = useState<{ used: number; remaining: number; max: number; eligible?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getQuotaPremierSoin(patientId, chuId, serviceId)
      .then(data => { if (!cancelled) setQuota(data); })
      .catch(() => { if (!cancelled) setError('Impossible de charger le quota'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, chuId, serviceId, refreshKey]);

  if (loading) {
    return (
      <div style={{ background: 'var(--blue-ps-lt)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 16, height: 16, border: '2px solid var(--blue-ps-bdr)', borderTop: '2px solid var(--blue-ps)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--blue-ps)', fontWeight: 600 }}>Chargement quota...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div style={{ background: 'var(--red-lt)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--red-dk)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icone nom="warning" style={{ fontSize: 16 }} />
        {error || 'Quota indisponible'}
      </div>
    );
  }

  const dejaUtilise = quota.used > 0;

  // --- Projection temps réel ---
  const used = quota.used;
  const projected = used + draftPremierSoinTotal;
  const remaining = Math.max(quota.max - projected, 0);
  const projectedRatio = quota.max > 0 ? projected / quota.max : 0;
  const projectedPct = Math.min(projectedRatio * 100, 100);
  const exceeded = projected > quota.max;

  const color = exceeded ? 'var(--red)' : projectedRatio >= 0.8 ? 'var(--amber-warn)' : 'var(--green)';
  const bgColor = exceeded ? 'var(--red-lt)' : projectedRatio >= 0.8 ? 'var(--amber-warn-lt)' : 'var(--green-lt)';
  const borderColor = exceeded ? 'var(--red-bdr)' : projectedRatio >= 0.8 ? 'var(--amber-warn-bdr)' : 'var(--green-bdr)';
  const textColor = exceeded ? 'var(--red-dk)' : projectedRatio >= 0.8 ? 'var(--amber-dk)' : 'var(--green-dk)';

  const usedPct = quota.max > 0 ? Math.min((used / quota.max) * 100, 100) : 0;

  return (
    <div style={{
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: '10px 14px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icone nom="local_hospital" style={{ fontSize: 16, color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: textColor }}>Premier Soin</span>
          {dejaUtilise && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--navy)',
              padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3,
            }}>
              DÉJÀ UTILISÉ
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: textColor, fontWeight: 600 }}>
          {formatAriary(projected)} / {formatAriary(quota.max)}
        </span>
      </div>

      {/* Barre de progression à 2 segments : déjà consommé + draft en cours */}
      <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bdr)', overflow: 'hidden', marginBottom: 4, display: 'flex' }}>
        <div style={{
          width: `${usedPct}%`, height: '100%',
          background: 'var(--navy)', transition: 'width 0.3s ease',
        }} />
        {draftPremierSoinTotal > 0 && (
          <div style={{
            width: `${Math.min(projectedPct - usedPct, 100 - usedPct)}%`, height: '100%',
            background: exceeded ? 'var(--red)' : 'var(--blue-ps)',
            transition: 'width 0.3s ease', opacity: 0.6,
          }} />
        )}
      </div>

      {/* Détail des valeurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
        {used > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--txt2)' }}>Déjà utilisé</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--navy)' }}>{formatAriary(used)}</span>
          </div>
        )}
        {draftPremierSoinTotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--txt2)' }}>Médicaments actuels</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--blue-ps)' }}>{formatAriary(draftPremierSoinTotal)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: textColor, fontWeight: 600 }}>
            {exceeded ? 'Quota dépassé !' : `Reste : ${formatAriary(remaining)}`}
          </span>
          {exceeded && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-lt)', padding: '2px 6px', borderRadius: 4 }}>
              DÉPASSÉ
            </span>
          )}
        </div>
        {exceeded && (
          <div style={{ fontSize: 10, color: 'var(--red-dk)', marginTop: 4, fontStyle: 'italic' }}>
            Retirez des médicaments du Premier Soin pour revenir sous le plafond.
          </div>
        )}
        {dejaUtilise && (
          <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2, fontStyle: 'italic' }}>
            Usage unique par séjour
          </div>
        )}
      </div>
    </div>
  );
}
