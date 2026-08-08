'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type AppareilFields = {
  inspection: string;
  palpation: string;
  percussion: string;
  auscultation: string;
  autre: string;
};

export type NeuroFields = {
  tonus: string;
  motricite: string;
  reflexeOsteo: string;
  sensibilite: string;
  reflexePrimitif: string;
  coordination: string;
  nerfsCraniens: string;
  autre: string;
};

export type ExamenAppareilData = {
  abdo: AppareilFields;
  cardio: AppareilFields;
  respiratoire: AppareilFields;
  urinaire: AppareilFields;
  gynecologique: AppareilFields;
  orl: AppareilFields;
  neurogenitale: AppareilFields;
  neurologique: NeuroFields;
  dermatologie: { inspection: string; palpation: string };
  membreArticulation: string;
};

const defaultAppareilFields = () => ({ inspection: '', palpation: '', percussion: '', auscultation: '', autre: '' });

export function defaultExamenAppareil(): ExamenAppareilData {
  return {
    abdo: defaultAppareilFields(),
    cardio: defaultAppareilFields(),
    respiratoire: defaultAppareilFields(),
    urinaire: defaultAppareilFields(),
    gynecologique: defaultAppareilFields(),
    orl: defaultAppareilFields(),
    neurogenitale: defaultAppareilFields(),
    neurologique: { tonus: '', motricite: '', reflexeOsteo: '', sensibilite: '', reflexePrimitif: '', coordination: '', nerfsCraniens: '', autre: '' },
    dermatologie: { inspection: '', palpation: '' },
    membreArticulation: '',
  };
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
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

function Accordion({ title, children, hasContent }: { title: string, children: React.ReactNode, hasContent: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${ehr.border}`, borderRadius: 8, marginBottom: 10, background: ehr.white }}>
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fafbfc', border: 'none', cursor: 'pointer', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: hasContent ? ehr.primary : ehr.text }}>{title}</span>
          {hasContent && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ehr.primary }}></span>}
        </div>
        <span style={{ color: ehr.textMuted }}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {open && (
        <div style={{ padding: 16, borderTop: `1px solid ${ehr.borderSoft}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

type Props = {
  value: ExamenAppareilData;
  onChange: (next: ExamenAppareilData) => void;
};

export function ExamenAppareilPanel({ value, onChange }: Props) {
  
  const updateAppareil = (key: keyof ExamenAppareilData, field: keyof AppareilFields, val: string) => {
    onChange({ ...value, [key]: { ...(value[key] as any), [field]: val } });
  };

  const updateNeuro = (field: keyof NeuroFields, val: string) => {
    onChange({ ...value, neurologique: { ...value.neurologique, [field]: val } });
  };

  const checkAppareilContent = (key: keyof ExamenAppareilData) => {
    const obj = value[key] as any;
    return Object.values(obj).some(v => typeof v === 'string' && v.trim() !== '');
  };

  const renderAppareil = (key: keyof ExamenAppareilData, label: string) => (
    <Accordion title={label} hasContent={checkAppareilContent(key)}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelAbove}>Inspection</label>
          <input style={inputBase} value={(value[key] as any).inspection} onChange={e => updateAppareil(key, 'inspection', e.target.value)} />
        </div>
        <div>
          <label style={labelAbove}>Palpation</label>
          <input style={inputBase} value={(value[key] as any).palpation} onChange={e => updateAppareil(key, 'palpation', e.target.value)} />
        </div>
        <div>
          <label style={labelAbove}>Percussions</label>
          <input style={inputBase} value={(value[key] as any).percussion} onChange={e => updateAppareil(key, 'percussion', e.target.value)} />
        </div>
        <div>
          <label style={labelAbove}>Auscultation</label>
          <input style={inputBase} value={(value[key] as any).auscultation} onChange={e => updateAppareil(key, 'auscultation', e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={labelAbove}>Autre spécificité</label>
        <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 60 }} value={(value[key] as any).autre} onChange={e => updateAppareil(key, 'autre', e.target.value)} />
      </div>
    </Accordion>
  );

  return (
    <div>
      {renderAppareil('abdo', 'Abdomen')}
      {renderAppareil('cardio', 'Cardiovasculaire')}
      {renderAppareil('respiratoire', 'Respiratoire')}
      {renderAppareil('urinaire', 'Urinaire')}
      {renderAppareil('gynecologique', 'Gynécologique')}
      {renderAppareil('orl', 'ORL')}
      {renderAppareil('neurogenitale', 'Urogénital')}

      <Accordion title="Neurologique" hasContent={checkAppareilContent('neurologique')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelAbove}>Tonus musculaire</label>
            <input style={inputBase} value={value.neurologique.tonus} onChange={e => updateNeuro('tonus', e.target.value)} />
          </div>
          <div>
            <label style={labelAbove}>Motricité</label>
            <input style={inputBase} value={value.neurologique.motricite} onChange={e => updateNeuro('motricite', e.target.value)} />
          </div>
          <div>
            <label style={labelAbove}>Réflexe ostéo-tendineux</label>
            <input style={inputBase} value={value.neurologique.reflexeOsteo} onChange={e => updateNeuro('reflexeOsteo', e.target.value)} />
          </div>
          <div>
            <label style={labelAbove}>Sensibilité</label>
            <input style={inputBase} value={value.neurologique.sensibilite} onChange={e => updateNeuro('sensibilite', e.target.value)} />
          </div>
          <div>
            <label style={labelAbove}>Réflexe primitif (néonatale/nourrissant)</label>
            <input style={inputBase} value={value.neurologique.reflexePrimitif} onChange={e => updateNeuro('reflexePrimitif', e.target.value)} />
          </div>
          <div>
            <label style={labelAbove}>Coordination et équilibre</label>
            <input style={inputBase} value={value.neurologique.coordination} onChange={e => updateNeuro('coordination', e.target.value)} />
          </div>
          <div>
            <label style={labelAbove}>Nerfs crâniens</label>
            <input style={inputBase} value={value.neurologique.nerfsCraniens} onChange={e => updateNeuro('nerfsCraniens', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelAbove}>Autre à préciser</label>
          <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 60 }} value={value.neurologique.autre} onChange={e => updateNeuro('autre', e.target.value)} />
        </div>
      </Accordion>

      <Accordion title="Dermatologie" hasContent={checkAppareilContent('dermatologie')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelAbove}>Inspection</label>
            <input style={inputBase} value={value.dermatologie.inspection} onChange={e => onChange({ ...value, dermatologie: { ...value.dermatologie, inspection: e.target.value } })} />
          </div>
          <div>
            <label style={labelAbove}>Palpation</label>
            <input style={inputBase} value={value.dermatologie.palpation} onChange={e => onChange({ ...value, dermatologie: { ...value.dermatologie, palpation: e.target.value } })} />
          </div>
        </div>
      </Accordion>

      <Accordion title="Membre et articulation" hasContent={value.membreArticulation.trim() !== ''}>
        <div>
          <label style={labelAbove}>Description</label>
          <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 60 }} value={value.membreArticulation} onChange={e => onChange({ ...value, membreArticulation: e.target.value })} />
        </div>
      </Accordion>

    </div>
  );
}

export function examenAppareilHasContent(v: ExamenAppareilData): boolean {
  return Object.values(v).some(group => {
    if (typeof group === 'string') return group.trim() !== '';
    return Object.values(group).some(val => typeof val === 'string' && val.trim() !== '');
  });
}
