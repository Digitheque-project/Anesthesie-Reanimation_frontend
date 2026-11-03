'use client';

import { useState } from 'react';
import { ArretKind } from '@/features/prescription/lib/api';
import { Icone } from '@/components/ui/Icone';

export interface ArretCible {
  kind: ArretKind;
  id: string;
  label: string;
}

interface Props {
  cible: ArretCible | null;
  onClose: () => void;
  onConfirm: (motif: string) => Promise<void>;
  busy: boolean;
}

export default function ArretPlanningDialog({ cible, onClose, onConfirm, busy }: Props) {
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');

  if (!cible) return null;

  return (
    <>
      <div
        onClick={busy ? undefined : onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1400, animation: 'fadeIn 0.2s ease',
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 440, maxWidth: '92vw', background: 'var(--card, #fff)',
        borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        zIndex: 1410, overflow: 'hidden', animation: 'slideUp 0.25s ease',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--bdr, #E5E7EB)',
          background: 'linear-gradient(135deg, var(--red, #E74C3C), #C0392B)', color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icone nom="stop_circle" style={{ fontSize: 22 }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Arrêter la prescription</h3>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>{cible.label}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--txt2, #4B5563)', lineHeight: 1.6 }}>
            Confirmez l’arrêt de cette prescription. Le soin ou traitement associé sera stoppé immédiatement,
            et l’identité de la personne qui réalise l’arrêt sera conservée. Les actes déjà effectués restent dans l’historique.
          </p>
          <label className="lbl">Motif</label>
          <textarea
            value={motif}
            onChange={e => { setMotif(e.target.value); if (error) setError(''); }}
            placeholder="Ex : Relais par voie orale, arrêt du traitement..."
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: error ? '1.5px solid var(--red, #E74C3C)' : '1.5px solid var(--bdr, #E5E7EB)',
              fontSize: 12, background: 'var(--inp, #F3F4F6)', outline: 'none', resize: 'vertical',
              boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
          {error && <div style={{ fontSize: 11, color: 'var(--red, #E74C3C)', marginTop: 3 }}>{error}</div>}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bdr, #E5E7EB)', background: 'var(--inp, #F3F4F6)', display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 10, border: '1.5px solid var(--bdr, #E5E7EB)',
              background: 'var(--card, #fff)', color: 'var(--txt2, #4B5563)', fontSize: 13, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}>
            Annuler
          </button>
          <button
            onClick={async () => { setError(''); await onConfirm(motif); }}
            disabled={busy}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none',
              background: busy ? 'var(--txt3, #9CA3AF)' : 'linear-gradient(135deg, var(--red, #E74C3C), #C0392B)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {busy ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Arrêt...
              </>
            ) : (
              <>
                <Icone nom="stop_circle" style={{ fontSize: 17 }} />
                Confirmer l’arrêt
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
