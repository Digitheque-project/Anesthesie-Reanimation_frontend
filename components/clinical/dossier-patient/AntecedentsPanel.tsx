'use client';

import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type AntecedentsData = {
  adulteOpen: boolean;
  medicaux: string;
  chirurgicaux: string;
  allergies: string;
  gyneco: string;
  statutVaccinal: string;
  modeVieTabac: boolean;
  modeVieAlcool: boolean;
  modeVieAutre: string;
  modeVieSport: string;
  modeVieMaison: string;

  blocNeonatalOpen: boolean;
  gestiteParite: string;
  terme: string;
  suiviPrenatal: string;
  typeGrossesse: string;
  pathologiesGravidiques: string[];
  modeAccouchement: string;
  presentation: string;
  dureeTravail: string;
  anesthesie: string;
  liquideAmniotique: string;
  rpmDelai: string;
  corticotherapie: string;
  atbPerpartum: string;
  evenementsPerinatals: string[];
  familialOpen: boolean;
  familialText: string;
  apgar: { id: string; label: string; m1: string; m5: string }[];
  customCategories: { id: string; title: string; detail: string }[];
  postnatalOpen: boolean;
  postnatalText: string;
  scoresNeonatauxOpen: boolean;
  scoresNeonatauxText: string;
};

const APGAR_ROWS = [
  { id: 'fc', label: 'Fréquence cardiaque' },
  { id: 'resp', label: 'Ventilation / Respiration' },
  { id: 'tonus', label: 'Tonus musculaire' },
  { id: 'reflex', label: 'Réactivité / Reflexes' },
  { id: 'color', label: 'Coloration' },
];

export function defaultAntecedents(): AntecedentsData {
  return {
    adulteOpen: true,
    medicaux: '',
    chirurgicaux: '',
    allergies: '',
    gyneco: '',
    statutVaccinal: '',
    modeVieTabac: false,
    modeVieAlcool: false,
    modeVieAutre: '',
    modeVieSport: '',
    modeVieMaison: '',

    blocNeonatalOpen: false,
    gestiteParite: '',
    terme: '',
    suiviPrenatal: '',
    typeGrossesse: '',
    pathologiesGravidiques: [],
    modeAccouchement: '',
    presentation: '',
    dureeTravail: '',
    anesthesie: '',
    liquideAmniotique: '',
    rpmDelai: '',
    corticotherapie: '',
    atbPerpartum: '',
    evenementsPerinatals: [],
    familialOpen: false,
    familialText: '',
    apgar: APGAR_ROWS.map(r => ({ ...r, m1: '', m5: '' })),
    customCategories: [],
    postnatalOpen: false,
    postnatalText: '',
    scoresNeonatauxOpen: false,
    scoresNeonatauxText: '',
  };
}

