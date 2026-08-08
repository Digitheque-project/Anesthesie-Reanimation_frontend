'use client';

import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type Traitement = {
  id: string;
  medicament: string;
  voie: string;
  posologie: string;
  depuis: string;
};

export function defaultTraitementEnCours(): Traitement[] {
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
  value: Traitement[];
  onChange: (next: Traitement[]) => void;
};

export function TraitementEnCoursPanel({ value, onChange }: Props) {
  const addTraitement = () => {
    onChange([
      ...value,
      { id: `t-${Date.now()}`, medicament: '', voie: '', posologie: '', depuis: '' }
    ]);
  };

  const updateTraitement = (id: string, field: keyof Traitement, val: string) => {
    onChange(value.map(t => t.id === id ? { ...t, [field]: val } : t));
  };

  const removeTraitement = (id: string) => {
    onChange(value.filter(t => t.id !== id));
  };

  return (
    <div>
      <div style={{
        marginBottom: 12,
        padding: '8px 12px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: 6,
        fontSize: 12,
        color: '#b45309'
      }}>
        ⚠ Toujours noter la posologie en mg/kg/j pour l'enfant — vérifier la dose selon le poids actuel
      </div>
      {value.length === 0 ? (
        <p style={{ fontSize: 14, color: ehr.textMuted, marginBottom: 16 }}>Aucun traitement en cours saisi.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {value.map((t, idx) => (
            <div key={t.id} className="flex flex-col md:flex-row gap-3 items-stretch md:items-start bg-[#fafbfc] p-3 rounded-lg border" style={{ borderColor: ehr.border }}>
              <div className="w-full md:flex-[2]">
                <label style={labelAbove}>Médicament</label>
                <input style={inputBase} value={t.medicament} onChange={e => updateTraitement(t.id, 'medicament', e.target.value)} placeholder="Nom du médicament" />
              </div>
              <div className="w-full md:flex-1">
                <label style={labelAbove}>Voie</label>
                <select style={inputBase} value={t.voie} onChange={e => updateTraitement(t.id, 'voie', e.target.value)}>
                  <option value="">Sélectionner</option>
                  <option value="Orale">Orale</option>
                  <option value="IV">IV</option>
                  <option value="IM">IM</option>
                  <option value="SC">SC</option>
                  <option value="Inhalée">Inhalée</option>
                  <option value="Rectale">Rectale</option>
                  <option value="Topique">Topique</option>
                </select>
              </div>
              <div className="w-full md:flex-[1.5]">
                <label style={labelAbove}>Posologie mg/kg/j</label>
                <input style={inputBase} value={t.posologie} onChange={e => updateTraitement(t.id, 'posologie', e.target.value)} placeholder="Ex: 80 mg/kg/j" />
              </div>
              <div className="w-full md:flex-1">
                <label style={labelAbove}>Depuis</label>
                <input style={inputBase} value={t.depuis} onChange={e => updateTraitement(t.id, 'depuis', e.target.value)} placeholder="J1, 3j…" />
              </div>
              <button 
                type="button" 
                onClick={() => removeTraitement(t.id)}
                style={{ background: 'none', border: 'none', color: ehr.danger, cursor: 'pointer', padding: 8 }}
                className="self-end md:self-auto md:mt-6 shrink-0"
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
        onClick={addTraitement}
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
        Ajouter un traitement
      </button>
    </div>
  );
}

export function traitementHasContent(v: Traitement[]): boolean {
  return v.length > 0 && v.some(t => t.medicament.trim() !== '');
}
