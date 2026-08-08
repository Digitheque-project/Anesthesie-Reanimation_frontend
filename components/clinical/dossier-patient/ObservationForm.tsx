'use client';
​
import React, { useState, useEffect } from 'react';
import { isDossierPatientApiConfigured } from '@/lib/clinical/dossier-patient-api';
import { ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';
import { cn } from '@/lib/utils';
import { useCurrentMedecin } from '@/lib/clinical-auth/use-current-medecin';
import { usePermissions } from '@/lib/clinical-auth/use-permissions';
import { type Section, SECTION_DEFINITIONS, sectionHasContent } from '@/lib/clinical/observation-mapper';
import { readObservationDraft } from '@/lib/clinical/observation-draft-storage';
import { useObservationAutosave } from '@/hooks/use-observation-autosave';
import { ObservationReadOnlyView } from '@/components/clinical/dossier-patient/ObservationReadOnlyView';
import { ObservationConfirmModal } from '@/components/clinical/dossier-patient/ObservationConfirmModal';
​
import { AntecedentsPanel, defaultAntecedents } from '@/components/clinical/dossier-patient/AntecedentsPanel';
​
import {
  TraitementEnCoursPanel,
  defaultTraitementEnCours,
} from '@/components/clinical/dossier-patient/TraitementEnCoursPanel';
​
import { MotifPanel, defaultMotif } from '@/components/clinical/dossier-patient/MotifPanel';
​
import {
  ExamenPhysiquePanel,
  defaultExamenPhysique,
} from '@/components/clinical/dossier-patient/ExamenPhysiquePanel';
​
import { EtatGeneralPanel, defaultEtatGeneral } from '@/components/clinical/dossier-patient/EtatGeneralPanel';
​
import {
  ExamenAppareilPanel,
  defaultExamenAppareil,
} from '@/components/clinical/dossier-patient/ExamenAppareilPanel';
​
import {
  ExamensComplementairesPanel,
  defaultExamensComplementaires,
} from '@/components/clinical/dossier-patient/ExamensComplementairesPanel';
​
import { defaultDiagnostic } from '@/components/clinical/dossier-patient/diagnostic-data';
import { DiagnosticTab } from '@/components/clinical/dossier-patient/DiagnosticTab';
​
import {
  HistoireMaladiePanel,
  defaultHistoireMaladie,
} from '@/components/clinical/dossier-patient/HistoireMaladiePanel';
​
import { ConduiteATenirPanel } from '@/components/clinical/dossier-patient/ConduiteATenirPanel';
​
​
export type PatientMode = 'neo' | 'nour' | 'enf' | 'ado';
​
export interface ObservationPatientInfo {
  nom: string;
  prenom: string;
  dateNaissance: string;
  adresse: string;
  sexe: string;
  profession: string;
  contact: string;
  contactUrgence: string;
}
​
function isSectionComplete(section: Section, patientInfo: ObservationPatientInfo | null): boolean {
  return sectionHasContent(section.id, section.content, patientInfo);
}
​
const labelCell: React.CSSProperties = {
  padding: '8px 16px 8px 0',
  width: '28%',
  fontSize: 10,
  fontWeight: 700,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  verticalAlign: 'top',
};
​
const valueCell: React.CSSProperties = {
  padding: '8px 8px 8px 0',
  fontSize: 14,
  color: ehr.text,
  fontWeight: 500,
};
​
function initialSections(): Section[] {
  return SECTION_DEFINITIONS.map((def): Section => {
    const open = def.defaultOpen ?? false;
    if (def.id === "01")
      return { id: def.id, title: def.title, isOpen: true, content: {} };
    if (def.id === "02")
      return { id: def.id, title: def.title, isOpen: open, content: defaultMotif() };
    if (def.id === "03")
      return { id: def.id, title: def.title, isOpen: open, content: defaultAntecedents() };
    if (def.id === "05")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultTraitementEnCours(),
      };
    if (def.id === "06")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: {
          physique: defaultExamenPhysique(),
          etatGeneral: defaultEtatGeneral(),
          appareil: defaultExamenAppareil(),
        }
      };
    if (def.id === "07")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultExamensComplementaires(),
      };
    if (def.id === "08")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultDiagnostic(),
      };
    return { id: def.id, title: def.title, isOpen: open, content: "" };
  });
}
​
export function ObservationForm({
  patientId,
  hydratedPatientInfo = null,
  chuId,
  serviceId,
}: {
  patientId: string;
  hydratedPatientInfo?: ObservationPatientInfo | null;
  chuId?: string;
  serviceId?: string;
}) {
  const medecin = useCurrentMedecin();
  const { canDo } = usePermissions();
  const canCreateObservation = canDo('observation', 'create');
  const [sections, setSections] = useState<Section[]>(() => initialSections());
  const [patientInfo, setPatientInfo] = useState<ObservationPatientInfo | null>(
    hydratedPatientInfo || null,
  );
  const [patientMode, setPatientMode] = useState<PatientMode>('neo');
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [errorPatient, setErrorPatient] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
​
  useEffect(() => {
    setSections(initialSections());
    setPatientInfo(null);
    setErrorPatient(null);
    setLoadingPatient(false);
    setHydrated(false);
  }, [patientId]);
​
  useEffect(() => {
    if (hydratedPatientInfo) {
      setPatientInfo(hydratedPatientInfo);
    }
  }, [JSON.stringify(hydratedPatientInfo)]);
​
  useEffect(() => {
    if (patientInfo && patientInfo.dateNaissance) {
      const dob = new Date(patientInfo.dateNaissance);
      const now = new Date();
      const diffTime = now.getTime() - dob.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
​
      if (diffDays <= 28) {
        setPatientMode('neo');
      } else if (diffDays <= 730) { // approx 2 years
        setPatientMode('nour');
      } else if (diffDays <= 4380) { // approx 12 years
        setPatientMode('enf');
      } else {
        setPatientMode('ado');
      }
    }
  }, [patientInfo]);
​
  // Restauration du brouillon local (anti-coupure) uniquement : tant que
  // l'observation n'est pas enregistree, elle ne vit jamais cote serveur.
  useEffect(() => {
    if (!patientId || !medecin) {
      setHydrated(true);
      return;
    }
    const localDraft = readObservationDraft(patientId, medecin.id);
    if (localDraft) {
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          content:
            localDraft.sections[section.id] !== undefined
              ? localDraft.sections[section.id]
              : section.content,
        })),
      );
    }
    setHydrated(true);
  }, [patientId, medecin]);