export function parseAntecedentsContent(raw: unknown): AntecedentsData {
  const d = defaultAntecedents();
  if (typeof raw === 'string' && raw.trim()) {
    d.familialText = raw;
    return d;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const o = raw as Record<string, unknown>;
  const mergeArr = (key: 'pathologiesGravidiques' | 'evenementsPerinatals') =>
    Array.isArray(o[key])
      ? (o[key] as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : d[key];

  let apgar = d.apgar;
  if (Array.isArray(o.apgar)) {
    const apgarArr = o.apgar as unknown[];
    apgar = APGAR_ROWS.map((row, i) => {
      const rowIn = apgarArr[i] as Record<string, unknown> | undefined;
      return {
        ...row,
        m1: typeof rowIn?.m1 === 'string' ? rowIn.m1 : '',
        m5: typeof rowIn?.m5 === 'string' ? rowIn.m5 : '',
      };
    });
  }

  let customCategories = d.customCategories;
  if (Array.isArray(o.customCategories)) {
    customCategories = (o.customCategories as { id?: string; title?: string; detail?: string }[])
      .filter(x => x && typeof x === 'object')
      .map((x, i) => ({
        id: typeof x.id === 'string' ? x.id : `cat-${i}`,
        title: typeof x.title === 'string' ? x.title : '',
        detail: typeof x.detail === 'string' ? x.detail : '',
      }));
  }

  return {
    ...d,
    adulteOpen: typeof o.adulteOpen === 'boolean' ? o.adulteOpen : d.adulteOpen,
    medicaux: typeof o.medicaux === 'string' ? o.medicaux : d.medicaux,
    chirurgicaux: typeof o.chirurgicaux === 'string' ? o.chirurgicaux : d.chirurgicaux,
    allergies: typeof o.allergies === 'string' ? o.allergies : d.allergies,
    gyneco: typeof o.gyneco === 'string' ? o.gyneco : d.gyneco,
    statutVaccinal: typeof o.statutVaccinal === 'string' ? o.statutVaccinal : d.statutVaccinal,
    modeVieTabac: typeof o.modeVieTabac === 'boolean' ? o.modeVieTabac : d.modeVieTabac,
    modeVieAlcool: typeof o.modeVieAlcool === 'boolean' ? o.modeVieAlcool : d.modeVieAlcool,
    modeVieAutre: typeof o.modeVieAutre === 'string' ? o.modeVieAutre : d.modeVieAutre,
    modeVieSport: typeof o.modeVieSport === 'string' ? o.modeVieSport : d.modeVieSport,
    modeVieMaison: typeof o.modeVieMaison === 'string' ? o.modeVieMaison : d.modeVieMaison,

    blocNeonatalOpen: typeof o.blocNeonatalOpen === 'boolean' ? o.blocNeonatalOpen : d.blocNeonatalOpen,
    gestiteParite: typeof o.gestiteParite === 'string' ? o.gestiteParite : d.gestiteParite,
    terme: typeof o.terme === 'string' ? o.terme : d.terme,
    suiviPrenatal: typeof o.suiviPrenatal === 'string' ? o.suiviPrenatal : d.suiviPrenatal,
    typeGrossesse: typeof o.typeGrossesse === 'string' ? o.typeGrossesse : d.typeGrossesse,
    pathologiesGravidiques: mergeArr('pathologiesGravidiques'),
    modeAccouchement: typeof o.modeAccouchement === 'string' ? o.modeAccouchement : d.modeAccouchement,
    presentation: typeof o.presentation === 'string' ? o.presentation : d.presentation,
    dureeTravail: typeof o.dureeTravail === 'string' ? o.dureeTravail : d.dureeTravail,
    anesthesie: typeof o.anesthesie === 'string' ? o.anesthesie : d.anesthesie,
    liquideAmniotique: typeof o.liquideAmniotique === 'string' ? o.liquideAmniotique : d.liquideAmniotique,
    rpmDelai: typeof o.rpmDelai === 'string' ? o.rpmDelai : d.rpmDelai,
    corticotherapie: typeof o.corticotherapie === 'string' ? o.corticotherapie : d.corticotherapie,
    atbPerpartum: typeof o.atbPerpartum === 'string' ? o.atbPerpartum : d.atbPerpartum,
    evenementsPerinatals: mergeArr('evenementsPerinatals'),
    familialOpen: typeof o.familialOpen === 'boolean' ? o.familialOpen : d.familialOpen,
    familialText: typeof o.familialText === 'string' ? o.familialText : d.familialText,
    apgar,
    customCategories,
    postnatalOpen: typeof o.postnatalOpen === 'boolean' ? o.postnatalOpen : d.postnatalOpen,
    postnatalText: typeof o.postnatalText === 'string' ? o.postnatalText : d.postnatalText,
    scoresNeonatauxOpen: typeof o.scoresNeonatauxOpen === 'boolean' ? o.scoresNeonatauxOpen : d.scoresNeonatauxOpen,
    scoresNeonatauxText: typeof o.scoresNeonatauxText === 'string' ? o.scoresNeonatauxText : d.scoresNeonatauxText,
  };
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

const subBlueTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: ehr.primary,
  letterSpacing: '0.04em',
  marginBottom: 14,
  marginTop: 4,
};

function TagRow({
  draft,
  setDraft,
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  draft: string;
  setDraft: (s: string) => void;
  tags: string[];
  onAdd: () => void;
  onRemove: (t: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          style={{
            ...inputBase,
            flex: 1,
            minWidth: 160,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRight: 'none',
          }}
        />
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '0 20px',
            backgroundColor: ehr.primary,
            color: ehr.white,
            border: 'none',
            borderRadius: '0 6px 6px 0',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Ajouter
        </button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {tags.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onRemove(t)}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: 16,
                padding: '4px 12px',
                fontSize: 13,
                color: ehr.text,
                cursor: 'pointer',
              }}
              title="Retirer"
            >
              {t} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InnerAccordion({
  open,
  onToggle,
  title,
  badges,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  const stroke = 1.75;
  return (
    <div
      style={{
        border: `1px solid ${ehr.border}`,
        borderRadius: 10,
        marginBottom: 14,
        overflow: 'hidden',
        backgroundColor: ehr.white,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#fafbfc',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          {badges}
          <span style={{ fontSize: 12, fontWeight: 700, color: ehr.text, lineHeight: 1.35 }}>{title}</span>
        </div>
        <span style={{ color: ehr.textMuted, flexShrink: 0 }}>
          {open ? <ChevronDown size={18} strokeWidth={stroke} /> : <ChevronRight size={18} strokeWidth={stroke} />}
        </span>
      </button>
      {open && <div style={{ padding: '16px 18px 18px', borderTop: `1px solid ${ehr.borderSoft}` }}>{children}</div>}
    </div>
  );
}

function BadgeNeoPed({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 4,
        backgroundColor: bg,
        color,
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  );
}

type Props = {
  value: AntecedentsData;
  onChange: (next: AntecedentsData) => void;
};

export function AntecedentsPanel({ value, onChange }: Props) {
  const patch = useCallback((p: Partial<AntecedentsData>) => onChange({ ...value, ...p }), [value, onChange]);

  const [draftPatho, setDraftPatho] = useState('');
  const [draftPeri, setDraftPeri] = useState('');

  const addTag = (field: 'pathologiesGravidiques' | 'evenementsPerinatals', draft: string, clear: () => void) => {
    const t = draft.trim();
    if (!t) return;
    if (value[field].includes(t)) {
      clear();
      return;
    }
    if (field === 'pathologiesGravidiques') {
      patch({ pathologiesGravidiques: [...value.pathologiesGravidiques, t] });
    } else {
      patch({ evenementsPerinatals: [...value.evenementsPerinatals, t] });
    }
    clear();
  };

  const sumCol = (key: 'm1' | 'm5') =>
    value.apgar.reduce((acc, row) => acc + (parseInt(row[key], 10) || 0), 0);

  const updateApgar = (index: number, key: 'm1' | 'm5', v: string) => {
    const next = value.apgar.map((row, i) => (i === index ? { ...row, [key]: v.replace(/\D/g, '').slice(0, 1) } : row));
    patch({ apgar: next });
  };

  const addCustomCategory = () => {
    patch({
      customCategories: [
        ...value.customCategories,
        { id: `c-${Date.now()}`, title: 'Nouvelle catégorie', detail: '' },
      ],
    });
  };

  const grid4: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 18,
  };

  return (
    <div style={{ maxWidth: '100%' }}>

      <InnerAccordion
        open={value.adulteOpen}
        onToggle={() => patch({ adulteOpen: !value.adulteOpen })}
        title="ANTÉCÉDENTS GÉNÉRAUX"
        badges={
          <>
            <BadgeNeoPed label="ADULTE / GÉNÉRAL" bg="#fce7f3" color="#be185d" />
          </>
        }
      >
        <div style={{ ...grid4, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          <div>
            <label style={labelAbove}>Médicaux personnels</label>
            <textarea
              style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
              value={value.medicaux}
              onChange={e => patch({ medicaux: e.target.value })}
              placeholder="Ex: HTA, Diabète..."
            />
          </div>
          <div>
            <label style={labelAbove}>Chirurgicaux</label>
            <textarea
              style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
              value={value.chirurgicaux}
              onChange={e => patch({ chirurgicaux: e.target.value })}
              placeholder="Ex: Appendicectomie..."
            />
          </div>
          <div>
            <label style={labelAbove}>Allergie à</label>
            <textarea
              style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
              value={value.allergies}
              onChange={e => patch({ allergies: e.target.value })}
              placeholder="Ex: Pénicilline..."
            />
          </div>
          <div>
            <label style={labelAbove}>Gynéco</label>
            <textarea
              style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
              value={value.gyneco}
              onChange={e => patch({ gyneco: e.target.value })}
              placeholder="Détails gynécologiques..."
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
            <label style={labelAbove}>Statut vaccinal</label>
            <textarea
              style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
              value={value.statutVaccinal}
              onChange={e => patch({ statutVaccinal: e.target.value })}
              placeholder="Ex: À jour, DT Polio..."
            />
        </div>

        <div style={subBlueTitle}>MODE DE VIE</div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: ehr.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={value.modeVieTabac} onChange={e => patch({ modeVieTabac: e.target.checked })} />
            Tabac
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: ehr.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={value.modeVieAlcool} onChange={e => patch({ modeVieAlcool: e.target.checked })} />
            Alcool
          </label>
        </div>

        <div style={{ ...grid4, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          <div>
            <label style={labelAbove}>Autre substance</label>
            <input
              style={inputBase}
              value={value.modeVieAutre}
              onChange={e => patch({ modeVieAutre: e.target.value })}
              placeholder="Préciser..."
            />
          </div>
          <div>
            <label style={labelAbove}>Activité sportive</label>
            <input
              style={inputBase}
              value={value.modeVieSport}
              onChange={e => patch({ modeVieSport: e.target.value })}
              placeholder="Préciser..."
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelAbove}>Maison (Conditions de vie)</label>
            <textarea
              style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
              value={value.modeVieMaison}
              onChange={e => patch({ modeVieMaison: e.target.value })}
              placeholder="Ex: petit, combien de la famille, utilisation de gaz ou charbon..."
            />
          </div>
        </div>
      </InnerAccordion>

      <InnerAccordion
        open={value.familialOpen}
        onToggle={() => patch({ familialOpen: !value.familialOpen })}
        title="ANTÉCÉDENTS FAMILIAUX ET HÉRÉDITAIRES"
      >
        <label style={labelAbove}>Description</label>
        <textarea
          value={value.familialText}
          onChange={e => patch({ familialText: e.target.value })}
          rows={5}
          placeholder="Antécédents familiaux, maladies héréditaires…"
          style={{ ...inputBase, resize: 'vertical', minHeight: 100 }}
        />
      </InnerAccordion>

      <InnerAccordion
        open={value.blocNeonatalOpen}
        onToggle={() => patch({ blocNeonatalOpen: !value.blocNeonatalOpen })}
        title="ANTÉCÉDENTS POUR ENFANT (< 15 ANS)"
        badges={
          <>
            <BadgeNeoPed label="NEO" bg="#EDE9FE" color="#5B21B6" />
            <BadgeNeoPed label="PED" bg="#DBEAFE" color="#1D4ED8" />
          </>
        }
      >
        <div style={subBlueTitle}>01. GROSSESSE</div>
        <div style={{ ...grid4, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <div>
            <label style={labelAbove}>Gestité / Parité</label>
            <input
              style={inputBase}
              value={value.gestiteParite}
              onChange={e => patch({ gestiteParite: e.target.value })}
              placeholder="Ex: G2P1"
            />
          </div>
          <div>
            <label style={labelAbove}>Terme</label>
            <input
              style={inputBase}
              value={value.terme}
              onChange={e => patch({ terme: e.target.value })}
              placeholder="Ex: 38 + 4"
            />
          </div>
          <div>
            <label style={labelAbove}>Suivi prénatal</label>
            <select
              style={{ ...inputBase, cursor: 'pointer' }}
              value={value.suiviPrenatal}
              onChange={e => patch({ suiviPrenatal: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="bien suivi">Bien suivi</option>
              <option value="insuffisant">Insuffisant</option>
              <option value="suivi">Suivi</option>
            </select>
          </div>
          <div>
            <label style={labelAbove}>Type grossesse</label>
            <select
              style={{ ...inputBase, cursor: 'pointer' }}
              value={value.typeGrossesse}
              onChange={e => patch({ typeGrossesse: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="unique">Unique</option>
              <option value="gemellaire">Gémellaire</option>
              <option value="multiple">Multiple</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ ...labelAbove, marginBottom: 8 }}>Pathologies gravidiques / autres événements</label>
          <TagRow
            draft={draftPatho}
            setDraft={setDraftPatho}
            tags={value.pathologiesGravidiques}
            placeholder="Ex: prééclampsie"
            onAdd={() => addTag('pathologiesGravidiques', draftPatho, () => setDraftPatho(''))}
            onRemove={t => patch({ pathologiesGravidiques: value.pathologiesGravidiques.filter(x => x !== t) })}
          />
        </div>

        <div style={{ ...subBlueTitle, marginTop: 22 }}>02. ACCOUCHEMENT</div>
        <div style={{ ...grid4, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <div>
            <label style={labelAbove}>Mode d&apos;accouchement</label>
            <select
              style={{ ...inputBase, cursor: 'pointer' }}
              value={value.modeAccouchement}
              onChange={e => patch({ modeAccouchement: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="programmer">Programmer</option>
              <option value="urgence">Urgence</option>
              <option value="cesarienne">Césarienne</option>
            </select>
          </div>
          <div>
            <label style={labelAbove}>Présentation</label>
            <select
              style={{ ...inputBase, cursor: 'pointer' }}
              value={value.presentation}
              onChange={e => patch({ presentation: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="cephalique">Céphalique</option>
              <option value="siege">Siège</option>
              <option value="transparence">Transparence</option>
            </select>
          </div>
          <div>
            <label style={labelAbove}>Liquide amniotique</label>
            <select
              style={{ ...inputBase, cursor: 'pointer' }}
              value={value.liquideAmniotique}
              onChange={e => patch({ liquideAmniotique: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="claire">Claire</option>
              <option value="meconial">Méconial</option>
              <option value="hemorragique">Hémorragique</option>
            </select>
          </div>
          <div>
            <label style={labelAbove}>Durée du travail</label>
            <input
              style={inputBase}
              value={value.dureeTravail}
              onChange={e => patch({ dureeTravail: e.target.value })}
              placeholder="Ex: 8 h"
            />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ ...labelAbove, marginBottom: 8 }}>Évènements périnataux (Naissance et période néonatale immédiat)</label>
          <TagRow
            draft={draftPeri}
            setDraft={setDraftPeri}
            tags={value.evenementsPerinatals}
            placeholder="Ex: dystocie des épaules"
            onAdd={() => addTag('evenementsPerinatals', draftPeri, () => setDraftPeri(''))}
            onRemove={t => patch({ evenementsPerinatals: value.evenementsPerinatals.filter(x => x !== t) })}
          />
        </div>
        
        <div style={{ ...grid4, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginTop: 16 }}>
          <div>
            <label style={labelAbove}>Taille de naissance (cm)</label>
            <input
              style={inputBase}
              value={value.corticotherapie} // reused field for taille to avoid migrating complex json structure
              onChange={e => patch({ corticotherapie: e.target.value })}
              placeholder="Ex: 50"
            />
          </div>
          <div>
            <label style={labelAbove}>Poids naissance (g)</label>
            <input
              style={inputBase}
              value={value.atbPerpartum} // reused field
              onChange={e => patch({ atbPerpartum: e.target.value })}
              placeholder="Ex: 3200"
            />
          </div>
          <div>
            <label style={labelAbove}>PC naissance (cm)</label>
            <input
              style={inputBase}
              value={value.rpmDelai} // reused field
              onChange={e => patch({ rpmDelai: e.target.value })}
              placeholder="Ex: 35"
            />
          </div>
        </div>

      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <div style={{ ...labelAbove, marginBottom: 8 }}>Scores APGAR (3 scores selon le temps)</div>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              border: `1px solid ${ehr.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: ehr.tableHeader, color: ehr.white }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Critère
                </th>
                <th style={{ padding: '10px 8px', fontWeight: 700, textTransform: 'uppercase', width: 72 }}>1 min</th>
                <th style={{ padding: '10px 8px', fontWeight: 700, textTransform: 'uppercase', width: 72 }}>5 min</th>
                <th style={{ padding: '10px 8px', fontWeight: 700, textTransform: 'uppercase', width: 72 }}>10 min</th>
              </tr>
            </thead>
            <tbody>
              {value.apgar.map((row, i) => (
                <tr key={row.id} style={{ backgroundColor: i % 2 === 0 ? ehr.white : '#fafafa' }}>
                  <td style={{ padding: '8px 12px', borderTop: `1px solid ${ehr.border}`, color: ehr.text }}>{row.label}</td>
                  <td style={{ padding: 6, borderTop: `1px solid ${ehr.border}`, textAlign: 'center' }}>
                    <input
                      value={row.m1}
                      onChange={e => updateApgar(i, 'm1', e.target.value)}
                      style={{ ...inputBase, width: 48, textAlign: 'center', padding: '8px' }}
                      placeholder="0–2"
                    />
                  </td>
                  <td style={{ padding: 6, borderTop: `1px solid ${ehr.border}`, textAlign: 'center' }}>
                    <input
                      value={row.m5}
                      onChange={e => updateApgar(i, 'm5', e.target.value)}
                      style={{ ...inputBase, width: 48, textAlign: 'center', padding: '8px' }}
                      placeholder="0–2"
                    />
                  </td>
                  <td style={{ padding: 6, borderTop: `1px solid ${ehr.border}`, textAlign: 'center' }}>
                     <input
                       style={{ ...inputBase, width: 48, textAlign: 'center', padding: '8px' }}
                       placeholder="0–2"
                     />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style={{ marginTop: 16 }}>
        <label style={labelAbove}>Développement psychomoteur, sensoriel, langage</label>
        <textarea
          style={{ ...inputBase, resize: 'vertical', minHeight: 60 }}
          value={value.postnatalText}
          onChange={e => patch({ postnatalText: e.target.value })}
          placeholder="Détails..."
        />
      </div>

      </InnerAccordion>


    </div>
  );
}

export function antecedentsHasContent(a: AntecedentsData): boolean {
  const strs = [
    a.medicaux,
    a.chirurgicaux,
    a.allergies,
    a.gyneco,
    a.statutVaccinal,
    a.modeVieAutre,
    a.modeVieSport,
    a.modeVieMaison,
    a.gestiteParite,
    a.terme,
    a.suiviPrenatal,
    a.typeGrossesse,
    a.modeAccouchement,
    a.presentation,
    a.dureeTravail,
    a.anesthesie,
    a.liquideAmniotique,
    a.rpmDelai,
    a.corticotherapie,
    a.atbPerpartum,
    a.familialText,
    a.postnatalText,
    a.scoresNeonatauxText,
  ];
  if (strs.some(s => typeof s === 'string' && s.trim().length > 0)) return true;
  if (a.modeVieAlcool || a.modeVieTabac) return true;
  if (a.pathologiesGravidiques.length || a.evenementsPerinatals.length) return true;
  if (a.customCategories.some(c => c.title.trim() || c.detail.trim())) return true;
  if (a.apgar.some(r => r.m1 || r.m5)) return true;
  return false;
}
