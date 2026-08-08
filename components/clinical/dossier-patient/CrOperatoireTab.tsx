'use client';

import { useState, useEffect } from 'react';
import { dossierPatientApi as api } from '@/lib/clinical/dossier-patient-api';
import { ehr } from '@/lib/clinical/ehr-theme';

interface ChecklistMoment {
  items: Record<string, boolean>;
  valideA: string;
  commentaire: string;
}

interface CrOperatoire {
  id?: string;
  patientId?: string;
  numeroOp?: string;
  nomIntervention?: string;
  dateIntervention?: string;
  duree?: string;
  chirurgienPrincipal?: string;
  aideOperatoire?: string;
  anesthesiste?: string;
  typeAnesthesie?: string;
  classeAsa?: string;
  checklistAvantInduction?: ChecklistMoment;
  checklistAvantIncision?: ChecklistMoment;
  checklistAvantSortie?: ChecklistMoment;
  installation?: string;
  exploration?: string;
  geste?: string;
  prelevements?: string;
  scoreSccre?: string;
  complications?: string;
  statut?: string;
}

const defaultChecklist = (): ChecklistMoment => ({
  items: {},
  valideA: '',
  commentaire: '',
});

const defaultCr = (): CrOperatoire => ({
  numeroOp: '',
  nomIntervention: '',
  dateIntervention: '',
  duree: '',
  chirurgienPrincipal: '',
  aideOperatoire: '',
  anesthesiste: '',
  typeAnesthesie: '',
  classeAsa: '',
  checklistAvantInduction: defaultChecklist(),
  checklistAvantIncision: defaultChecklist(),
  checklistAvantSortie: defaultChecklist(),
  installation: '',
  exploration: '',
  geste: '',
  prelevements: '',
  scoreSccre: '',
  complications: '',
  statut: 'PLANIFIE',
});

const CHECKLIST_INDUCTION = [
  'Identité confirmée',
  'Site marqué',
  'Consentement signé',
  'Matériel vérifié',
  'Risque hémorragique évalué',
  'Allergies vérifiées',
];
const CHECKLIST_INCISION = [
  'Équipe introduite',
  'Confirmation patient/site/procédure',
  'Antibioprophylaxie administrée',
  'Imagerie disponible',
  'Problèmes anticipés discutés',
];
const CHECKLIST_SORTIE = [
  'Instruments/compresses vérifiés',
  'Pièce anatomique labellisée',
  'Problèmes équipement signalés',
  'Consignes post-op transmises',
];

const ASA_COLORS: Record<string, string> = {
  '1': '#22c55e', '2': '#3b82f6', '3': '#f59e0b', '4': '#ef4444', '5': '#7c3aed', '6': '#1e293b',
};