​
  const autosave = useObservationAutosave({
    patientId,
    chuId,
    serviceId,
    medecin,
    sections,
    ready: hydrated,
  });
​
  const startNewObservation = () => {
    autosave.reset();
    setSections(initialSections());
  };
​
  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === id) {
          return { ...section, isOpen: !section.isOpen };
        }
        return { ...section, isOpen: false };
      })
    );
  };
​
  const updateSectionContent = (id: string, content: any) => {
    setSections(prev =>
      prev.map(section => (section.id === id ? { ...section, content } : section))
    );
  };
​
  const handleConfirmSave = async () => {
    const success = await autosave.finalize();
    if (success) {
      setConfirmOpen(false);
    }
  };
​
  const iconStroke = 1.75;
​
  if (!medecin) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-800">
        <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={2} />
        <div className="font-semibold">
          Aucun médecin authentifié — la saisie et la sauvegarde de l&apos;observation sont désactivées.
        </div>
      </div>
    );
  }
​
  if (autosave.isFinalized) {
    const sectionContentMap = sections.reduce((acc, s) => {
      acc[s.id] = s.content;
      return acc;
    }, {} as Record<string, unknown>);
    return (
      <div className="font-sans">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Observation enregistrée — lecture seule
          </div>
          <button
            type="button"
            onClick={startNewObservation}
            disabled={!canCreateObservation}
            title={!canCreateObservation ? "Vous n'avez pas la permission de créer une observation" : undefined}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Démarrer une nouvelle observation
          </button>
        </div>
        <ObservationReadOnlyView
          sections={sectionContentMap}
          patientInfo={patientInfo}
          authorLabel={`Dr. ${medecin.nom} ${medecin.prenom}`.trim()}
        />
      </div>
    );
  }
