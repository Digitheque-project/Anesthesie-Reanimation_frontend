'use client';

import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

interface Props {
  open: boolean;
  saving: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ObservationConfirmModal({ open, saving, error, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={saving ? undefined : onCancel}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-7 pb-6 pt-8">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: '#FEF3C7' }}
          >
            <ShieldAlert className="h-6 w-6" style={{ color: '#B45309' }} strokeWidth={2} />
          </div>
          <h2 className="text-[18px] font-extrabold" style={{ color: ehr.text }}>
            Enregistrer l&apos;observation médicale ?
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-slate-500">
            Une fois enregistrée, cette observation sera <strong>définitive</strong> : elle ne pourra
            plus être modifiée, ni par vous, ni par un autre médecin. Merci de vérifier que toutes les
            informations saisies dans les différentes sections sont correctes avant de confirmer.
          </p>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] font-semibold text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 rounded-b-3xl bg-[#F8FAFC] px-7 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 text-[13px] font-bold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-40"
          >
            Revenir à la saisie
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: ehr.primary }}
          >
            {saving ? 'Enregistrement…' : "J'ai vérifié, enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
