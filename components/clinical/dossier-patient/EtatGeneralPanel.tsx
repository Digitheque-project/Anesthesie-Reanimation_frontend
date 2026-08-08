'use client';

import React from 'react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type EtatGeneralData = {
  glasgowYeux: string;
  glasgowVerbal: string;
  glasgowMoteur: string;
  glantyre: string;
};

export function defaultEtatGeneral(): EtatGeneralData {
  return {
    glasgowYeux: '',
    glasgowVerbal: '',
    glasgowMoteur: '',
    glantyre: '',
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
  value: EtatGeneralData;
  onChange: (next: EtatGeneralData) => void;
};

export function EtatGeneralPanel({ value, onChange }: Props) {
  const patch = (p: Partial<EtatGeneralData>) => onChange({ ...value, ...p });

  const glasgowTotal = 
    (parseInt(value.glasgowYeux) || 0) + 
    (parseInt(value.glasgowVerbal) || 0) + 
    (parseInt(value.glasgowMoteur) || 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ ...labelAbove, marginBottom: 0, fontSize: 12, color: ehr.primary }}>Score de Glasgow (recherche)</label>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Total: {glasgowTotal}/15</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelAbove}>Ouverture des yeux (1-4)</label>
            <select style={inputBase} value={value.glasgowYeux} onChange={e => patch({ glasgowYeux: e.target.value })}>
              <option value="">Sélectionner</option>
              <option value="4">4 - Spontanée</option>
              <option value="3">3 - À la demande</option>
              <option value="2">2 - À la douleur</option>
              <option value="1">1 - Aucune</option>
            </select>
          </div>
          <div>
            <label style={labelAbove}>Réponse verbale (1-5)</label>
            <select style={inputBase} value={value.glasgowVerbal} onChange={e => patch({ glasgowVerbal: e.target.value })}>
              <option value="">Sélectionner</option>
              <option value="5">5 - Orientée</option>
              <option value="4">4 - Confuse</option>
              <option value="3">3 - Inappropriée</option>
              <option value="2">2 - Incompréhensible</option>
              <option value="1">1 - Aucune</option>
            </select>
          </div>
          <div>
            <label style={labelAbove}>Réponse motrice (1-6)</label>
            <select style={inputBase} value={value.glasgowMoteur} onChange={e => patch({ glasgowMoteur: e.target.value })}>
              <option value="">Sélectionner</option>
              <option value="6">6 - Obéit à la demande</option>
              <option value="5">5 - Orientée à la douleur</option>
              <option value="4">4 - Évitement</option>
              <option value="3">3 - Décortication</option>
              <option value="2">2 - Décérébration</option>
              <option value="1">1 - Aucune</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={{ ...labelAbove, fontSize: 12, color: ehr.primary }}>Score de Glantyre (0 à 28 jours)</label>
        <textarea
          style={{ ...inputBase, minHeight: 60, resize: 'vertical', marginTop: 8 }}
          value={value.glantyre}
          onChange={e => patch({ glantyre: e.target.value })}
          placeholder="Détails du score de Glantyre..."
        />
      </div>
    </div>
  );
}

export function etatGeneralHasContent(v: EtatGeneralData): boolean {
  return v.glasgowYeux !== '' || v.glasgowVerbal !== '' || v.glasgowMoteur !== '' || v.glantyre.trim() !== '';
}