​
  return (
    <div className="font-sans">
      {sections.map((section) => {
        const complete = isSectionComplete(section, patientInfo);
        return (
          <div
            key={section.id}
            className="mb-2.5 overflow-hidden rounded-xl border bg-white"
            style={{
              borderColor: ehr.border,
              boxShadow: ehr.shadowCard,
            }}
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full cursor-pointer items-center gap-4 border-none bg-white px-5 py-4 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[13px] font-bold text-white">
                {section.id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold" style={{ color: ehr.text }}>
                  {section.title}
                </div>
                {!section.isOpen ? (
                  <p className="mt-1 text-[12px] font-normal text-slate-500">
                    Cliquez pour ouvrir
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {complete ? (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: ehr.success }}
                  >
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border-2 border-slate-300 bg-white"
                    aria-hidden
                  />
                )}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                    section.isOpen ? "rotate-180" : "rotate-0",
                  )}
                  strokeWidth={iconStroke}
                />
              </div>
            </button>
            {section.isOpen && (
              <div style={{ padding: '16px 20px 20px', borderTop: `1px solid ${ehr.borderSoft}` }}>
                {section.id === '01' && loadingPatient && (
                  <div className="animate-pulse space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-3/4 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-3/4 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/2 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-5/6 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/3 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-2/3 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/2 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/2 rounded bg-slate-100"></div>
                      </div>
                    </div>
                  </div>
                )}
​
                {section.id === '01' && errorPatient && (
                  <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[14px] text-red-700">
                    <span className="text-base" aria-hidden>⚠️</span>
                    <div className="flex-1 font-semibold">{errorPatient}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setPatientInfo(null);
                        setErrorPatient(null);
                      }}
                      className="cursor-pointer rounded bg-red-100 px-3 py-1.5 text-[12px] font-bold text-red-800 transition hover:bg-red-200"
                    >
                      Réessayer
                    </button>
                  </div>
                )}
​
                {section.id === '01' && !loadingPatient && !errorPatient && !patientInfo && (
                  <div className="text-center py-6 text-slate-500 text-[14px] font-medium">
                    Aucune donnée d'identification disponible pour ce patient.
                  </div>
                )}
​
                {section.id === '01' && !loadingPatient && !errorPatient && patientInfo && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Nom de famille</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.nom}</div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Prénom(s)</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.prenom}</div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Date de naissance</span>
                      <div style={{ ...valueCell, padding: 0 }}>
                        {patientInfo.dateNaissance
                          ? new Date(patientInfo.dateNaissance).toLocaleDateString('fr-FR')
                          : ''}
                      </div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Adresse</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.adresse}</div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Sexe</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.sexe}</div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Profession</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.profession}</div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Contact patient</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.contact}</div>
                    </div>
                    <div>
                      <span style={{ ...labelCell, width: 'auto', padding: '0 0 4px', display: 'block' }}>Contact urgence</span>
                      <div style={{ ...valueCell, padding: 0 }}>{patientInfo.contactUrgence}</div>
                    </div>
                  </div>
                )}
