'use client';

import React from 'react';
import {
  User,
  Stethoscope,
  ClipboardList,
  BookOpen,
  Pill,
  Activity,
  FlaskConical,
  ClipboardCheck,
  ListChecks,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';
import { SECTION_DEFINITIONS, sectionHasContent } from '@/lib/clinical/observation-mapper';
import type { ObservationPatientInfo } from '@/components/clinical/dossier-patient/ObservationForm';

interface Props {
  sections: Record<string, unknown>;
  patientInfo: ObservationPatientInfo | null;
  finalizedAt?: string | null;
  authorLabel?: string | null;
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  '01': User,
  '02': Stethoscope,
  '03': ClipboardList,
  '04': BookOpen,
  '05': Pill,
  '06': Activity,
  '07': FlaskConical,
  '08': ClipboardCheck,
  '09': ListChecks,
};

function formatKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((item, idx) => (
          <li key={idx}>
            {typeof item === 'object' && item !== null ? renderValue(item, depth + 1) : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== '',
    );
    if (entries.length === 0) return null;
    return (
      <div className={depth === 0 ? 'space-y-2' : 'space-y-1 border-l-2 border-slate-200 pl-3'}>
        {entries.map(([key, v]) => (
          <div key={key} className="text-[13px] text-slate-700">
            <span className="font-semibold text-slate-800">{formatKey(key)} : </span>
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  return String(value);
}

export function ObservationReadOnlyView({ sections, patientInfo, finalizedAt, authorLabel }: Props) {
  const visibleSections = SECTION_DEFINITIONS.filter((def) =>
    sectionHasContent(def.id, def.id === '01' ? patientInfo : sections[def.id], patientInfo),
  );

  return (
    <div className="font-sans space-y-3">
      {(finalizedAt || authorLabel) && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
            <CheckCircle2 className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </span>
          <div className="text-[13px] font-semibold text-emerald-800">
            {finalizedAt ? `Enregistrée le ${new Date(finalizedAt).toLocaleString('fr-FR')}` : 'Enregistrée'}
            {authorLabel ? ` par ${authorLabel}` : ''}
          </div>
        </div>
      )}

      {visibleSections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-[13px] text-slate-400">
          Aucune section renseignée.
        </div>
      ) : (
        visibleSections.map((def) => {
          const content = def.id === '01' ? patientInfo : sections[def.id];
          const Icon = SECTION_ICONS[def.id] ?? ClipboardList;
          return (
            <div
              key={def.id}
              className="overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: ehr.border, boxShadow: ehr.shadowCard }}
            >
              <div
                className="flex items-center gap-3 border-b px-5 py-3"
                style={{ borderColor: ehr.borderSoft, backgroundColor: ehr.primaryLight }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: ehr.white }}
                >
                  <Icon className="h-4 w-4" style={{ color: ehr.primary }} strokeWidth={2} />
                </span>
                <div className="text-[14px] font-bold" style={{ color: ehr.primary }}>
                  {def.title}
                </div>
              </div>
              <div className="px-5 py-4">
                {typeof content === 'string' ? (
                  <p className="whitespace-pre-wrap text-[13px] text-slate-700">{content}</p>
                ) : (
                  renderValue(content)
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
