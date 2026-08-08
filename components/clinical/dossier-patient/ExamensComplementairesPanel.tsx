'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type ExamenComplementaire = {
  id: string;
  examen: string;
  resultat: string;
};

export function defaultExamensComplementaires(): ExamenComplementaire[] {
  return [];
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
  value: ExamenComplementaire[];
  onChange: (next: ExamenComplementaire[]) => void;
};

export function ExamensComplementairesPanel({ value, onChange }: Props) {
  const addExamen = () => {
    onChange([
      ...value,
      { id: `ec-${Date.now()}`, examen: '', resultat: '' }
    ]);
  };

  const updateExamen = (id: string, field: keyof ExamenComplementaire, val: string) => {
    onChange(value.map(t => t.id === id ? { ...t, [field]: val } : t));
  };

  const removeExamen = (id: string) => {
    onChange(value.filter(t => t.id !== id));
  };

  return (
    <div>
      {value.length === 0 ? (
        <p style={{ fontSize: 14, color: ehr.textMuted, marginBottom: 16 }}>Aucun examen complémentaire saisi.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {value.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: '#fafbfc', padding: 12, borderRadius: 8, border: `1px solid ${ehr.border}` }}>
              <div style={{ flex: 1 }}>
                <label style={labelAbove}>Examen</label>
                <input style={inputBase} value={t.examen} onChange={e => updateExamen(t.id, 'examen', e.target.value)} placeholder="Ex: NFS, Scanner..." />
              </div>
              <div style={{ flex: 2 }}>
                <label style={labelAbove}>Résultat</label>
                <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 40 }} value={t.resultat} onChange={e => updateExamen(t.id, 'resultat', e.target.value)} placeholder="Résultats de l'examen..." />
              </div>
              <button 
                type="button" 
                onClick={() => removeExamen(t.id)}
                style={{ background: 'none', border: 'none', color: ehr.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
                title="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addExamen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '10px 16px',
          backgroundColor: ehr.addCategoryBg,
          border: `1px dashed ${ehr.border}`,
          borderRadius: 8,
          color: ehr.textMuted,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Plus size={16} color={ehr.primary} />
        Ajouter un examen
      </button>
    </div>
  );
}

export function examensComplementairesHasContent(v: ExamenComplementaire[]): boolean {
  return v.length > 0 && v.some(t => t.examen.trim() !== '' || t.resultat.trim() !== '');
}
