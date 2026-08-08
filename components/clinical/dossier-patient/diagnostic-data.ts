/*
 * Utilitaires de donnees de diagnostic (DiagnosticData).
 * Extraits de l ancien DiagnosticPanel.tsx (doublon supprime) pour rester
 * partages entre ObservationForm et observation-mapper sans dupliquer le composant.
 */

export interface DiagnosticData {
  retenu: string;
  suspicion: string;
  argumentation: string;
  differentiel: string;
  ecarteCar: string;
  cim10: string;
  scoreSeverite: string;
  hypotheses: string;
}

export function defaultDiagnostic(): DiagnosticData {
  return {
    retenu: "",
    suspicion: "",
    argumentation: "",
    differentiel: "",
    ecarteCar: "",
    cim10: "",
    scoreSeverite: "",
    hypotheses: "",
  };
}

export function diagnosticHasContent(v: DiagnosticData | string | null | undefined): boolean {
  if (!v) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return (
    v.retenu.trim().length > 0 ||
    v.suspicion.trim().length > 0 ||
    v.argumentation.trim().length > 0 ||
    v.differentiel.trim().length > 0 ||
    v.ecarteCar.trim().length > 0 ||
    v.cim10.trim().length > 0 ||
    v.scoreSeverite.trim().length > 0 ||
    v.hypotheses.trim().length > 0
  );
}

export function parseDiagnostic(v: DiagnosticData | string | null | undefined): DiagnosticData {
  if (!v) return defaultDiagnostic();
  if (typeof v === "string") {
    return { ...defaultDiagnostic(), retenu: v };
  }
  return { ...defaultDiagnostic(), ...v };
}
