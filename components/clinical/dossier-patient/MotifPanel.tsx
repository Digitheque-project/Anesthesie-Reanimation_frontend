'use client';

import React from 'react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type MotifData = {
  motifPrincipal: string;
  modeEntree: string;
  delaiEvolution: string;
  degreUrgence: string;
  signalement: string;
};

export function defaultMotif(): MotifData {
  return {
    motifPrincipal: '',
    modeEntree: '',
    delaiEvolution: '',
    degreUrgence: '',
    signalement: '',
  };
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${ehr.border}`,
  borderRadius: 6,
  backgroundColor: ehr.inputBg,
  color: ehr.text,
  boxSizing: 'border-box',
};

const labelAbove: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
  display: 'block',
};

type Props = {
  value: MotifData | string;
  onChange: (next: MotifData) => void;
};

export function MotifPanel({ value, onChange }: Props) {
  // Migration path: if value is a string from old data, convert to MotifData
  const data: MotifData = typeof value === 'string' ? { ...defaultMotif(), motifPrincipal: value } : value || defaultMotif();

  const patch = (p: Partial<MotifData>) => onChange({ ...data, ...p });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label style={labelAbove}>Motif principal <span style={{ color: ehr.danger }}>*</span></label>
          <input
            type="text"
            style={inputBase}
            placeholder="Ex: détresse respiratoire néonatale, fière..."
            value={data.motifPrincipal}
            onChange={e => patch({ motifPrincipal: e.target.value })}
          />
        </div>
        <div>
          <label style={labelAbove}>Mode d'entrée</label>
          <select style={inputBase} value={data.modeEntree} onChange={e => patch({ modeEntree: e.target.value })}>
            <option value="">— Sélectionner</option>
            <option value="Naissance en maternité">Naissance en maternité</option>
            <option value="Transfert maternité → néonatologie">Transfert maternité → néonatologie</option>
            <option value="Transfert SMUR néonatal">Transfert SMUR néonatal</option>
            <option value="Urgences pédiatriques">Urgences pédiatriques</option>
            <option value="Consultation programmée">Consultation programmée</option>
            <option value="Hospitalisation programmée">Hospitalisation programmée</option>
            <option value="Transfert inter-établissement">Transfert inter-établissement</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label style={labelAbove}>Délai d'évolution</label>
          <input
            type="text"
            style={inputBase}
            placeholder="Ex: depuis la naissance, depuis 6h..."
            value={data.delaiEvolution}
            onChange={e => patch({ delaiEvolution: e.target.value })}
          />
        </div>
        <div>
          <label style={labelAbove}>Degré d'urgence</label>
          <select style={inputBase} value={data.degreUrgence} onChange={e => patch({ degreUrgence: e.target.value })}>
            <option value="">— Sélectionner</option>
            <option value="1">P1 — Extrême urgence (SAMU)</option>
            <option value="2">P2 — Urgence vitale immédiate</option>
            <option value="3">P3 — Urgence relative</option>
            <option value="4">P4 — Non urgent</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Signalement / Tutelle</label>
          <select style={inputBase} value={data.signalement} onChange={e => patch({ signalement: e.target.value })}>
            <option value="">— Sans particularité</option>
            <option value="Enfant placé — ASE">Enfant placé — ASE</option>
            <option value="Tuteur légal désigné">Tuteur légal désigné</option>
            <option value="Signalement en cours">Signalement en cours</option>
            <option value="Ordonnance de placement provisoire">Ordonnance de placement provisoire</option>
          </select>
        </div>
      </div>
      {data.degreUrgence === '1' && (
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          backgroundColor: '#fdf0ee', // var(--red-light)
          border: '1px solid #e8c4bc',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: ehr.danger }}></div>
          <div style={{ fontSize: 11, fontWeight: 700, color: ehr.danger, textTransform: 'uppercase' }}>
            PATIENT P1 — Prise en charge immédiate. Notifier l'équipe pédiatrique / néonatale.
          </div>
        </div>
      )}
    </div>
  );
}

export function motifHasContent(v: MotifData | string): boolean {
  if (typeof v === 'string') return v.trim().length > 0;
  return v.motifPrincipal !== '' || v.modeEntree !== '' || v.delaiEvolution !== '' || v.degreUrgence !== '' || v.signalement !== '';
}
