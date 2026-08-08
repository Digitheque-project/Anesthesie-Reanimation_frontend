'use client';

import React from 'react';

export type ConfirmationModalTone = 'primary' | 'danger' | 'success';

export interface ConfirmationModalProps {
  /** Contrôle l'affichage de la modale (appelée depuis le composant parent). */
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationModalTone;
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES: Record<ConfirmationModalTone, { color: string; icon: string }> = {
  primary: { color: 'var(--navy, #1e3a5f)', icon: 'help' },
  danger: { color: '#dc2626', icon: 'warning' },
  success: { color: '#16a34a', icon: 'check_circle' },
};

/**
 * Modale de confirmation générique et réutilisable.
 *
 * Elle est pilotée entièrement par ses props : le composant parent l'APPELLE
 * (via `open` / `onConfirm` / `onCancel`) au lieu de coder le markup de la
 * modale en dur au milieu de sa logique.
 *
 * Toutes les futures modales de la suite prescription doivent être placées
 * dans ce dossier `components/modals`.
 */
export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'primary',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!open) return null;

  const t = TONES[tone];
  const headIcon = icon || t.icon;

  return (
    <div
      onClick={loading ? undefined : onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200, padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '24px 24px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <span className="ms" style={{ fontSize: 28, color: t.color }}>{headIcon}</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--txt, #1f2937)' }}>{title}</h3>
          {message && (
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--txt2, #6b7280)' }}>{message}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px 24px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--bdr, #e5e7eb)', background: '#fff', color: 'var(--txt2, #6b7280)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none', background: t.color, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {loading && (
              <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'psx-modal-spin 0.8s linear infinite' }} />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes psx-modal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
