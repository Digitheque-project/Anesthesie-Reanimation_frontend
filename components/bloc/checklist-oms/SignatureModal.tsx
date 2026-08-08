"use client";

import { useState } from "react";

interface SignatureModalProps {
  medecinNom: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SignatureModal({ medecinNom, onConfirm, onCancel }: SignatureModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length === 0) {
      setError("Veuillez saisir votre mot de passe pour signer.");
      return;
    }
    setError("");
    onConfirm();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">verified_user</span>
          </div>
          <div>
            <h2 className="font-headline font-bold text-white text-lg leading-tight">
              Signature électronique
            </h2>
            <p className="text-white/70 text-xs">Confirmation de validation de la check-list</p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Médecin */}
          <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary text-sm shrink-0">
              SR
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{medecinNom}</p>
              <p className="text-[10px] text-outline uppercase tracking-wider">Praticien signataire</p>
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-on-surface-variant leading-relaxed">
            En signant, vous certifiez avoir vérifié l'ensemble des points de la check-list OMS
            et vous en assumez la responsabilité médicale.
          </p>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">
              Mot de passe
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary transition-all"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl text-sm font-semibold hover:bg-surface-container transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Signer & Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
