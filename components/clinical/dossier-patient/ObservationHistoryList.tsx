'use client';
​
import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileText, Stethoscope } from 'lucide-react';
import {
  dossierPatientApi as api,
  isDossierPatientApiConfigured,
} from '@/lib/clinical/dossier-patient-api';
import { ehr } from '@/lib/clinical/ehr-theme';
import { parseObservationToSections, toFakeMedecinUuid } from '@/lib/clinical/observation-mapper';
import type { Observation } from '@/types/observation.types';
import { ObservationReadOnlyView } from '@/components/clinical/dossier-patient/ObservationReadOnlyView';
import { useCurrentMedecin } from '@/lib/clinical-auth/use-current-medecin';
​
interface Props {
  readonly patientId: string;
  readonly chuId?: string;
  readonly serviceId?: string;
}
​
type CurrentMedecin = { id: number | string; nom: string; prenom: string } | null;
​
// Le backend ne renvoie qu'un identifiant d'auteur (createdBy), sans nom —
// on ne peut afficher un nom que pour le medecin actuellement connecte.
// createdBy est un faux UUID derive de l'id entier (cf. toFakeMedecinUuid,
// temporaire en attendant le vrai service d'authentification).
function authorLabelOf(obs: Observation, currentMedecin: CurrentMedecin): string {
  if (!obs.createdBy) return 'Auteur non disponible';
  if (currentMedecin && obs.createdBy === toFakeMedecinUuid(currentMedecin.id)) {
    return `Vous (Dr. ${currentMedecin.prenom} ${currentMedecin.nom})`.trim();
  }
  return `Médecin #${obs.createdBy}`;
}
​
function isOwnObservation(obs: Observation, currentMedecin: CurrentMedecin): boolean {
  return !!currentMedecin && obs.createdBy === toFakeMedecinUuid(currentMedecin.id);
}
​
function initialsOf(currentMedecin: CurrentMedecin): string {
  if (!currentMedecin) return 'Dr';
  return `${currentMedecin.prenom?.[0] ?? ''}${currentMedecin.nom?.[0] ?? ''}`.toUpperCase() || 'Dr';
}
​
function previewOf(obs: Observation): string | null {
  const sections = parseObservationToSections(obs);
  const motif = (sections['02'] as { motifPrincipal?: string } | undefined)?.motifPrincipal;
  const diagnostic = (sections['08'] as { retenu?: string } | undefined)?.retenu;
  const preview = motif || diagnostic;
  return preview ? preview.trim() : null;
}
​
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}
​
export function ObservationHistoryList({ patientId, chuId, serviceId }: Props) {
  const medecin = useCurrentMedecin();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Observation | null>(null);
​
  useEffect(() => {
    if (!patientId || !chuId || !serviceId || !isDossierPatientApiConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/observations/patient/${patientId}`, {
          params: { chuId, serviceId },
        });
        if (cancelled) return;
        const list: Observation[] = res.data?.data || [];
        // Garde defensive : ne garder que les observations de ce patient,
        // au cas ou le backend renverrait un perimetre plus large que demande.
        const ownPatientList = list.filter((obs) => String(obs.patientId) === String(patientId));
        ownPatientList.sort(
          (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        );
        setObservations(ownPatientList);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement historique observations:', err);
        if (!cancelled) setError("Impossible de charger l'historique des observations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, chuId, serviceId]);
​
  if (selected) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mb-3 inline-flex items-center gap-1 text-[12px] font-bold text-slate-600 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Retour à l&apos;historique
        </button>
        <ObservationReadOnlyView
          sections={parseObservationToSections(selected)}
          patientInfo={null}
          finalizedAt={selected.createdAt ?? null}
          authorLabel={authorLabelOf(selected, medecin)}
        />
      </div>
    );
  }
​
  if (loading) {
    return <div className="py-8 text-center text-[13px] text-slate-500">Chargement de l&apos;historique…</div>;
  }
​
  if (error) {
    return <div className="py-8 text-center text-[13px] text-red-600">{error}</div>;
  }
​
  if (observations.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <FileText className="mx-auto mb-3 h-10 w-10" strokeWidth={1.5} />
        <p className="text-[13px]">Aucune observation enregistrée pour ce patient.</p>
      </div>
    );
  }
​
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">
        <FileText className="h-3.5 w-3.5" strokeWidth={2} />
        {observations.length} observation{observations.length > 1 ? 's' : ''} enregistrée
        {observations.length > 1 ? 's' : ''}
      </div>
      <div className="space-y-3">
        {observations.map((obs) => {
          const own = isOwnObservation(obs, medecin);
          const preview = previewOf(obs);
          return (
            <button
              type="button"
              key={obs.id}
              onClick={() => setSelected(obs)}
              className="group flex w-full items-start gap-4 rounded-2xl border bg-white px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: ehr.border, boxShadow: ehr.shadowCard }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: own ? ehr.primary : ehr.textMuted }}
              >
                {own ? initialsOf(medecin) : <Stethoscope className="h-5 w-5" strokeWidth={2} />}
              </span>
​
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-[14px] font-bold" style={{ color: ehr.text }}>
                    {authorLabelOf(obs, medecin)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <Calendar className="h-3 w-3" strokeWidth={2} />
                    {formatDate(obs.createdAt)}
                  </span>
                </div>
                {preview ? (
                  <p className="mt-1.5 truncate text-[13px] italic text-slate-500">&laquo; {preview} &raquo;</p>
                ) : (
                  <p className="mt-1.5 text-[12px] text-slate-400">Observation médicale générale</p>
                )}
              </div>
​
              <ChevronRight
                className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
​