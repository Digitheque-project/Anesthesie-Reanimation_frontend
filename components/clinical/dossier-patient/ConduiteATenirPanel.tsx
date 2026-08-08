'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type TraitementPrescrit = {
  id: string;
  medicament: string;
  posologie: string;
  voie: string;
  duree: string;
};

export type ConduiteATenirData = {
  traitements: TraitementPrescrit[];
  mesuresNonMedic: string;
  surveillance: string;
  alimentation: string;
  orientation: string;
  reevaluation: string;
  education: string;
  signalementStatut: string;
  signalementDetails: string;
};

export function defaultConduiteATenir(): ConduiteATenirData {
  return {
    traitements: [],
    mesuresNonMedic: '',
    surveillance: '',
    alimentation: '',
    orientation: '',
    reevaluation: '',
    education: '',
    signalementStatut: '',
    signalementDetails: '',
  };
}

export function parseConduiteATenirContent(raw: unknown): ConduiteATenirData {
  const d = defaultConduiteATenir();
  if (typeof raw === 'string') {
    d.mesuresNonMedic = raw; // fallback for old text
    return d;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const o = raw as Record<string, unknown>;
  return {
    traitements: Array.isArray(o.traitements) ? o.traitements as TraitementPrescrit[] : d.traitements,
    mesuresNonMedic: typeof o.mesuresNonMedic === 'string' ? o.mesuresNonMedic : d.mesuresNonMedic,
    surveillance: typeof o.surveillance === 'string' ? o.surveillance : d.surveillance,
    alimentation: typeof o.alimentation === 'string' ? o.alimentation : d.alimentation,
    orientation: typeof o.orientation === 'string' ? o.orientation : d.orientation,
    reevaluation: typeof o.reevaluation === 'string' ? o.reevaluation : d.reevaluation,
    education: typeof o.education === 'string' ? o.education : d.education,
    signalementStatut: typeof o.signalementStatut === 'string' ? o.signalementStatut : d.signalementStatut,
    signalementDetails: typeof o.signalementDetails === 'string' ? o.signalementDetails : d.signalementDetails,
  };
}

export function conduiteATenirHasContent(v: any): boolean {
  if (typeof v === 'string') return v.trim().length > 0;
  if (!v || typeof v !== 'object') return false;
  const d = parseConduiteATenirContent(v);
  return d.traitements.length > 0 || d.mesuresNonMedic.trim() !== '' || d.orientation.trim() !== '';
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
  onChange: (next: ConduiteATenirData) => void;
};

export function ConduiteATenirPanel({ value, onChange }: Props) {
  const data = React.useMemo(() => parseConduiteATenirContent(value), [value]);

  const patch = (p: Partial<ConduiteATenirData>) => {
    onChange({ ...data, ...p });
  };

  const addTraitement = () => {
    patch({
      traitements: [
        ...data.traitements,
        { id: `t-${Date.now()}`, medicament: '', posologie: '', voie: '', duree: '' }
      ]
    });
  };

  const updateTraitement = (id: string, field: keyof TraitementPrescrit, val: string) => {
    patch({
      traitements: data.traitements.map(t => t.id === id ? { ...t, [field]: val } : t)
    });
  };

  const removeTraitement = (id: string) => {
    patch({
      traitements: data.traitements.filter(t => t.id !== id)
    });
  };

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 };
  const divider: React.CSSProperties = { height: 1, backgroundColor: ehr.borderSoft, margin: '20px 0' };

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
        ⚠ Posologies pédiatriques toujours en mg/kg/j — vérifier selon poids actuel et âge corrigé pour le prématuré
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {data.traitements.map((t) => (
          <div key={t.id} className="flex flex-col md:flex-row gap-3 items-stretch md:items-start bg-[#fafbfc] p-3 rounded-lg border" style={{ borderColor: ehr.border }}>
            <div className="w-full md:flex-[2]">
              <label style={labelAbove}>Traitement prescrit</label>
              <input style={inputBase} value={t.medicament} onChange={e => updateTraitement(t.id, 'medicament', e.target.value)} placeholder="Ex: Amoxicilline" />
            </div>
            <div className="w-full md:flex-[1.5]">
              <label style={labelAbove}>Posologie mg/kg/j</label>
              <input style={inputBase} value={t.posologie} onChange={e => updateTraitement(t.id, 'posologie', e.target.value)} placeholder="Ex: 80 mg/kg/j en 3 prises" />
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
            <div className="w-full md:flex-1">
              <label style={labelAbove}>Durée</label>
              <input style={inputBase} value={t.duree} onChange={e => updateTraitement(t.id, 'duree', e.target.value)} placeholder="Ex: 7 jours" />
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
          width: '100%'
        }}
      >
        <Plus size={16} color={ehr.primary} />
        Ajouter un traitement
      </button>

      <div style={divider}></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label style={labelAbove}>Mesures non médicamenteuses</label>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 80 }}
            value={data.mesuresNonMedic}
            onChange={e => patch({ mesuresNonMedic: e.target.value })}
            placeholder="Désobstruction rhinopharyngée (DRP), fractionnement des repas, position proclive, humidification, kinésithérapie respiratoire, nutrition entérale…"
          />
        </div>
        <div>
          <label style={labelAbove}>Surveillance à prévoir</label>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 80 }}
            value={data.surveillance}
            onChange={e => patch({ surveillance: e.target.value })}
            placeholder="Paramètres de surveillance : FC, FR, SpO₂, diurèse, poids, TA, ictère, glycémie...&#10;Fréquence : toutes les … heures"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label style={labelAbove}>Alimentation / Nutrition</label>
          <select style={inputBase} value={data.alimentation} onChange={e => patch({ alimentation: e.target.value })}>
            <option value="">— Plan</option>
            <option value="Allaitement maternel à maintenir">Allaitement maternel à maintenir</option>
            <option value="Lait artificiel adapté">Lait artificiel adapté</option>
            <option value="Hydrolysât de protéines (APLV)">Hydrolysât de protéines (APLV)</option>
            <option value="Alimentation entérale continue (SNG/GPE)">Alimentation entérale continue (SNG/GPE)</option>
            <option value="Nutrition parentérale totale">Nutrition parentérale totale</option>
            <option value="Alimentation orale fractionnée">Alimentation orale fractionnée</option>
            <option value="Régime d'éviction (allergies)">Régime d'éviction (allergies)</option>
            <option value="Supplémentation en vitamine D/K">Supplémentation en vitamine D/K</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Orientation</label>
          <select style={inputBase} value={data.orientation} onChange={e => patch({ orientation: e.target.value })}>
            <option value="">— Orientation</option>
            <option value="Retour à domicile avec suivi">Retour à domicile avec suivi</option>
            <option value="Hospitalisation en pédiatrie">Hospitalisation en pédiatrie</option>
            <option value="Hospitalisation en néonatologie">Hospitalisation en néonatologie</option>
            <option value="Soins intensifs pédiatriques (SIPN)">Soins intensifs pédiatriques (SIPN)</option>
            <option value="Réanimation néonatale">Réanimation néonatale</option>
            <option value="Transfert SMUR néonatal">Transfert SMUR néonatal</option>
            <option value="Consultation spécialisée">Consultation spécialisée</option>
          </select>
        </div>
        <div>
          <label style={labelAbove}>Réévaluation prévue</label>
          <input
            style={inputBase}
            type="text"
            value={data.reevaluation}
            onChange={e => patch({ reevaluation: e.target.value })}
            placeholder="Ex: dans 48h, J7, 1 mois, CM à 2 ans…"
          />
        </div>
      </div>

      <div style={divider}></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label style={labelAbove}>Éducation parentale</label>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 110 }}
            value={data.education}
            onChange={e => patch({ education: e.target.value })}
            placeholder="Conseils aux parents : signes d'alarme, conduite à tenir si aggravation, technique d'allaitement, DRP, prévention de la mort subite (position dorsale, pas de partage du lit), vaccination…"
          />
        </div>
        <div>
          <label style={labelAbove}>Signalement / Mesures de protection</label>
          <select style={{ ...inputBase, marginBottom: 8 }} value={data.signalementStatut} onChange={e => patch({ signalementStatut: e.target.value })}>
            <option value="">— Statut</option>
            <option value="Aucune mesure">Aucune mesure</option>
            <option value="Information préoccupante (IP) rédigée">Information préoccupante (IP) rédigée</option>
            <option value="Signalement judiciaire en cours">Signalement judiciaire en cours</option>
            <option value="Mesure éducative — AEMO">Mesure éducative — AEMO</option>
            <option value="Placement ASE">Placement ASE</option>
          </select>
          <textarea
            style={{ ...inputBase, resize: 'vertical', minHeight: 55 }}
            value={data.signalementDetails}
            onChange={e => patch({ signalementDetails: e.target.value })}
            placeholder="Si signalement : motifs détaillés, autorité contactée (Procureur / CRIP)…"
          />
        </div>
      </div>
    </div>
  );
}
