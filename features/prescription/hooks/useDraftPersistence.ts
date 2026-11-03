'use client';

import { useEffect, useRef, useCallback } from 'react';

export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

export function loadDraft<T>(key: string, maxAgeMs: number = DRAFT_MAX_AGE_MS): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope: DraftEnvelope<T> = JSON.parse(raw);
    if (!envelope || typeof envelope.savedAt !== 'number') return null;
    if (Date.now() - envelope.savedAt > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearDraftByKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('draft:')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

const DEBOUNCE_MS = 500;

export function useDraftPersistence<T>(
  key: string,
  value: T,
  options?: { skip?: boolean }
): { clearDraft: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skip = options?.skip ?? false;

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    if (skip) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = { data: value, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {}
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value, skip]);

  return { clearDraft };
}
