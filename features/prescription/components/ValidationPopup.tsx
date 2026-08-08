'use client';

import { useState } from 'react';
import { PanierItem, usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { formatPayloadSummary } from './formatPayloadSummary';

const TYPE_ICONS: Record<string, string> = {
  medicale: 'medication', 'non-medicale': 'self_care', surveillance: 'monitor_heart',
  transfusion: 'bloodtype', bloc: 'medical_services', labo: 'science',
  imagerie: 'radiology', anapath: 'biotech', eeg: 'neurology',
  kine: 'exercise', endoscopie: 'visibility', dialyse: 'water_full',
};

const TYPE_COLORS: Record<string, string> = {
  medicale: '#3b82f6', 'non-medicale': '#10b981', surveillance: '#f59e0b',
  transfusion: '#ef4444', bloc: '#8b5cf6', labo: '#06b6d4',
  imagerie: '#ec4899', anapath: '#14b8a6', eeg: '#f97316',
  kine: '#22c55e', endoscopie: '#6366f1', dialyse: '#0ea5e9',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddNew: () => void;
  onSendAll: () => void;
  isSending: boolean;
}

export default function ValidationPopup({ isOpen, onClose, onAddNew, onSendAll, isSending }: Props) {
  const { panier, removeFromPanier } = usePrescriptionPanier();
  const [detailItem, setDetailItem] = useState<PanierItem | null>(null);

  if (!isOpen) return null;

  const draftItems = panier.items.filter(i => i.status === 'draft');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1200, animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Popup */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 520, maxWidth: '92vw', maxHeight: '85vh', background: '#fff',
        borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        zIndex: 1210, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--bdr, #e5e7eb)',
          background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)', color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className="ms" style={{ fontSize: 24 }}>check_circle</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Prescription validée</h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
            {draftItems.length} prescription{draftItems.length > 1 ? 's' : ''} en attente d&apos;envoi
          </p>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {draftItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--txt3, #9ca3af)' }}>
              <span className="ms" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }}>inbox</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aucune prescription en attente</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draftItems.map(item => {
                const color = TYPE_COLORS[item.type] || '#6b7280';
                return (
                  <div
                    key={item.localId}
                    onClick={() => setDetailItem(item)}
                    style={{
                      position: 'relative',
                      background: '#fff', border: `1.5px solid ${color}25`,
                      borderRadius: 12, padding: '12px 14px',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: `${color}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span className="ms" style={{ fontSize: 18, color }}>{TYPE_ICONS[item.type] || 'description'}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt, #1f2937)', marginBottom: 2 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--txt2, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.summary}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeFromPanier(item.localId); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                          borderRadius: 6, color: '#9ca3af', transition: 'color 0.15s', flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                      >
                        <span className="ms" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bdr, #e5e7eb)', background: '#f9fafb', display: 'flex', gap: 10 }}>
          <button
            onClick={() => { onAddNew(); onClose(); }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--navy, #1e3a5f)',
              background: '#fff', color: 'var(--navy, #1e3a5f)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span className="ms" style={{ fontSize: 18 }}>add</span>
            Ajouter une autre
          </button>
          <button
            onClick={async () => { await onSendAll(); onClose(); }}
            disabled={isSending || draftItems.length === 0}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
              background: isSending ? '#d1d5db' : 'linear-gradient(135deg, #1e3a5f, #2d5a8e)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: isSending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isSending ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Envoi...
              </>
            ) : (
              <>
                <span className="ms" style={{ fontSize: 18 }}>send</span>
                Envoyer ({draftItems.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div
          onClick={() => setDetailItem(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: 500, maxWidth: '92vw',
              maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Detail header */}
            <div style={{
              padding: '16px 20px', background: `${TYPE_COLORS[detailItem.type] || '#6b7280'}10`,
              borderBottom: '1px solid var(--bdr, #e5e7eb)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="ms" style={{ fontSize: 22, color: TYPE_COLORS[detailItem.type] || '#6b7280' }}>
                  {TYPE_ICONS[detailItem.type] || 'description'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{detailItem.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2, #6b7280)' }}>{detailItem.summary}</div>
                </div>
                <button
                  onClick={() => setDetailItem(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--txt3, #9ca3af)' }}
                >
                  <span className="ms" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              {/* Patient info */}
              {detailItem.payload?.patientNom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--txt3, #9ca3af)' }}>person</span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt, #1f2937)' }}>
                      {detailItem.payload.patientPrenom} {detailItem.payload.patientNom}
                    </span>
                    {detailItem.payload.patientAge != null && (
                      <span style={{ fontSize: 11, color: 'var(--txt2, #6b7280)', marginLeft: 8 }}>
                        {detailItem.payload.patientAge} ans
                      </span>
                    )}
                    {detailItem.payload.patientSexe && (
                      <span style={{ fontSize: 11, color: 'var(--txt2, #6b7280)', marginLeft: 4 }}>
                        ({detailItem.payload.patientSexe === 'M' ? 'Masculin' : 'Féminin'})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Prescripteur info */}
              {detailItem.payload?.prescripteurNom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--txt3, #9ca3af)' }}>stethoscope</span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt, #1f2937)' }}>
                      Dr {detailItem.payload.prescripteurPrenom} {detailItem.payload.prescripteurNom}
                    </span>
                    {detailItem.payload.prescripteurService && (
                      <span style={{ fontSize: 11, color: 'var(--txt2, #6b7280)', marginLeft: 8 }}>
                        {detailItem.payload.prescripteurService}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Detail content */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '60vh', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', color: 'var(--txt, #1f2937)' }}>
              {formatPayloadSummary(detailItem)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
