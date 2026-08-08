'use client';
​
import { useCallback, useEffect, useRef, useState } from 'react';
import { dossierPatientApi as api, isDossierPatientApiConfigured } from '@/lib/clinical/dossier-patient-api';
import {
  buildCreateObservationDto,
  toFakeMedecinUuid,
  type Section,
} from '@/lib/clinical/observation-mapper';
import { clearObservationDraft, writeObservationDraft } from '@/lib/clinical/observation-draft-storage';
​
interface CurrentMedecin {
  id: number | string;
  nom: string;
  prenom: string;
}
​
interface UseObservationAutosaveParams {
  patientId: string;
  chuId?: string;
  serviceId?: string;
  medecin: CurrentMedecin | null;
  sections: Section[];
  /** true une fois la restauration du brouillon local (s'il existe) terminee */
  ready: boolean;
}
​
interface UseObservationAutosaveResult {
  /** dernier instant ou le brouillon a ete ecrit en local (anti-coupure), independant du reseau */
  lastLocalSave: Date | null;
  isFinalized: boolean;
  observationId: string | null;
  finalizing: boolean;
  finalizeError: string | null;
  /** Enregistre definitivement l'observation cote serveur (isDraft: false). Retourne true si succes. */
  finalize: () => Promise<boolean>;
  /** Repart sur une observation vierge (apres finalisation, pour une nouvelle saisie). */
  reset: () => void;
}
​
export function useObservationAutosave(params: UseObservationAutosaveParams): UseObservationAutosaveResult {
  const { patientId, chuId, serviceId, medecin, sections, ready } = params;
​
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [observationId, setObservationId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
​
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
​
  // Brouillon local immediat (anti-coupure) — jamais d'appel reseau ici.
  useEffect(() => {
    if (!ready || !patientId || !medecin || isFinalized) return;
    const sectionMap = sections.reduce((acc, s) => {
      acc[s.id] = s.content;
      return acc;
    }, {} as Record<string, unknown>);
    writeObservationDraft(patientId, medecin.id, sectionMap);
    setLastLocalSave(new Date());
  }, [ready, sections, patientId, medecin, isFinalized]);
​
  const finalize = useCallback(async (): Promise<boolean> => {
    if (!medecin) {
      setFinalizeError('Aucun médecin authentifié.');
      return false;
    }
    if (!patientId || !chuId || !serviceId || !isDossierPatientApiConfigured()) {
      setFinalizeError("Configuration manquante (patient/chuId/serviceId), impossible d'enregistrer.");
      return false;
    }
​
    setFinalizing(true);
    setFinalizeError(null);
    try {
      const dto = buildCreateObservationDto(sectionsRef.current, {
        chuId,
        serviceId,
        patientId,
        createdBy: toFakeMedecinUuid(medecin.id),
      });
      const res = await api.post('/observations', dto);
      const id: string | null = res.data?.data?.id ?? res.data?.id ?? null;
      setObservationId(id);
      setIsFinalized(true);
      clearObservationDraft(patientId, medecin.id);
      return true;
    } catch (error) {
      console.error('Erreur enregistrement observation:', error);
      const backendMessage = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const detail = Array.isArray(backendMessage) ? backendMessage.join(' ; ') : backendMessage;
      setFinalizeError(
        detail
          ? `L'enregistrement a échoué : ${detail}`
          : "L'enregistrement a échoué. Votre saisie reste sauvegardée localement, vous pouvez réessayer.",
      );
      return false;
    } finally {
      setFinalizing(false);
    }
  }, [medecin, patientId, chuId, serviceId]);
​
  const reset = useCallback(() => {
    setIsFinalized(false);
    setObservationId(null);
    setFinalizeError(null);
    setLastLocalSave(null);
    if (medecin) clearObservationDraft(patientId, medecin.id);
  }, [medecin, patientId]);
​
  return {
    lastLocalSave,
    isFinalized,
    observationId,
    finalizing,
    finalizeError,
    finalize,
    reset,
  };
}