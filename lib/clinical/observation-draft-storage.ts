const storageKey = (patientId: string, medecinId: number | string) =>
  `chu:observation-draft:${encodeURIComponent(patientId)}:${encodeURIComponent(String(medecinId))}`;

export type ObservationDraft = {
  sections: Record<string, unknown>;
  savedAt: string;
};

export function writeObservationDraft(
  patientId: string,
  medecinId: number | string,
  sections: Record<string, unknown>,
): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    const payload: ObservationDraft = { sections, savedAt: new Date().toISOString() };
    globalThis.localStorage.setItem(storageKey(patientId, medecinId), JSON.stringify(payload));
  } catch {
    /* quota / mode prive */
  }
}

export function readObservationDraft(
  patientId: string,
  medecinId: number | string,
): ObservationDraft | null {
  if (typeof globalThis.localStorage === 'undefined') return null;
  try {
    const raw = globalThis.localStorage.getItem(storageKey(patientId, medecinId));
    if (!raw) return null;
    return JSON.parse(raw) as ObservationDraft;
  } catch {
    return null;
  }
}

export function clearObservationDraft(patientId: string, medecinId: number | string): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.removeItem(storageKey(patientId, medecinId));
  } catch {
    /* mode prive */
  }
}
