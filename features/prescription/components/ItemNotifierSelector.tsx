"use client";
import { useState, useEffect } from 'react';
import { fetchServicesByChu } from '@/features/prescription/lib/api';
import { Icone } from '@/components/ui/Icone';

interface ServiceOption {
  serviceId: string;
  name: string;
  type?: string;
}

interface Props {
  notifier: boolean;
  setNotifier: (v: boolean) => void;
  serviceNotifId: string;
  setServiceNotifId: (v: string) => void;
  chuId?: string;
  defaultServiceId?: string;
  serviceName?: string;
  error?: string;
}

export default function ItemNotifierSelector({
  notifier, setNotifier,
  serviceNotifId, setServiceNotifId,
  chuId, defaultServiceId, serviceName, error,
}: Props) {
  const [services, setServices] = useState<ServiceOption[] | null>(null);

  useEffect(() => {
    if (!chuId || !notifier) return;
    let cancelled = false;
    fetchServicesByChu(chuId, 'CLINIQUE')
      .then((res: unknown) => {
        if (!cancelled && Array.isArray(res)) setServices(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setServices(prev => (prev === null ? [] : prev));
      });
    return () => { cancelled = true; };
  }, [chuId, notifier]);

  const loading = notifier && services === null;
  const serviceList = services ?? [];

  const optionList = serviceList.some(s => s.serviceId === serviceNotifId)
    ? serviceList
    : serviceNotifId
      ? [{ serviceId: serviceNotifId, name: serviceList.find(s => s.serviceId === serviceNotifId)?.name || serviceName || 'Votre service' }, ...serviceList]
      : defaultServiceId
        ? [{ serviceId: defaultServiceId, name: serviceName || 'Votre service' }, ...serviceList]
        : serviceList;

  return (
    <>
      <div
        onClick={() => {
          setNotifier(!notifier);
          if (!notifier && defaultServiceId && !serviceNotifId) {
            setServiceNotifId(defaultServiceId);
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          borderRadius: 10, cursor: 'pointer', border: `2px solid ${notifier ? 'var(--green-success, #16a34a)' : 'var(--navy, #006A8C)'}`,
          background: notifier ? 'var(--green-lt, #ecfdf5)' : 'var(--navy-lt, #EBF5FB)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: notifier ? 'var(--green-success, #16a34a)' : 'var(--navy, #006A8C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icone nom={notifier ? 'notifications_active' : 'notifications_off'} style={{ fontSize: 20, color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: notifier ? 'var(--green-success, #16a34a)' : 'var(--navy, #006A8C)' }}>
            {notifier ? 'Notification infirmier activée' : "Alerter l'infirmier ?"}
          </div>
          <div style={{ fontSize: 11, color: 'var(--txt2)' }}>
            {notifier
              ? 'Les infirmiers du service sélectionné seront notifiés lors de la validation.'
              : "Activez pour envoyer une notification au service d'infirmiers de garde."}
          </div>
        </div>
        <label className="tog" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={notifier} onChange={e => {
            setNotifier(e.target.checked);
            if (e.target.checked && defaultServiceId && !serviceNotifId) {
              setServiceNotifId(defaultServiceId);
            }
          }} />
          <span className="tog-t"></span>
        </label>
      </div>

      {notifier && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, border: `1px solid ${error ? 'var(--red-bdr)' : 'var(--bdr)'}` }}>
          <label className="lbl" style={{ marginBottom: 4, fontSize: 11, fontWeight: 600 }}>Service à notifier <span className="req">*</span></label>
          {loading ? (
            <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Chargement des services...</div>
          ) : (
            <select
              value={serviceNotifId}
              onChange={e => setServiceNotifId(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${error ? 'var(--red-bdr)' : 'var(--bdr)'}`, fontSize: 12, background: 'var(--card)' }}
            >
              <option value="">— Sélectionner —</option>
              {optionList.map(s => (
                <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
              ))}
            </select>
          )}
          {error && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{error}</div>}
        </div>
      )}

      {error && !notifier && (
        <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--red-lt)', borderRadius: 6, border: '1px solid var(--red-bdr)', fontSize: 11, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icone nom="error" style={{ fontSize: 14 }} />
          {error}
        </div>
      )}
    </>
  );
}
