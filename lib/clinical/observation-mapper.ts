import type { CreateObservationDto, Observation } from '@/types/observation.types';
import type { ObservationPatientInfo } from '@/components/clinical/dossier-patient/ObservationForm';
import { parseAntecedentsContent, antecedentsHasContent } from '@/components/clinical/dossier-patient/AntecedentsPanel';
import {
  defaultTraitementEnCours,
  traitementHasContent,
} from '@/components/clinical/dossier-patient/TraitementEnCoursPanel';
import { defaultMotif, motifHasContent } from '@/components/clinical/dossier-patient/MotifPanel';
import {
  defaultExamenPhysique,
  examenPhysiqueHasContent,
} from '@/components/clinical/dossier-patient/ExamenPhysiquePanel';
import { defaultEtatGeneral, etatGeneralHasContent } from '@/components/clinical/dossier-patient/EtatGeneralPanel';
import {
  defaultExamenAppareil,
  examenAppareilHasContent,
} from '@/components/clinical/dossier-patient/ExamenAppareilPanel';
import {
  defaultExamensComplementaires,
  examensComplementairesHasContent,
} from '@/components/clinical/dossier-patient/ExamensComplementairesPanel';
import { defaultDiagnostic, diagnosticHasContent } from '@/components/clinical/dossier-patient/diagnostic-data';
import { histoireMaladieHasContent } from '@/components/clinical/dossier-patient/HistoireMaladiePanel';
import {
  defaultConduiteATenir,
  conduiteATenirHasContent,
} from '@/components/clinical/dossier-patient/ConduiteATenirPanel';
​
export interface Section {
  id: string;
  title: string;
  isOpen: boolean;
  content: any;
}
​
// TEMPORAIRE — le service d'authentification actuel donne des id medecin
// entiers (1, 2, 3...), mais le backend dossier-patient valide `createdBy`
// comme un UUID. En attendant un vrai service d'auth qui fournisse des UUID,
// on derive un faux UUID v4 stable a partir de l'id entier : meme medecin =
// toujours le meme faux UUID (donc l'attribution par auteur reste coherente
// d'une session a l'autre, et l'historique peut detecter "mes" observations).
// A retirer des que l'auth renvoie un vrai UUID.
export function toFakeMedecinUuid(medecinId: number | string): string {
  // Le portail externe fournit deja un vrai UUID (userId du JWT) : on l'emploie
  // tel quel comme auteur. Le fallback numerique reste pour l'ancien systeme.
  if (typeof medecinId === 'string') {
    return medecinId;
  }
  const hex = Math.abs(medecinId).toString(16).padStart(12, '0').slice(-12);
  return `00000000-0000-4000-a000-${hex}`;
}
​
// Source partagee entre ObservationForm (edition) et ObservationReadOnlyView
// (lecture seule) pour eviter une dependance circulaire entre les deux.
export const SECTION_DEFINITIONS: { id: string; title: string; defaultOpen?: boolean }[] = [
  { id: '01', title: 'Identification du patient', defaultOpen: true },
  { id: '02', title: "Motif de consultation / d'hospitalisation" },
  { id: '03', title: 'Antécédents' },
  { id: '04', title: 'Histoire de la maladie' },
  { id: '05', title: 'Traitements en cours' },
  { id: '06', title: 'Examen physique' },
  { id: '07', title: 'Examens complémentaires' },
  { id: '08', title: 'Diagnostic' },
  { id: '09', title: 'Conduite à tenir' },
];
​
// Logique unique de "cette section a-t-elle du contenu ?", partagee entre
// l'edition (badge de completion) et la lecture seule (masquer les sections
// vides dans l'historique).
export function sectionHasContent(
  id: string,
  content: any,
  patientInfo: ObservationPatientInfo | null,
): boolean {
  if (id === '01') return !!patientInfo;
  if (id === '02') return motifHasContent(content);
  if (id === '03') return antecedentsHasContent(content);
  if (id === '04') return histoireMaladieHasContent(content);
  if (id === '05') return traitementHasContent(content);
  if (id === '06')
    return (
      examenPhysiqueHasContent(content?.physique) ||
      etatGeneralHasContent(content?.etatGeneral) ||
      examenAppareilHasContent(content?.appareil)
    );
  if (id === '07') return examensComplementairesHasContent(content);
  if (id === '08') return diagnosticHasContent(content);
  if (id === '09') return conduiteATenirHasContent(content);
​
  if (typeof content === 'string') return content.trim().length > 0;
  if (content && typeof content === 'object') return Object.keys(content).length > 0;
  return false;
}
​
function parseJsonArray(raw: string | undefined): unknown[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseSymptoms(raw: string | undefined): { parsed: any; oldMotif: string } {
  if (!raw) return { parsed: {}, oldMotif: '' };
  try {
    const parsed = JSON.parse(raw);
    return { parsed, oldMotif: parsed.motif || '' };
  } catch {
    return { parsed: {}, oldMotif: raw };
  }
}

function parseMedicalHistory(raw: string | undefined): { oldHistoire: string; antecedentsRaw: any } {
  if (!raw) return { oldHistoire: '', antecedentsRaw: '' };
  try {
    const parsed = JSON.parse(raw);
    return {
      oldHistoire: parsed.histoire || '',
      antecedentsRaw: parsed.antecedents || parsed,
    };
  } catch {
    return { oldHistoire: raw, antecedentsRaw: '' };
  }
}

function parseClinicalImpressions(raw: string | undefined): { parsed: any; oldDiagnostic: any } {
  if (!raw) return { parsed: {}, oldDiagnostic: '' };
  try {
    const parsed = JSON.parse(raw);
    return { parsed, oldDiagnostic: parsed.diagnostic || parsed };
  } catch {
    return { parsed: {}, oldDiagnostic: raw };
  }
}

function parsePhysicalExamination(raw: string | undefined): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizePhysicalSection(raw: unknown): unknown {
  const isObj = typeof raw === 'object' && raw !== null;
  const section = (isObj ? raw : {}) as any;
  return {
    physique: section.physique || defaultExamenPhysique(),
    etatGeneral: section.etatGeneral || defaultEtatGeneral(),
    appareil: section.appareil || defaultExamenAppareil(),
  };
}

function normalizeDiagnosticSection(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return defaultDiagnostic();
  return { ...defaultDiagnostic(), ...raw };
}

function normalizeSection(id: string, raw: unknown): unknown {
  switch (id) {
    case '02':
      return raw || defaultMotif();
    case '03':
      return parseAntecedentsContent(raw);
    case '05':
      return Array.isArray(raw) ? raw : defaultTraitementEnCours();
    case '06':
      return normalizePhysicalSection(raw);
    case '07':
      return Array.isArray(raw) ? raw : defaultExamensComplementaires();
    case '08':
      return normalizeDiagnosticSection(raw);
    case '09':
      return raw || defaultConduiteATenir();
    default:
      return raw;
  }
}
​
// Reconstruit, pour chaque id de section ('02'..'09'), le contenu a injecter
// dans le formulaire depuis une observation chargee du serveur. Les sections
// absentes de cette map (ex: '01', '10') doivent garder leur contenu courant
// cote appelant.
export function parseObservationToSections(obs: Observation): Record<string, unknown> {
  const { parsed: parsedSymptoms, oldMotif } = parseSymptoms(obs.symptoms);
  const { oldHistoire, antecedentsRaw } = parseMedicalHistory(obs.medicalHistory);
  const { parsed: parsedImpressions, oldDiagnostic } = parseClinicalImpressions(obs.clinicalImpressions);
  const parsedPhysical = parsePhysicalExamination(obs.physicalExamination);
​
  const sec06 = {
    physique:
      parsedPhysical?.physique ?? {
        tension: obs.systolicBP ? `${obs.systolicBP}/${obs.diastolicBP}` : '',
        pouls: obs.heartRate?.toString() || '',
        temperature: obs.temperature?.toString() || '',
        poids: obs.weight?.toString() || '',
        taille: obs.height?.toString() || '',
      },
    etatGeneral: parsedPhysical?.etatGeneral ?? defaultEtatGeneral(),
    appareil: parsedPhysical?.appareil ?? defaultExamenAppareil(),
  };
​
  const data: Record<string, unknown> = {
    '02': parsedSymptoms.motif || oldMotif || '',
    '03': antecedentsRaw,
    '04': parsedSymptoms.histoire || oldHistoire || '',
    '05': parseJsonArray(obs.currentTreatments),
    '06': sec06,
    '07': parseJsonArray(obs.complementaryExams),
    '08': oldDiagnostic || '',
    '09': parsedImpressions.conduite || '',
  };
​
  const normalized: Record<string, unknown> = {};
  for (const [id, raw] of Object.entries(data)) {
    normalized[id] = normalizeSection(id, raw);
  }
​
  return normalized;
}
​
function sectionMapOf(sections: Section[]): Record<string, unknown> {
  return sections.reduce((acc, section) => {
    acc[section.id] = section.content;
    return acc;
  }, {} as Record<string, unknown>);
}
​
// Tout ce que le formulaire sait remplir aujourd'hui (symptoms/medicalHistory/...),
// + les constantes vitales denormalisees depuis la section 06.
function buildWritableFields(sections: Section[]) {
  const sectionMap = sectionMapOf(sections);
​
  const sec06 = (sectionMap['06'] as any) || {};
  const examenPhysique = sec06.physique || {};
  const tensionParts = ((examenPhysique.tension as string) || '').split('/');
​
  return {
    symptoms: JSON.stringify({
      motif: sectionMap['02'],
      histoire: sectionMap['04'],
    }),
    medicalHistory: JSON.stringify({
      antecedents: sectionMap['03'],
    }),
    physicalExamination: typeof sectionMap['06'] === 'object' ? JSON.stringify(sectionMap['06']) : '',
    clinicalImpressions: JSON.stringify({
      diagnostic: sectionMap['08'],
      conduite: sectionMap['09'],
    }),
    currentTreatments: JSON.stringify(sectionMap['05'] ?? []),
    complementaryExams: JSON.stringify(sectionMap['07'] ?? []),
    systolicBP: tensionParts[0] ? Number.parseInt(tensionParts[0], 10) : undefined,
    diastolicBP: tensionParts[1] ? Number.parseInt(tensionParts[1], 10) : undefined,
    heartRate: examenPhysique.pouls ? Number.parseInt(examenPhysique.pouls as string, 10) : undefined,
    temperature: examenPhysique.temperature ? Number.parseFloat(examenPhysique.temperature as string) : undefined,
    weight: examenPhysique.poids ? Number.parseFloat(examenPhysique.poids as string) : undefined,
    height: examenPhysique.taille ? Number.parseInt(examenPhysique.taille as string, 10) : undefined,
  };
}
​
// POST /observations — seul appel reseau de tout le cycle de saisie : l'observation
// est creee une fois, definitivement (isDraft: false). Pas de PUT/brouillon serveur :
// tant qu'elle n'est pas envoyee, elle ne vit qu'en local (cf. observation-draft-storage).
export function buildCreateObservationDto(
  sections: Section[],
  ctx: { chuId: string; serviceId: string; patientId: string; createdBy?: string },
): CreateObservationDto {
  return {
    chuId: ctx.chuId,
    serviceId: ctx.serviceId,
    patientId: ctx.patientId,
    observationType: 'GENERAL',
    createdBy: ctx.createdBy,
    ...buildWritableFields(sections),
    isDraft: false,
  };
}
​