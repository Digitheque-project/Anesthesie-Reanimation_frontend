'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ehr } from '@/lib/clinical/ehr-theme';
import { CIM10_CODES, type Cim10Entry } from './cim10-codes';

// Normalise (minuscule + suppression des accents) pour une recherche tolérante.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

/**
 * Champ de saisie CIM-10 avec autocomplétion.
 * - Recherche par code OU par libellé (insensible à la casse et aux accents).
 * - La sélection écrit la valeur sous la forme « CODE — Libellé ».
 * - La saisie libre reste autorisée (codes hors référentiel).
 */
export function Cim10Autocomplete({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ferme le menu lorsqu'on clique en dehors du composant.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo<Cim10Entry[]>(() => {
    const q = normalize(value.trim());
    if (!q) return CIM10_CODES.slice(0, 20);
    return CIM10_CODES.map((entry) => {
      const code = normalize(entry.code);
      const label = normalize(entry.label);
      let score = -1;
      if (code === q) score = 100;
      else if (code.startsWith(q)) score = 80;
      else if (label.startsWith(q)) score = 60;
      else if (code.includes(q)) score = 40;
      else if (label.includes(q)) score = 20;
      return { entry, score };
    })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((x) => x.entry);
  }, [value]);

  const select = (entry: Cim10Entry) => {
    onChange(`${entry.code} — ${entry.label}`);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[activeIndex]) {
        e.preventDefault();
        select(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: `1px solid ${ehr.border}`,
    borderRadius: 6,
    backgroundColor: ehr.inputBg,
    color: ehr.text,
    boxSizing: 'border-box',
  };

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 50,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    margin: 0,
    padding: 4,
    listStyle: 'none',
    maxHeight: 260,
    overflowY: 'auto',
    background: '#ffffff',
    border: `1px solid ${ehr.border}`,
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  };

  return (
    <div ref={containerRef} style={ { position: 'relative' } }>
      <input
        type="text"
        value={value}
        placeholder={placeholder || 'Rechercher un code ou un libellé CIM-10…'}
        style={inputStyle}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && results.length > 0 && (
        <ul style={menuStyle}>
          {results.map((entry, i) => (
            <li key={entry.code}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(entry)}
                style={ {
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  background: i === activeIndex ? '#eff6ff' : 'transparent',
                  color: ehr.text,
                } }
              >
                <span style={ { fontWeight: 700, color: ehr.primary, minWidth: 56 } }>
                  {entry.code}
                </span>
                <span>{entry.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
