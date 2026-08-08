'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

/**
 * Champ de sélection avec recherche intégrée (« Searchable Select »).
 * Palette volontairement neutre pour respecter les principes UI/UX
 * (pas d'excès de couleurs).
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  ariaLabel,
  style,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: 220, ...style }}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 10, border: '1px solid var(--bdr, #e5e7eb)',
          background: '#fff', color: 'var(--txt, #1f2937)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {selected?.icon && <span className="ms" style={{ fontSize: 16, color: 'var(--txt3, #9ca3af)' }}>{selected.icon}</span>}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="ms" style={{ fontSize: 18, color: 'var(--txt3, #9ca3af)' }}>{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
            background: '#fff', border: '1px solid var(--bdr, #e5e7eb)', borderRadius: 10,
            boxShadow: '0 12px 30px rgba(0,0,0,0.12)', overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--bdr, #f1f5f9)' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bdr, #e5e7eb)', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--txt3, #9ca3af)', textAlign: 'center' }}>Aucun résultat</div>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => pick(o.value)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, border: 'none',
                      background: active ? 'var(--bg2, #f1f5f9)' : 'transparent',
                      color: 'var(--txt, #1f2937)', fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {o.icon && <span className="ms" style={{ fontSize: 16, color: 'var(--txt3, #9ca3af)' }}>{o.icon}</span>}
                    <span style={{ flex: 1 }}>{o.label}</span>
                    {active && <span className="ms" style={{ fontSize: 16, color: 'var(--navy, #1e3a5f)' }}>check</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
