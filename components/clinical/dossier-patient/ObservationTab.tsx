'use client';
​
import React, { useEffect, useState } from 'react';
import { History, NotebookPen, Plus, Stethoscope } from 'lucide-react';
import {
  dossierPatientApi as api,
  isDossierPatientApiConfigured,
} from '@/lib/clinical/dossier-patient-api';
import { ehr } from '@/lib/clinical/ehr-theme';
import { cn } from '@/lib/utils';
import { parseObservationToSections, toFakeMedecinUuid } from '@/lib/clinical/observation-mapper';
import type { Observation } from '@/types/observation.types';
import { useCurrentMedecin } from '@/lib/clinical-auth/use-current-medecin';
import { usePermissions } from '@/lib/clinical-auth/use-permissions';
import { ObservationForm, type ObservationPatientInfo } from '@/components/clinical/dossier-patient/ObservationForm';
import { ObservationHistoryList } from '@/components/clinical/dossier-patient/ObservationHistoryList';
import { ObservationReadOnlyView } from '@/components/clinical/dossier-patient/ObservationReadOnlyView';
​
type View = 'latest' | 'form' | 'history';
​
interface Props {
  patientId: string;
  hydratedPatientInfo?: ObservationPatientInfo | null;
  chuId?: string;
  serviceId?: string;
}
​
type CurrentMedecin = { id: number | string; nom: string; prenom: string } | null;
​
// Le backend ne renvoie qu'un identifiant d'auteur (createdBy), sans nom :
// on ne peut afficher un nom que pour le medecin actuellement connecte.
function authorLabelOf(obs: Observation, currentMedecin: CurrentMedecin): string {
  if (!obs.createdBy) return 'Auteur non disponible';
  if (currentMedecin && obs.createdBy === toFakeMedecinUuid(currentMedecin.id)) {
    return `Vous (Dr. ${currentMedecin.prenom} ${currentMedecin.nom})`.trim();
  }
  return `Médecin #${obs.createdBy}`;
}
​
export function ObservationTab({ patientId, hydratedPatientInfo, chuId, serviceId }: Props) {
  const medecin = useCurrentMedecin();
  const { canDo } = usePermissions();
  const canCreateObservation = canDo('observation', 'create');
  const [view, setView] = useState<View>('form');
  const [latest, setLatest] = useState<Observation | null>(null);
  const [checking, setChecking] = useState(true);
​
  // Au chargement de l'onglet, on regarde si le patient possede deja des
  // observations. Si oui, on affiche d'abord la plus recente (lecture seule) ;
  // sinon, on ouvre directement le formulaire de nouvelle observation.
  useEffect(() => {
    if (!patientId || !chuId || !serviceId || !isDossierPatientApiConfigured()) {
      setChecking(false);
      setView('form');
      return;
    }
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const res = await api.get(`/observations/patient/${patientId}`, {
          params: { chuId, serviceId },
        });
        if (cancelled) return;
        const list: Observation[] = (res.data?.data || []).filter(
          (obs: Observation) => String(obs.patientId) === String(patientId),
        );
        // Tri decroissant : l'observation la plus recente en premier.
        list.sort(
          (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        );
        const mostRecent = list[0] ?? null;
        setLatest(mostRecent);
        setView(mostRecent ? 'latest' : 'form');
      } catch (err) {
        console.error('Erreur chargement observations:', err);
        if (!cancelled) setView('form');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, chuId, serviceId]);
​
 const tabBtn = (active: boolean) =>
   cn(
     'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors',
     active ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
   );
  const primaryBtnStyle = { backgroundColor: ehr.primary };
  let content: React.ReactNode;

  if (checking) {
    content = (
      <div className="py-8 text-center text-[13px] text-slate-500">
        Chargement de l&apos;observation…
      </div>
    );
  } else if (view === 'latest' && latest) {
    content = (
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
            Observation la plus récente
          </p>
          <button
            type="button"
            onClick={() => setView('form')}
            disabled={!canCreateObservation}
            title={!canCreateObservation ? "Vous n'avez pas la permission de créer une observation" : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={primaryBtnStyle}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Faire une nouvelle observation
          </button>
        </div>
        <ObservationReadOnlyView
          sections={parseObservationToSections(latest)}
          patientInfo={hydratedPatientInfo ?? null}
          finalizedAt={latest.createdAt ?? null}
          authorLabel={authorLabelOf(latest, medecin)}
        />
      </div>
    );
  } else if (view === 'history') {
    content = <ObservationHistoryList patientId={patientId} chuId={chuId} serviceId={serviceId} />;
  } else {
    content = (
      <ObservationForm
        patientId={patientId}
        hydratedPatientInfo={hydratedPatientInfo}
        chuId={chuId}
        serviceId={serviceId}
      />
    );
  }
​
  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {latest && (
          <button
            type="button"
            onClick={() => setView('latest')}
            className={tabBtn(view === 'latest')}
            style={view === 'latest' ? { color: ehr.primary } : undefined}
          >
            <Stethoscope className="h-3.5 w-3.5" strokeWidth={2} />
            Observation récente
          </button>
        )}
        <button
          type="button"
          onClick={() => setView('form')}
          disabled={!canCreateObservation}
          title={!canCreateObservation ? "Vous n'avez pas la permission de créer une observation" : undefined}
          className={cn(tabBtn(view === 'form'), !canCreateObservation && 'opacity-50 cursor-not-allowed')}
          style={view === 'form' ? { color: ehr.primary } : undefined}
        >
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
          {latest ? 'Nouvelle observation' : 'Observation en cours'}
        </button>
        <button
          type="button"
          onClick={() => setView('history')}
          className={tabBtn(view === 'history')}
          style={view === 'history' ? { color: ehr.primary } : undefined}
        >
          <History className="h-3.5 w-3.5" strokeWidth={2} />
          Historique des observations
        </button>
      </div>
​
      {content}
    </div>
  );
}