export function CrOperatoireTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<CrOperatoire[]>([]);
  const [selected, setSelected] = useState<CrOperatoire | null>(null);
  const [form, setForm] = useState<CrOperatoire>(defaultCr());
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList();
  }, [patientId]);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${patientId}/cr-operatoire`);
      const data = Array.isArray(res.data) ? res.data : [];
      setList(data);
      if (data.length > 0) {
        setSelected(data[0]);
        setForm(data[0]);
        setMode('view');
      } else {
        setMode('new');
        setForm(defaultCr());
      }
    } catch {
      setList([]);
      setMode('new');
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: ehr.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${ehr.borderSoft}`,
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    color: ehr.text,
    outline: 'none',
    fontFamily: "'Manrope', sans-serif",
    boxSizing: 'border-box',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s ease',
  };

  async function handleSave() {
    setSaving(true);
    try {
      let saved: CrOperatoire;
      if (form.id) {
        const res = await api.put(`/patients/${patientId}/cr-operatoire/${form.id}`, form);
        saved = res.data;
      } else {
        const res = await api.post(`/patients/${patientId}/cr-operatoire`, form);
        saved = res.data;
      }
      await fetchList();
      setSelected(saved);
      setForm(saved);
      setMode('view');
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function setChecklist(
    key: 'checklistAvantInduction' | 'checklistAvantIncision' | 'checklistAvantSortie',
    field: string,
    value: boolean | string,
  ) {
    setForm(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || defaultChecklist()),
        ...(field === 'valideA' || field === 'commentaire'
          ? { [field]: value }
          : { items: { ...(prev[key]?.items || {}), [field]: value } }),
      },
    }));
  }

  function isChecklistValid(cl?: ChecklistMoment): boolean {
    return !!cl?.valideA;
  }
  void isChecklistValid;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: ehr.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        Chargement...
      </div>
    );
  }

  const isView = mode === 'view';

  return (
    <div style={{ display: 'flex', gap: '32px', fontFamily: "'Manrope', sans-serif", color: ehr.text }}>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Compte-rendu opératoire</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Gestion des interventions et traçabilité</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => { setForm(defaultCr()); setSelected(null); setMode('new'); }}
              style={{
                backgroundColor: ehr.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 102, 141, 0.15)',
              }}
            >
              + Nouveau CR
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Section 1: Informations Générales */}
          <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${ehr.borderSoft}`,
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: ehr.primary }}>Détails de l&apos;intervention</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20 }}>
              <div>
                <label style={labelStyle}>NOM DE L&apos;INTERVENTION</label>
                {isView ? (
                  <div style={{ fontSize: 16, fontWeight: 700, color: ehr.text }}>{form.nomIntervention || '—'}</div>
                ) : (
                  <input
                    placeholder="Ex: Cholécystectomie..."
                    value={form.nomIntervention || ''}
                    onChange={e => setForm({ ...form, nomIntervention: e.target.value })}
                    style={{ ...inputStyle, border: `2px solid ${ehr.primary}`, backgroundColor: '#fff' }}
                  />
                )}
              </div>
              <div>
                <label style={labelStyle}>DATE & HEURE</label>
                {isView ? (
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{form.dateIntervention ? new Date(form.dateIntervention).toLocaleString('fr-FR') : '—'}</div>
                ) : (
                  <input
                    type="datetime-local"
                    value={form.dateIntervention || ''}
                    onChange={e => setForm({ ...form, dateIntervention: e.target.value })}
                    style={inputStyle}
                  />
                )}
              </div>
              <div>
                <label style={labelStyle}>NUMÉRO OP</label>
                {isView ? (
                  <div style={{ fontSize: 14, fontWeight: 600 }}>#{form.numeroOp || '—'}</div>
                ) : (
                  <input
                    placeholder="OP-2026-..."
                    value={form.numeroOp || ''}
                    onChange={e => setForm({ ...form, numeroOp: e.target.value })}
                    style={inputStyle}
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginTop: 24 }}>
              <InfoField label="CHIRURGIEN PRINCIPAL" value={form.chirurgienPrincipal} isView={isView} placeholder="Dr. ..." onChange={v => setForm({ ...form, chirurgienPrincipal: v })} labelStyle={labelStyle} inputStyle={inputStyle} />
              <InfoField label="AIDE-OPÉRATOIRE" value={form.aideOperatoire} isView={isView} placeholder="Dr. ..." onChange={v => setForm({ ...form, aideOperatoire: v })} labelStyle={labelStyle} inputStyle={inputStyle} />
              <InfoField label="ANESTHÉSISTE" value={form.anesthesiste} isView={isView} placeholder="Dr. ..." onChange={v => setForm({ ...form, anesthesiste: v })} labelStyle={labelStyle} inputStyle={inputStyle} />
              <div>
                <label style={labelStyle}>CLASSE ASA</label>
                {isView ? (
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 800,
                    backgroundColor: (ASA_COLORS[form.classeAsa || ''] || '#F1F5F9') + '22',
                    color: ASA_COLORS[form.classeAsa || ''] || ehr.textMuted,
                    border: `1px solid ${ASA_COLORS[form.classeAsa || ''] || ehr.borderSoft}`
                  }}>
                    ASA {form.classeAsa || '—'}
                  </span>
                ) : (
                  <select value={form.classeAsa || ''} onChange={e => setForm({ ...form, classeAsa: e.target.value })} style={inputStyle}>
                    <option value="">—</option>
                    {['1', '2', '3', '4', '5', '6', 'ASAE'].map(v => (
                      <option key={v} value={v}>ASA {v}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Description Technique */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
            {/* Checklists Left Side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ ...labelStyle, marginBottom: 4 }}>Checklists de Sécurité (OMS)</h3>
              <ChecklistBlock
                label="Avant l'induction"
                items={CHECKLIST_INDUCTION}
                data={form.checklistAvantInduction || defaultChecklist()}
                isView={isView}
                onChange={(f, v) => setChecklist('checklistAvantInduction', f, v)}
                inputStyle={inputStyle}
              />
              <ChecklistBlock
                label="Avant l'incision"
                items={CHECKLIST_INCISION}
                data={form.checklistAvantIncision || defaultChecklist()}
                isView={isView}
                onChange={(f, v) => setChecklist('checklistAvantIncision', f, v)}
                inputStyle={inputStyle}
              />
              <ChecklistBlock
                label="Sortie du bloc"
                items={CHECKLIST_SORTIE}
                data={form.checklistAvantSortie || defaultChecklist()}
                isView={isView}
                onChange={(f, v) => setChecklist('checklistAvantSortie', f, v)}
                inputStyle={inputStyle}
              />
            </div>

            {/* Description Textareas */}
            <div style={{
              backgroundColor: '#fff',
              border: `1px solid ${ehr.borderSoft}`,
              borderRadius: 16,
              padding: 24
            }}>
              <h3 style={{ ...labelStyle, marginBottom: 20 }}>Technique Opératoire</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <TextBlock label="Installation" value={form.installation} isView={isView} placeholder="Positionnement, installation de l'équipe..." onChange={v => setForm({ ...form, installation: v })} labelStyle={labelStyle} inputStyle={inputStyle} />
                <TextBlock label="Exploration" value={form.exploration} isView={isView} placeholder="Findings per-opératoires, anatomie..." onChange={v => setForm({ ...form, exploration: v })} labelStyle={labelStyle} inputStyle={inputStyle} />
                <TextBlock label="Geste Chirurgical" value={form.geste} isView={isView} placeholder="Description détaillée du geste..." onChange={v => setForm({ ...form, geste: v })} labelStyle={labelStyle} inputStyle={inputStyle} last />
              </div>
            </div>
          </div>

          {/* Section 3: Prélèvements & Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ backgroundColor: ehr.highlightBlueTint, border: `1px solid ${ehr.highlightBorder}`, borderRadius: 16, padding: 24 }}>
              <label style={{ ...labelStyle, color: ehr.primary }}>PRÉLÈVEMENTS & HISTOLOGIE</label>
              {isView ? (
                <p style={{ fontSize: 14, color: ehr.text, margin: '8px 0 0 0', lineHeight: 1.5 }}>{form.prelevements || 'Aucun prélèvement renseigné'}</p>
              ) : (
                <textarea
                  placeholder="Ex: Pièce envoyée en anapath..."
                  value={form.prelevements || ''}
                  onChange={e => setForm({ ...form, prelevements: e.target.value })}
                  style={{ ...inputStyle, height: 80, marginTop: 8, resize: 'none' }}
                />
              )}
            </div>

            <div style={{
              backgroundColor: (Number(form.scoreSccre) >= 9 ? '#F0FDF4' : '#FFF7ED'),
              border: `1px solid ${Number(form.scoreSccre) >= 9 ? '#BBF7D0' : '#FED7AA'}`,
              borderRadius: 16,
              padding: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ ...labelStyle, color: (Number(form.scoreSccre) >= 9 ? '#16A34A' : '#C2410C'), marginBottom: 0 }}>SCORE SCCRE & COMPLICATIONS</label>
                <div style={{ fontSize: 24, fontWeight: 900, color: (Number(form.scoreSccre) >= 9 ? '#16A34A' : '#EF4444') }}>
                  {form.scoreSccre || '—'}<span style={{ fontSize: 14, fontWeight: 700, opacity: 0.6 }}>/10</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {!isView && (
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: ehr.textMuted }}>MODIFIER SCORE</label>
                    <select value={form.scoreSccre || ''} onChange={e => setForm({ ...form, scoreSccre: e.target.value })} style={{ ...inputStyle, marginTop: 4 }}>
                      <option value="">—</option>
                      {Array.from({ length: 11 }, (_, i) => <option key={i} value={String(i)}>{i}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ gridColumn: isView ? 'span 2' : 'span 1' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: ehr.textMuted }}>COMPLICATIONS</label>
                  {isView ? (
                    <div style={{ fontSize: 14, fontWeight: 700, color: (form.complications && form.complications !== 'Aucune' ? '#EF4444' : '#16A34A'), marginTop: 4 }}>
                      {form.complications || 'Aucune'}
                    </div>
                  ) : (
                    <input value={form.complications || ''} onChange={e => setForm({ ...form, complications: e.target.value })} placeholder="Aucune" style={{ ...inputStyle, marginTop: 4 }} />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: (Number(form.scoreSccre) >= 9 ? '#16A34A' : '#EF4444') }}>
                {Number(form.scoreSccre) >= 9
                  ? '✅ Autorisation de sortie de salle de réveil accordée.'
                  : '⚠️ Maintien en surveillance post-interventionnelle requis.'}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {!isView && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '24px 0',
              borderTop: `1px solid ${ehr.borderSoft}`
            }}>
              <button
                type="button"
                onClick={() => { setForm(selected || list[0] || defaultCr()); setMode('view'); }}
                style={{
                  backgroundColor: '#fff',
                  color: ehr.textMuted,
                  border: `1px solid ${ehr.borderSoft}`,
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: ehr.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 32px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 102, 141, 0.2)'
                }}
              >
                {saving ? 'Sauvegarde...' : 'Valider le CR opératoire'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Historique des interventions */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{
          border: `1px solid ${ehr.borderSoft}`,
          borderRadius: 16,
          backgroundColor: '#fff',
          overflow: 'hidden',
          boxShadow: ehr.shadowCard
        }}>
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${ehr.borderSoft}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interventions</h3>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: ehr.primary, color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{list.length}</span>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.length === 0 ? (
              <p style={{ fontSize: 13, color: ehr.textMuted, textAlign: 'center', margin: '20px 0' }}>Aucun CR opératoire</p>
            ) : (
              list.map((cr, i) => (
                <button
                  key={cr.id}
                  onClick={() => { setSelected(cr); setForm(cr); setMode('view'); }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    width: '100%',
                    padding: '14px',
                    backgroundColor: selected?.id === cr.id ? ehr.highlightBlueTint : '#fff',
                    borderRadius: 12,
                    border: `1px solid ${selected?.id === cr.id ? ehr.primary : ehr.borderSoft}`,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selected?.id === cr.id ? '0 2px 8px rgba(5,102,141,0.08)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ehr.textMuted, textTransform: 'uppercase' }}>
                      {cr.dateIntervention ? new Date(cr.dateIntervention).toLocaleDateString('fr-FR') : `Opération #${i + 1}`}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ehr.primary }}>#{cr.numeroOp || '—'}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: ehr.text, lineHeight: 1.4 }}>
                    {cr.nomIntervention || 'Sans nom'}
                  </span>
                  <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: ehr.textMuted, fontWeight: 600 }}>{cr.chirurgienPrincipal || 'Chir. non renseigné'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────────

function InfoField({ label, value, isView, placeholder, onChange, required, labelStyle, inputStyle }: {
  label: string; value?: string; isView: boolean; placeholder?: string;
  onChange: (v: string) => void; required?: boolean; labelStyle: any; inputStyle: any;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
      {isView ? (
        <div style={{ fontSize: '14px', fontWeight: 600, color: ehr.text }}>{value || '—'}</div>
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
}

function TextBlock({ label, value, isView, placeholder, onChange, last, labelStyle, inputStyle }: {
  label: string; value?: string; isView: boolean; placeholder?: string;
  onChange: (v: string) => void; last?: boolean; labelStyle: any; inputStyle: any;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 4 }}>
      <label style={labelStyle}>{label}</label>
      {isView ? (
        <div style={{ fontSize: '14px', color: ehr.text, lineHeight: 1.6, padding: '8px 0' }}>{value || '—'}</div>
      ) : (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} />
      )}
    </div>
  );
}

function ChecklistBlock({ label, items, data, isView, onChange, inputStyle }: {
  label: string;
  items: string[];
  data: ChecklistMoment;
  isView: boolean;
  onChange: (field: string, value: boolean | string) => void;
  inputStyle: any;
}) {
  const allChecked = items.every(item => data.items?.[item]);
  const validated = !!data.valideA;

  return (
    <div style={{
      backgroundColor: validated ? '#F0FDF4' : '#fff',
      border: `1px solid ${validated ? '#BBF7D0' : ehr.borderSoft}`,
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            backgroundColor: validated ? '#16A34A' : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'white'
          }}>
            {validated ? '✓' : ''}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: ehr.text }}>{label}</span>
        </div>
        {validated && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 800 }}>{data.valideA}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <label key={item} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: isView ? 'default' : 'pointer',
            fontSize: 12,
            color: data.items?.[item] ? ehr.text : ehr.textMuted,
            fontWeight: data.items?.[item] ? 600 : 500
          }}>
            <input
              type="checkbox"
              checked={!!data.items?.[item]}
              disabled={isView}
              onChange={e => onChange(item, e.target.checked)}
              style={{ accentColor: ehr.primary }}
            />
            {item}
          </label>
        ))}
      </div>

      {!isView && allChecked && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${ehr.borderSoft}`, paddingTop: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 800, color: ehr.textMuted, display: 'block', marginBottom: 6 }}>HEURE DE VALIDATION</label>
          <input
            type="time"
            value={data.valideA || ''}
            onChange={e => onChange('valideA', e.target.value)}
            style={{ ...inputStyle, height: 32, fontSize: 12, width: 100, padding: '4px 8px' }}
          />
        </div>
      )}
    </div>
  );
}
