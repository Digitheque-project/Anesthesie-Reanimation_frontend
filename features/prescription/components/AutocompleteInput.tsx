'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  storageKey?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  style?: React.CSSProperties;
  maxStored?: number;
}

function loadStoredSuggestions(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function saveStoredSuggestion(key: string, value: string, max = 50) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const list = loadStoredSuggestions(key);
  if (!list.includes(trimmed)) {
    list.unshift(trimmed);
    localStorage.setItem(key, JSON.stringify(list.slice(0, max)));
  }
}

export default function AutocompleteInput({
  value, onChange, suggestions, storageKey, placeholder, label, required, error, style, maxStored = 50,
}: Props) {
  const [showList, setShowList] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const allSuggestions = storageKey
    ? [...new Set([...suggestions, ...loadStoredSuggestions(storageKey)])]
    : suggestions;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = useCallback((v: string) => {
    onChange(v);
    if (v.trim()) {
      const lower = v.toLowerCase();
      setFiltered(allSuggestions.filter(s => s.toLowerCase().includes(lower)).slice(0, 15));
      setShowList(true);
    } else {
      setFiltered(allSuggestions.slice(0, 10));
      setShowList(true);
    }
  }, [allSuggestions, onChange]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    if (storageKey) saveStoredSuggestion(storageKey, val, maxStored);
    setShowList(false);
  }, [onChange, storageKey, maxStored]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowList(false), 150);
    if (storageKey && value.trim()) {
      saveStoredSuggestion(storageKey, value, maxStored);
    }
  }, [storageKey, value, maxStored]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
      {label && (
        <label className="lbl">
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => {
          setFiltered(value.trim()
            ? allSuggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
            : allSuggestions.slice(0, 10));
          setShowList(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        style={error ? { borderColor: 'var(--red)' } : undefined}
      />
      {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{error}</div>}
      {showList && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--card, #fff)', border: '1px solid var(--bdr, #e5e7eb)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 180, overflowY: 'auto',
          marginTop: 2,
        }}>
          {filtered.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(s)}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--bdr, #e5e7eb)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-lt, #eef2ff)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
