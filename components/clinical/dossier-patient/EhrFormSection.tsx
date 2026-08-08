'use client';
​
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';
​
export type EhrFormSectionProps = {
  title: string;
  /** Sous-titre affiché sous le titre (section ouverte ou non repliable) */
  subtitle?: string;
  /** Numéro court dans le disque (ex. « 01 »), comme en observation médicale */
  sectionBadge?: string;
  /** Pastille verte avec coche (section considérée comme complète) */
  complete?: boolean;
  /** Comportement accordéon comme l’observation médicale */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** État d'ouverture contrôlé depuis le parent (pour accordéon) */
  isOpen?: boolean;
  /** Callback lors du clic sur l'en-tête */
  onToggle?: () => void;
  /** Contenu aligné à droite dans l’en-tête (ex. badge # OP) */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
};
​
const iconStroke = 1.75;
​
/**
 * Carte de section alignée sur le style des blocs repliables de l’observation médicale
 * (bordure, rayon 12, ombre, en-tête 16×20, corps séparé par une ligne douce).
 */
export function EhrFormSection({
  title,
  subtitle,
  sectionBadge,
  complete = false,
  collapsible = false,
  defaultOpen = true,
  isOpen: controlledOpen,
  onToggle,
  headerExtra,
  children,
}: EhrFormSectionProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const isOpen = collapsible ? (controlledOpen !== undefined ? controlledOpen : localOpen) : true;
​
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setLocalOpen(!localOpen);
    }
  };
​
  const showDisk = complete || (sectionBadge !== undefined && sectionBadge !== '');
​
  const lead = showDisk ? (
    complete ? (
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: ehr.success,
          color: ehr.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Check size={18} strokeWidth={2.5} />
      </span>
    ) : (
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: '#E2E8F0',
          color: ehr.textMuted,
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {sectionBadge}
      </span>
    )
  ) : null;
​
  const closedHint = collapsible && !isOpen && !subtitle;
​
  const titleBlock = (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: ehr.text }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: ehr.textMuted, marginTop: 4, fontWeight: 400 }}>{subtitle}</div>
      )}
      {closedHint && (
        <div style={{ fontSize: 12, color: ehr.textMuted, marginTop: 4, fontWeight: 400 }}>Cliquez pour ouvrir</div>
      )}
    </div>
  );
​
  const headerInner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: showDisk ? 14 : 0, minWidth: 0, flex: 1 }}>
        {lead}
        {titleBlock}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {headerExtra}
        {collapsible && (
          <span style={{ color: ehr.textMuted, display: 'flex' }}>
            {isOpen ? (
              <ChevronDown size={20} strokeWidth={iconStroke} />
            ) : (
              <ChevronRight size={20} strokeWidth={iconStroke} />
            )}
          </span>
        )}
      </div>
    </>
  );
​
  const headerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: ehr.white,
    border: 'none',
    cursor: collapsible ? 'pointer' : 'default',
    textAlign: 'left',
    boxSizing: 'border-box',
  };
​
  return (
    <div
      style={{
        marginBottom: 10,
        border: `1px solid ${ehr.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: ehr.white,
        boxShadow: ehr.shadowCard,
      }}
    >
      {collapsible ? (
        <button type="button" onClick={handleToggle} style={headerStyle}>
          {headerInner}
        </button>
      ) : (
        <div style={headerStyle}>{headerInner}</div>
      )}
      {isOpen && (
        <div style={{ padding: '16px 20px 20px', borderTop: `1px solid ${ehr.borderSoft}` }}>{children}</div>
      )}
    </div>
  );
}
​
/** Libellés de section uppercase comme dans ObservationForm (labelCell) */
export const ehrSectionFieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
};