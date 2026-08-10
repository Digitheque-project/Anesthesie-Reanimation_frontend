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

// Le dossier patient est un dossier PARTAGÉ (propriété du service Dossier Patient) : le Bloc n'a
// que le droit de le consulter, jamais d'y écrire. Cet onglet est donc purement en lecture — le
// formulaire de création/modification d'un compte-rendu opératoire (mode "edit"/"new", bouton
// "+ Nouveau CR", sauvegarde) a été retiré, pas seulement désactivé.
export function CrOperatoireTab({ patientId }: { patientId: string }) {
  const [list, setList] = useState<CrOperatoire[]>([]);
  const [selected, setSelected] = useState<CrOperatoire | null>(null);
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
      setSelected(data[0] || null);
    } catch {
      setList([]);
      setSelected(null);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: ehr.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '32px', fontFamily: "'Manrope', sans-serif", color: ehr.text }}>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>

        {/* Header Section */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Compte-rendu opératoire</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ehr.textMuted }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Gestion des interventions et traçabilité</span>
          </div>
        </div>

        {!selected ? (
          <div style={{
            backgroundColor: '#fff',
            border: `1px dashed ${ehr.borderSoft}`,
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            color: ehr.textMuted,
          }}>
            Aucun compte-rendu opératoire enregistré pour ce patient.
          </div>
        ) : (
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
                <div style={{ fontSize: 16, fontWeight: 700, color: ehr.text }}>{selected.nomIntervention || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>DATE & HEURE</label>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.dateIntervention ? new Date(selected.dateIntervention).toLocaleString('fr-FR') : '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>NUMÉRO OP</label>
                <div style={{ fontSize: 14, fontWeight: 600 }}>#{selected.numeroOp || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginTop: 24 }}>
              <InfoField label="CHIRURGIEN PRINCIPAL" value={selected.chirurgienPrincipal} labelStyle={labelStyle} />
              <InfoField label="AIDE-OPÉRATOIRE" value={selected.aideOperatoire} labelStyle={labelStyle} />
              <InfoField label="ANESTHÉSISTE" value={selected.anesthesiste} labelStyle={labelStyle} />
              <div>
                <label style={labelStyle}>CLASSE ASA</label>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 800,
                  backgroundColor: (ASA_COLORS[selected.classeAsa || ''] || '#F1F5F9') + '22',
                  color: ASA_COLORS[selected.classeAsa || ''] || ehr.textMuted,
                  border: `1px solid ${ASA_COLORS[selected.classeAsa || ''] || ehr.borderSoft}`
                }}>
                  ASA {selected.classeAsa || '—'}
                </span>
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
                data={selected.checklistAvantInduction || defaultChecklist()}
              />
              <ChecklistBlock
                label="Avant l'incision"
                items={CHECKLIST_INCISION}
                data={selected.checklistAvantIncision || defaultChecklist()}
              />
              <ChecklistBlock
                label="Sortie du bloc"
                items={CHECKLIST_SORTIE}
                data={selected.checklistAvantSortie || defaultChecklist()}
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
                <TextBlock label="Installation" value={selected.installation} labelStyle={labelStyle} />
                <TextBlock label="Exploration" value={selected.exploration} labelStyle={labelStyle} />
                <TextBlock label="Geste Chirurgical" value={selected.geste} labelStyle={labelStyle} last />
              </div>
            </div>
          </div>

          {/* Section 3: Prélèvements & Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ backgroundColor: ehr.highlightBlueTint, border: `1px solid ${ehr.highlightBorder}`, borderRadius: 16, padding: 24 }}>
              <label style={{ ...labelStyle, color: ehr.primary }}>PRÉLÈVEMENTS & HISTOLOGIE</label>
              <p style={{ fontSize: 14, color: ehr.text, margin: '8px 0 0 0', lineHeight: 1.5 }}>{selected.prelevements || 'Aucun prélèvement renseigné'}</p>
            </div>

            <div style={{
              backgroundColor: (Number(selected.scoreSccre) >= 9 ? '#F0FDF4' : '#FFF7ED'),
              border: `1px solid ${Number(selected.scoreSccre) >= 9 ? '#BBF7D0' : '#FED7AA'}`,
              borderRadius: 16,
              padding: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ ...labelStyle, color: (Number(selected.scoreSccre) >= 9 ? '#16A34A' : '#C2410C'), marginBottom: 0 }}>SCORE SCCRE & COMPLICATIONS</label>
                <div style={{ fontSize: 24, fontWeight: 900, color: (Number(selected.scoreSccre) >= 9 ? '#16A34A' : '#EF4444') }}>
                  {selected.scoreSccre || '—'}<span style={{ fontSize: 14, fontWeight: 700, opacity: 0.6 }}>/10</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: ehr.textMuted }}>COMPLICATIONS</label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: (selected.complications && selected.complications !== 'Aucune' ? '#EF4444' : '#16A34A'), marginTop: 4 }}>
                    {selected.complications || 'Aucune'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: (Number(selected.scoreSccre) >= 9 ? '#16A34A' : '#EF4444') }}>
                {Number(selected.scoreSccre) >= 9
                  ? '✅ Autorisation de sortie de salle de réveil accordée.'
                  : '⚠️ Maintien en surveillance post-interventionnelle requis.'}
              </div>
            </div>
          </div>
        </div>
        )}
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
                  onClick={() => setSelected(cr)}
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

// ─── Sous-composants (lecture seule) ──────────────────────────────────────────

function InfoField({ label, value, labelStyle }: { label: string; value?: string; labelStyle: React.CSSProperties }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ fontSize: '14px', fontWeight: 600, color: ehr.text }}>{value || '—'}</div>
    </div>
  );
}

function TextBlock({ label, value, last, labelStyle }: { label: string; value?: string; last?: boolean; labelStyle: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: last ? 0 : 4 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ fontSize: '14px', color: ehr.text, lineHeight: 1.6, padding: '8px 0' }}>{value || '—'}</div>
    </div>
  );
}

function ChecklistBlock({ label, items, data }: {
  label: string;
  items: string[];
  data: ChecklistMoment;
}) {
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
            fontSize: 12,
            color: data.items?.[item] ? ehr.text : ehr.textMuted,
            fontWeight: data.items?.[item] ? 600 : 500
          }}>
            <input
              type="checkbox"
              checked={!!data.items?.[item]}
              disabled
              readOnly
              style={{ accentColor: ehr.primary }}
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
