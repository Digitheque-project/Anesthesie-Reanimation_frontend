'use client';

import React from 'react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type HistoireMaladieData = {
  recit: string;
  facteurs: string;
  traitementsAnt: string;
  fievre: string;
  troublesDigestifs: string;
  troublesRespiratoires: string;
  comportement: string;
  alimentation: string;
  diurese: string;
};

export function defaultHistoireMaladie(): HistoireMaladieData {
  return {
    recit: '',
    facteurs: '',
    traitementsAnt: '',
    fievre: '',
    troublesDigestifs: '',
    troublesRespiratoires: '',
    comportement: '',
    alimentation: '',
    diurese: '',
  };
}

export function parseHistoireMaladieContent(raw: unknown): HistoireMaladieData {
  const d = defaultHistoireMaladie();
  if (typeof raw === 'string') {
    d.recit = raw;
    return d;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const o = raw as Record<string, unknown>;
  return {
    recit: typeof o.recit === 'string' ? o.recit : d.recit,
    facteurs: typeof o.facteurs === 'string' ? o.facteurs : d.facteurs,
    traitementsAnt: typeof o.traitementsAnt === 'string' ? o.traitementsAnt : d.traitementsAnt,
    fievre: typeof o.fievre === 'string' ? o.fievre : d.fievre,
    troublesDigestifs: typeof o.troublesDigestifs === 'string' ? o.troublesDigestifs : d.troublesDigestifs,
    troublesRespiratoires: typeof o.troublesRespiratoires === 'string' ? o.troublesRespiratoires : d.troublesRespiratoires,
    comportement: typeof o.comportement === 'string' ? o.comportement : d.comportement,
    alimentation: typeof o.alimentation === 'string' ? o.alimentation : d.alimentation,
    diurese: typeof o.diurese === 'string' ? o.diurese : d.diurese,
  };
}

export function histoireMaladieHasContent(v: any): boolean {
  if (typeof v === 'string') return v.trim().length > 0;
  if (!v || typeof v !== 'object') return false;
  return Object.values(v).some(val => typeof val === 'string' && val.trim().length > 0);
}

const labelAbove: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
  display: 'block',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${ehr.border}`,
  borderRadius: 6,
  backgroundColor: ehr.inputBg,
  color: ehr.text,
  boxSizing: 'border-box' as const,
};

type Props = {
  value: any;
  onChange: (next: HistoireMaladieData) => void;
};

export function HistoireMaladiePanel({ value, onChange }: Props) {
  const data = React.useMemo(() => parseHistoireMaladieContent(value), [value]);

  const patch = (p: Partial<HistoireMaladieData>) => {
    onChange({ ...data, ...p });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelAbove}>Récit chronologique <span style={{ color: ehr.danger }}>*</span></label>
        <textarea
          style={{ ...inputBase, resize: 'vertical', minHeight: 100 }}
          value={data.recit}
          onChange={e => patch({ recit: e.target.value })}
          placeholder="Décrivez l'histoire de la maladie de façon chronologique : début des symptômes, mode de début (brutal/progressif), facteurs déclenchants ou favorisants (fièvre, contage, exposition, alimentation…), évolution dans le temps, consultations et traitements déjà entrepris pour cet épisode…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label style={labelAbove}>Facteurs déclenchants / favorisants</label>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
            value={data.facteurs}
            onChange={e => patch({ facteurs: e.target.value })}
            placeholder="Fièvre, contage (crèche, fratrie), alimentation, effort, exposition…"
          />
        </div>
        <div>
          <label style={labelAbove}>Traitements déjà administrés avant la consultation</label>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
            value={data.traitementsAnt}
            onChange={e => patch({ traitementsAnt: e.target.value })}
            placeholder="Antipyrétiques (dose, heure), antibiotiques, autres…"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label style={labelAbove}>Fièvre</label>
          <select style={inputBase} value={data.fievre} onChange={e => patch({ fievre: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Non">Non</option>
            <option value="Oui — bien tolérée">Oui — bien tolérée</option>
            <option value="Oui — mal tolérée">Oui — mal tolérée</option>
            <option value="Hyperthermie >40°C">Hyperthermie &gt;40°C</option>
            <option value="Hypothermie <36°C">Hypothermie &lt;36°C</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Troubles digestifs</label>
          <select style={inputBase} value={data.troublesDigestifs} onChange={e => patch({ troublesDigestifs: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Non">Non</option>
            <option value="Vomissements">Vomissements</option>
            <option value="Diarrhée">Diarrhée</option>
            <option value="Constipation">Constipation</option>
            <option value="Refus alimentaire">Refus alimentaire</option>
            <option value="Vomissements en jet">Vomissements en jet</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Troubles respiratoires</label>
          <select style={inputBase} value={data.troublesRespiratoires} onChange={e => patch({ troublesRespiratoires: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Non">Non</option>
            <option value="Toux">Toux</option>
            <option value="Dyspnée">Dyspnée</option>
            <option value="Stridor">Stridor</option>
            <option value="Sibilants">Sibilants</option>
            <option value="Apnée">Apnée</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label style={labelAbove}>Comportement / éveil</label>
          <select style={inputBase} value={data.comportement} onChange={e => patch({ comportement: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Normal">Normal</option>
            <option value="Irritabilité">Irritabilité</option>
            <option value="Hypotonie">Hypotonie</option>
            <option value="Somnolence excessive">Somnolence excessive</option>
            <option value="Inconsolable">Inconsolable</option>
            <option value="Léthargie">Léthargie</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Alimentation / hydratation</label>
          <select style={inputBase} value={data.alimentation} onChange={e => patch({ alimentation: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Normale">Normale</option>
            <option value="Diminuée">Diminuée</option>
            <option value="Refus total">Refus total</option>
            <option value="Succion faible (néonatal)">Succion faible (néonatal)</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Diurèse</label>
          <select style={inputBase} value={data.diurese} onChange={e => patch({ diurese: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Normale">Normale</option>
            <option value="Diminuée">Diminuée</option>
            <option value="Oligurie">Oligurie</option>
            <option value="Anurie">Anurie</option>
            <option value="Polyurie">Polyurie</option>
          </select>
        </div>
      </div>
    </div>
  );
}
