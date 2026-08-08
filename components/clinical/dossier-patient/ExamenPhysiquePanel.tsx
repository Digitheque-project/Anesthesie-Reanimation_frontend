'use client';

import React from 'react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type ExamenPhysiqueData = {
  fc: string;
  fr: string;
  taSystolique: string;
  taDiastolique: string;
  spo2: string;
  temperature: string;
  glycemie: string;
  poids: string;
  taille: string;
  imc: string;
  trc: string;
  pcBebes: string;
  pbBebes: string;
  percentilePoids: string;
};

export function defaultExamenPhysique(): ExamenPhysiqueData {
  return {
    fc: '',
    fr: '',
    taSystolique: '',
    taDiastolique: '',
    spo2: '',
    temperature: '',
    glycemie: '',
    poids: '',
    taille: '',
    imc: '',
    trc: '',
    pcBebes: '',
    pbBebes: '',
    percentilePoids: '',
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

const subBlueTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: ehr.primary,
  letterSpacing: '0.04em',
  marginBottom: 14,
  marginTop: 14,
};

type Props = {
  value: ExamenPhysiqueData;
  onChange: (next: ExamenPhysiqueData) => void;
};

export function ExamenPhysiquePanel({ value, onChange }: Props) {
  const patch = (p: Partial<ExamenPhysiqueData>) => {
    const next = { ...value, ...p };
    // Compute IMC if poids and taille are present
    const pVal = parseFloat(next.poids);
    const tVal = parseFloat(next.taille); // en cm
    if (!isNaN(pVal) && !isNaN(tVal) && tVal > 0) {
      const tM = tVal / 100;
      next.imc = (pVal / (tM * tM)).toFixed(2);
    } else {
      next.imc = '';
    }
    onChange(next);
  };

  return (
    <div>
      <div style={subBlueTitle}>CONSTANTES VITALES ET PARAMÈTRES</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div>
          <label style={labelAbove}>Fréq. cardiaque (bpm)</label>
          <input style={inputBase} type="number" value={value.fc} onChange={e => patch({ fc: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>Fréq. respiratoire (c/min)</label>
          <input style={inputBase} type="number" value={value.fr} onChange={e => patch({ fr: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>TA Systolique (mmHg)</label>
          <input style={inputBase} type="number" value={value.taSystolique} onChange={e => patch({ taSystolique: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>TA Diastolique (mmHg)</label>
          <input style={inputBase} type="number" value={value.taDiastolique} onChange={e => patch({ taDiastolique: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>SPO2 (%)</label>
          <input style={inputBase} type="number" value={value.spo2} onChange={e => patch({ spo2: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>Température (°C)</label>
          <input style={inputBase} type="number" value={value.temperature} onChange={e => patch({ temperature: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>Glycémie capilaire (mmol/l)</label>
          <input style={inputBase} type="number" step="0.1" value={value.glycemie} onChange={e => patch({ glycemie: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>TRC (secondes)</label>
          <input style={inputBase} type="number" value={value.trc} onChange={e => patch({ trc: e.target.value })} />
        </div>
      </div>

      <div style={{ ...subBlueTitle, marginTop: 24 }}>ANTHROPOMÉTRIE</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div>
          <label style={labelAbove}>Poids (kg)</label>
          <input style={inputBase} type="number" step="0.1" value={value.poids} onChange={e => patch({ poids: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>Taille longueur (cm)</label>
          <input style={inputBase} type="number" step="0.1" value={value.taille} onChange={e => patch({ taille: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>IMC</label>
          <input style={{ ...inputBase, backgroundColor: '#f1f5f9', fontWeight: 600 }} readOnly value={value.imc} placeholder="Calculé auto" />
        </div>
        <div>
          <label style={labelAbove}>Percentile poids</label>
          <input style={inputBase} type="text" value={value.percentilePoids} onChange={e => patch({ percentilePoids: e.target.value })} placeholder="Ex: 25e — AGA" />
        </div>
      </div>

      <div style={{ ...subBlueTitle, marginTop: 24 }}>SPÉCIFIQUE BÉBÉS</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div>
          <label style={labelAbove}>Périmètre crânien (cm)</label>
          <input style={inputBase} type="number" step="0.1" value={value.pcBebes} onChange={e => patch({ pcBebes: e.target.value })} />
        </div>
        <div>
          <label style={labelAbove}>Périmètre brachial (cm)</label>
          <input style={inputBase} type="number" step="0.1" value={value.pbBebes} onChange={e => patch({ pbBebes: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export function examenPhysiqueHasContent(v: ExamenPhysiqueData): boolean {
  return Object.values(v).some(val => val !== '');
}
