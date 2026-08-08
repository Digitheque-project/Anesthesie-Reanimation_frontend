const storageKey = (patientId: string) =>
  `chu:dossier-patient-prefill:${encodeURIComponent(patientId)}`;
​
export type DossierPatientRoutePrefill = {
  hospitalisationId?: string;
  serviceId?: string;
  chuId?: string;
  chambreNumero?: number;
  codeLit?: string;
  patient?: Record<string, unknown> | null;
};
​
export function writeDossierPatientPrefill(
  patientId: string,
  data: DossierPatientRoutePrefill,
): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  try {
    globalThis.sessionStorage.setItem(storageKey(patientId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
​
export function readDossierPatientPrefill(
  patientId: string,
): DossierPatientRoutePrefill | null {
  if (typeof globalThis.sessionStorage === "undefined") return null;
  try {
    const raw = globalThis.sessionStorage.getItem(storageKey(patientId));
    if (!raw) return null;
    return JSON.parse(raw) as DossierPatientRoutePrefill;
  } catch {
    return null;
  }
}