'use client';

import { useState, useEffect } from 'react';
import { getQuotaPremierSoin } from '@/features/prescription/lib/api';
import { formatAriary } from './utils';

interface Props {
  patientId: string;
  refreshKey?: number;
}

export default function PremierSoinQuotaBar({ patientId, refreshKey }: Props) {
  const [quota, setQuota] = useState<{ used: number; remaining: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getQuotaPremierSoin(patientId)
      .then(data => { if (!cancelled) setQuota(data); })
      .catch(() => { if (!cancelled) setError('Impossible de charger le quota'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, refreshKey]);

  if (loading) {
    return (
      <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 16, height: 16, border: '2px solid #93c5fd', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Chargement quota...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="ms" style={{ fontSize: 16 }}>warning</span>
        {error || 'Quota indisponible'}
      </div>
    );
  }

  const ratio = quota.max > 0 ? quota.used / quota.max : 0;
  const pct = Math.min(ratio * 100, 100);
  const exceeded = quota.used >= quota.max;
  const color = exceeded ? '#dc2626' : ratio >= 0.8 ? '#f59e0b' : '#16a34a';
  const bgColor = exceeded ? '#fef2f2' : ratio >= 0.8 ? '#fffbeb' : '#f0fdf4';
  const borderColor = exceeded ? '#fca5a5' : ratio >= 0.8 ? '#fcd34d' : '#86efac';
  const textColor = exceeded ? '#991b1b' : ratio >= 0.8 ? '#92400e' : '#166534';

  return (
    <div style={{
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: '10px 14px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="ms" style={{ fontSize: 16, color }}>local_hospital</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: textColor }}>Premier Soin</span>
        </div>
        <span style={{ fontSize: 11, color: textColor, fontWeight: 600 }}>
          {formatAriary(quota.used)} / {formatAriary(quota.max)}
        </span>
      </div>

      <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden', marginBottom: 4 }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: color, transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: textColor }}>
          {exceeded ? 'Quota dépassé !' : `Reste : ${formatAriary(quota.remaining)}`}
        </span>
        {exceeded && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: 4 }}>
            DÉPASSÉ
          </span>
        )}
      </div>
    </div>
  );
}
