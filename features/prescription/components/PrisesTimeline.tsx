'use client';

import { useState } from 'react';
import { useTimeline } from '@/features/prescription/hooks/useTimeline';
import { Icone } from '@/components/ui/Icone';

interface Props {
  patientId: string;
  compact?: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'Maintenant';
  const min = Math.floor(diff / 60000);
  if (min < 60) return `dans ${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `dans ${h}h${m}` : `dans ${h}h`;
}

const TYPE_CONFIG = {
  medicament:    { icon: 'medication', color: 'var(--navy)',       bg: 'var(--navy-lt)',    label: 'Médicament' },
  'non-medicale':{ icon: 'healing',    color: 'var(--purple)',     bg: 'var(--purple-lt, #f3e8ff)', label: 'Soin non-médical' },
  surveillance:  { icon: 'monitor_heart', color: 'var(--green-success)', bg: 'var(--green-lt, #ecfdf5)', label: 'Surveillance' },
} as const;

export default function PrisesTimeline({ patientId, compact = false }: Props) {
  const { items, loading, confirmPrise, refusePrise } = useTimeline(patientId);
  const [refuseId, setRefuseId] = useState<string | null>(null);

  if (loading && items.length === 0) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
        <Icone nom="hourglass_empty" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
        Chargement de la timeline...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: compact ? 16 : 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
        <Icone nom="event_available" style={{ fontSize: compact ? 28 : 36, display: 'block', marginBottom: 8 }} />
        Aucune prise prévue dans les prochaines heures
      </div>
    );
  }

  const now = Date.now();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      <style jsx global>{`
        .timeline-line { position: relative; }
        .timeline-line::before {
          content: '';
          position: absolute;
          left: 17px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--bdr);
          z-index: 0;
        }
        .timeline-dot {
          position: relative;
          z-index: 1;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all .2s;
        }
        .timeline-dot.glow {
          box-shadow: 0 0 0 4px rgba(0,102,204,.15);
        }
        .prise-action-btn {
          border: none;
          cursor: pointer;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all .15s;
        }
        .prise-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <div className="timeline-line" style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
        {items.map(item => {
          const cfg = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.medicament;
          const isPast = new Date(item.heurePrevue).getTime() < now;
          const isNotifie = item.statut === 'NOTIFIE';

          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: compact ? 'center' : 'flex-start', gap: 10,
              padding: compact ? '6px 0' : '8px 0',
              opacity: isPast ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div className={`timeline-dot ${isNotifie ? 'glow' : ''}`} style={{
                  background: isNotifie ? cfg.color : 'var(--bdr)',
                  border: `2.5px solid ${isNotifie ? cfg.color : 'var(--bdr)'}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Icone nom={cfg.icon} style={{ fontSize: 14, color: cfg.color }} />
                    <span style={{
                      fontSize: compact ? 12 : 13, fontWeight: 600, color: 'var(--txt)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {item.label}
                    </span>
                    {item.detail && (
                      <span style={{
                        fontSize: compact ? 10 : 11, color: 'var(--txt2)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.detail}
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {formatTime(item.heurePrevue)} — {timeUntil(item.heurePrevue)}
                      {isNotifie && ' — En attente de confirmation'}
                    </div>
                  )}
                </div>
              </div>

              {!compact && isNotifie && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    className="prise-action-btn"
                    style={{ background: 'var(--green-success)', color: '#fff' }}
                    onClick={() => confirmPrise(item.id)}
                    title="Confirmer la prise"
                  >
                    <Icone nom="check" style={{ fontSize: 14 }} />
                    OK
                  </button>
                  <button
                    className="prise-action-btn"
                    style={{ background: 'var(--red)', color: '#fff' }}
                    onClick={() => setRefuseId(refuseId === item.id ? null : item.id)}
                    title="Refuser la prise"
                  >
                    <Icone nom="close" style={{ fontSize: 14 }} />
                  </button>
                </div>
              )}

              {!compact && isNotifie && refuseId === item.id && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 10,
                  background: 'var(--card)', border: '1px solid var(--bdr)',
                  borderRadius: 8, padding: 8, boxShadow: '0 4px 16px rgba(0,0,0,.1)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Motif de refus..."
                    style={{ flex: 1, fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--bdr)' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        refusePrise(item.id, (e.target as HTMLInputElement).value || undefined);
                        setRefuseId(null);
                      }
                      if (e.key === 'Escape') setRefuseId(null);
                    }}
                  />
                  <button
                    className="prise-action-btn"
                    style={{ background: 'var(--red)', color: '#fff' }}
                    onClick={e => {
                      const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                      refusePrise(item.id, input?.value || undefined);
                      setRefuseId(null);
                    }}
                  >
                    <Icone nom="send" style={{ fontSize: 14 }} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