​
                {section.id === '01' && patientMode === 'neo' && (
                  <div className="mt-4 rounded border border-[#d0b8f0] bg-[#f4effe] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Champs spécifiques néonatologie</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Terme de naissance (SA)</label>
                        <input
                          type="number"
                          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-[14px]"
                          placeholder="Ex: 38"
                          value={section.content?.termeSA || ''}
                          onChange={e => updateSectionContent('01', { ...section.content, termeSA: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">+ jours</label>
                        <input
                          type="number"
                          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-[14px]"
                          placeholder="0-6"
                          value={section.content?.termeJours || ''}
                          onChange={e => updateSectionContent('01', { ...section.content, termeJours: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Âge corrigé actuel</label>
                        <input
                          type="text"
                          readOnly
                          className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-500"
                          placeholder="Calcul automatique"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Terme : statut</label>
                        <select
                          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-[14px]"
                          value={section.content?.statutTerme || ''}
                          onChange={e => updateSectionContent('01', { ...section.content, statutTerme: e.target.value })}
                        >
                          <option value="">— Statut</option>
                          <option value="À terme (≥37 SA)">À terme (≥37 SA)</option>
                          <option value="Prématuré tardif (34–36+6 SA)">Prématuré tardif (34–36+6 SA)</option>
                          <option value="Prématuré modéré (32–33+6 SA)">Prématuré modéré (32–33+6 SA)</option>
                          <option value="Grand prématuré (28–31+6 SA)">Grand prématuré (28–31+6 SA)</option>
                          <option value="Très grand prématuré (<28 SA)">Très grand prématuré (&lt;28 SA)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
​
                {section.id === '02' && (
                  <MotifPanel
                    value={section.content}
                    onChange={next => updateSectionContent('02', next)}
                  />
                )}
​
                {section.id === '03' && (
                  <AntecedentsPanel
                    value={section.content}
                    onChange={next => updateSectionContent('03', next)}
                  />
                )}
​
                {section.id === '04' && (
                  <HistoireMaladiePanel
                    value={section.content}
                    onChange={next => updateSectionContent('04', next)}
                  />
                )}
​
                {section.id === '05' && (
                  <TraitementEnCoursPanel
                    value={section.content}
                    onChange={next => updateSectionContent('05', next)}
                  />
                )}
​
                {section.id === '06' && (
                  <div className="flex flex-col gap-6">
                    <div className="rounded border border-slate-200 p-4">
                      <h4 className="mb-3 text-[12px] font-bold uppercase text-slate-800">Constantes & Croissance</h4>
                      <ExamenPhysiquePanel
                        value={section.content?.physique || defaultExamenPhysique()}
                        onChange={next => updateSectionContent('06', { ...section.content, physique: next })}
                      />
                    </div>
                    <div className="rounded border border-slate-200 p-4">
                      <h4 className="mb-3 text-[12px] font-bold uppercase text-slate-800">État général et Conscience</h4>
                      <EtatGeneralPanel
                        value={section.content?.etatGeneral || defaultEtatGeneral()}
                        onChange={next => updateSectionContent('06', { ...section.content, etatGeneral: next })}
                      />
                    </div>
                    <div className="rounded border border-slate-200 p-4">
                      <h4 className="mb-3 text-[12px] font-bold uppercase text-slate-800">Examen par appareil</h4>
                      <ExamenAppareilPanel
                        value={section.content?.appareil || defaultExamenAppareil()}
                        onChange={next => updateSectionContent('06', { ...section.content, appareil: next })}
                      />
                    </div>
                  </div>
                )}
​
                {section.id === '07' && (
                  <ExamensComplementairesPanel
                    value={section.content}
                    onChange={next => updateSectionContent('07', next)}
                  />
                )}
​
                {section.id === '08' && (
                  <DiagnosticTab
                    patientId={patientId}
                    chuId={chuId}
                    serviceId={serviceId}
                  />
                )}
​
                {section.id === '09' && (
                  <ConduiteATenirPanel
                    value={section.content}
                    onChange={next => updateSectionContent('09', next)}
                  />
                )}
​
              </div>
            )}
          </div>
        );
      })}
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-5 py-4"
        style={{ borderColor: ehr.border, boxShadow: ehr.shadowCard }}
      >
        <div className="text-[12px]" style={{ color: ehr.textMuted }}>
          {isDossierPatientApiConfigured() ? (
            autosave.lastLocalSave ? (
              <>Brouillon sauvegardé localement à {autosave.lastLocalSave.toLocaleTimeString('fr-FR')} (anti-coupure, pas encore envoyé)</>
            ) : (
              'Prêt — votre saisie est sauvegardée localement au fil de la frappe'
            )
          ) : (
            <span>
              Sauvegarde cloud désactivée (définir{" "}
              <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_DOSSIER_API_URL</code>).
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canCreateObservation}
          title={!canCreateObservation ? "Vous n'avez pas la permission de créer une observation" : undefined}
          className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: ehr.primary }}
        >
          Enregistrer l&apos;observation
        </button>
      </div>
​
      <ObservationConfirmModal
        open={confirmOpen}
        saving={autosave.finalizing}
        error={autosave.finalizeError}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmSave()}
      />
    </div>
  );
}
​