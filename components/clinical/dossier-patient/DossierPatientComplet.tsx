"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Stethoscope,
  Activity,
  LineChart,
  Pill,
  Scissors,
  FlaskConical,
  DoorOpen,
  History,
} from "lucide-react";
import { ehr } from "@/lib/clinical/ehr-theme";
import {
  readDossierPatientPrefill,
  type DossierPatientRoutePrefill,
} from "@/lib/clinical/dossier-patient-prefill";
import { type ObservationPatientInfo } from "@/components/clinical/dossier-patient/ObservationForm";
import { ObservationTab } from "@/components/clinical/dossier-patient/ObservationTab";
import { DiagnosticTab } from "@/components/clinical/dossier-patient/DiagnosticTab";
import { SuiviTab } from "@/components/clinical/dossier-patient/SuiviTab";
import { CrOperatoireTab } from "@/components/clinical/dossier-patient/CrOperatoireTab";
import { SortieTab } from "@/components/clinical/dossier-patient/SortieTab";
import HistoriqueTab from "@/components/clinical/dossier-patient/HistoriqueTab";
import ResultatsParacliniquesTab from "@/components/clinical/dossier-patient/ResultatsParacliniquesTab";
import { PrescriptionAccueilTab } from "@/components/clinical/dossier-patient/PrescriptionAccueilTab";
import { cn } from "@/lib/utils";
import { accueilApiService } from "@/lib/clinical/accueil-api";
import { hospitalisationService } from "@/lib/clinical/hospitalisation-service";
import { obtenirSessionValide } from "@/lib/auth/central-session";
import { patientService } from "@/lib/api";
import { apiClient } from "@/lib/api/client";
import { libelleStatutPatient, styleStatutPatient } from "@/lib/statut";
import { usePriseEnChargeName } from "@/components/clinical/bed-cards/usePriseEnChargeName";
import { pickPriseEnChargeId } from "@/components/clinical/shared/utils";

export const TABS = [
  { key: "observation", label: "Observation médical", icon: Stethoscope },
  { key: "diagnostic", label: "Diagnostic", icon: Activity },
  { key: "suivi", label: "Suivi / Évolution", icon: LineChart },
  { key: "prescription", label: "Prescription", icon: Pill },
  { key: "cr_operatoire", label: "Compte-rendu opératoire", icon: Scissors },
  { key: "resultats", label: "Résultats paracliniques", icon: FlaskConical },
  { key: "sortie", label: "Sortie", icon: DoorOpen },
  { key: "historique", label: "Historique", icon: History },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

function pickStr(
  patient: Record<string, unknown> | null | undefined,
  keys: string[],
): string | undefined {
  if (!patient) return undefined;
  for (const key of keys) {
    const v = patient[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function formatSexeCourtesy(
  patient: Record<string, unknown> | null | undefined,
): string {
  const raw = pickStr(patient, ["sexe", "gender", "civilite"]);
  if (raw === "M" || raw?.toLowerCase() === "masculin") return "M.";
  if (
    raw === "F" ||
    raw?.toLowerCase() === "féminin" ||
    raw?.toLowerCase() === "feminin"
  )
    return "Mme";
  return "";
}

function computeAgeYears(
  patient: Record<string, unknown> | null | undefined,
): number | null {
  const raw =
    pickStr(patient, ["dateNaissance", "birthDate", "date_naissance"]) ?? "";
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

function pickAllergiesText(
  patient: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!patient) return undefined;
  const direct = pickStr(patient, ["allergies", "allergie", "allergiesTexte"]);
  if (direct) return direct;
  const raw = patient["allergiesListe"] ?? patient["allergyList"];
  if (Array.isArray(raw)) {
    const parts = raw.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    if (parts.length) return parts.join(", ");
  }
  return undefined;
}

function pickPriseEnChargeLabel(
  patient: Record<string, unknown> | null | undefined,
): string {
  return (
    pickStr(patient, [
      "priseEnCharge",
      "modePriseEnCharge",
      "libellePriseEnCharge",
      "priseEnChargeLibelle",
      "priseEnChargeCode",
      "couverture",
      "assurance",
      "categorie",
    ]) ?? "—"
  );
}

function formatSexeLabel(value: string | undefined): string {
  if (!value) return "—";
  const raw = value.trim();
  const u = raw.toUpperCase();
  if (["M", "MALE", "MASCULIN", "HOMME"].includes(u)) return "Homme";
  if (["F", "FEMALE", "FEMININ", "FÉMININ", "FEMME"].includes(u)) return "Femme";
  return raw;
}

function toObservationPatientInfo(
  patient: Record<string, unknown> | null | undefined,
): ObservationPatientInfo | null {
  if (!patient) return null;
  const nom = pickStr(patient, ["nom", "lastName", "familyName", "name"]) ?? "";
  const prenom = pickStr(patient, ["prenom", "firstName", "givenName"]) ?? "";
  if (!nom.trim() && !prenom.trim()) return null;
  const sexeRaw = pickStr(patient, ["sexe", "gender"]);
  const sexe =
    sexeRaw === "M"
      ? "Masculin"
      : sexeRaw === "F"
        ? "Féminin"
        : (sexeRaw ?? "");
  return {
    nom,
    prenom,
    dateNaissance:
      pickStr(patient, ["dateNaissance", "birthDate", "date_naissance"]) ?? "",
    adresse: pickStr(patient, ["adresse", "address"]) ?? "",
    sexe,
    profession: pickStr(patient, ["profession", "job"]) ?? "",
    contact: pickStr(patient, ["contact", "phone", "telephone", "tel"]) ?? "",
    contactUrgence:
      pickStr(patient, ["contactUrgence", "contact_urgence", "urgence"]) ?? "",
  };
}

export interface DossierPatientCompletProps {
  patientId: string;
  /** Repli non prioritaire (voir prefill/session) — passer les valeurs connues de l'appelant
   * (query string de la page, contexte du bouton qui ouvre la modale, etc.). */
  chuId?: string;
  serviceId?: string;
  hospitalisationId?: string;
  /** Onglet initial (ex. lu depuis `?tab=` par la page). Ignoré après le premier rendu — un
   * changement d'onglet ultérieur passe uniquement par les clics utilisateur / onTabChange. */
  initialTab?: TabKey;
  /** Appelé à chaque changement d'onglet (la page l'utilise pour synchroniser `?tab=` dans
   * l'URL ; la modale peut l'ignorer). */
  onTabChange?: (tab: TabKey) => void;
  /** Action du bouton "Retour" en haut à gauche — navigation arrière pour la page, fermeture
   * pour la modale. */
  onBack: () => void;
  backLabel?: string;
}

// Contenu du dossier patient intégré (identité à jour, statut, onglets cliniques en lecture
// seule) — extrait de app/bloc/dossier-patient/[id]/complet/page.tsx pour être rendu à
// l'identique depuis une page dédiée (navigation directe, lien partageable) ET depuis
// DossierPatientModal (ouverture en surimpression, sans jamais démonter l'écran/formulaire
// d'où on vient — voir VoirDossierButton).
export function DossierPatientComplet({
  patientId,
  chuId: chuIdProp,
  serviceId: serviceIdProp,
  hospitalisationId: hospitalisationIdProp,
  initialTab,
  onTabChange,
  onBack,
  backLabel = "Retour",
}: DossierPatientCompletProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "observation");

  const selectTab = useCallback(
    (key: TabKey) => {
      setActiveTab(key);
      onTabChange?.(key);
    },
    [onTabChange],
  );

  const [prefill, setPrefill] = useState<DossierPatientRoutePrefill | null>(
    null,
  );
  const [apiPatient, setApiPatient] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    if (patientId) {
      const storedPrefill = readDossierPatientPrefill(patientId);
      const updatedPrefill = { ...storedPrefill };
      if (chuIdProp && !storedPrefill?.chuId) {
        updatedPrefill.chuId = chuIdProp;
      }
      if (serviceIdProp && !storedPrefill?.serviceId) {
        updatedPrefill.serviceId = serviceIdProp;
      }
      if (hospitalisationIdProp && !storedPrefill?.hospitalisationId) {
        updatedPrefill.hospitalisationId = hospitalisationIdProp;
      }
      setPrefill(updatedPrefill);
    }
  }, [patientId, chuIdProp, serviceIdProp, hospitalisationIdProp]);

  useEffect(() => {
    if (!patientId) {
      setApiPatient(null);
      return;
    }

    let active = true;
    accueilApiService.getPatientById(patientId, chuIdProp || undefined).then((patientData) => {
      if (!active) return;
      setApiPatient(patientData ? (patientData as Record<string, unknown>) : null);
    });

    return () => {
      active = false;
    };
  }, [patientId, chuIdProp]);

  // Fiche PatientBloc du bloc (distincte de l'identité Accueil ci-dessus) — fournit surtout le
  // vrai statut de parcours du patient (CPA, VPA, en attente, ...), affiché dans l'en-tête
  // ci-dessous : ce dossier "intégré" doit refléter le statut à jour, pas seulement l'identité
  // brute renvoyée par le service Accueil.
  const [blocPatient, setBlocPatient] = useState<any>(null);
  useEffect(() => {
    if (!patientId) { setBlocPatient(null); return; }
    let active = true;
    patientService.getById(patientId).then((p: any) => {
      if (!active) return;
      setBlocPatient(p ?? null);
    }).catch(() => { if (active) { setBlocPatient(null); } });
    return () => { active = false; };
  }, [patientId]);

  // Groupe sanguin réellement fiable : le service Accueil n'en transmet pas (identité
  // administrative seulement — nom/prénom/naissance/sexe/contact, jamais de donnée clinique), et
  // PatientBloc.groupeSanguin vaut le texte littéral "INCONNU" pour tout patient venu d'une
  // demande de CPA externe (jamais une vraie valeur). La seule source réellement clinique est le
  // groupage saisi par l'anesthésiste pendant la CPA elle-même (Groupe/Phénotype/RAI).
  const [groupeSanguinCpa, setGroupeSanguinCpa] = useState<string | null>(null);
  useEffect(() => {
    if (!patientId) { setGroupeSanguinCpa(null); return; }
    let active = true;
    apiClient.get('/cpa', { params: { patientId, limite: 1 } })
      .then(({ data }) => {
        if (!active) return;
        setGroupeSanguinCpa(data?.data?.[0]?.groupeSanguinCpa?.groupe || null);
      })
      .catch(() => { if (active) setGroupeSanguinCpa(null); });
    return () => { active = false; };
  }, [patientId]);

  // Filet de sécurité identique à celui déjà utilisé par SortieTab : depuis une navigation qui
  // n'a ni prefill ni chuId/serviceId connus (ex. "Voir dossier" depuis la CPA, "Voir
  // prescription" depuis une notification), on retombe sur le CHU/service de la session
  // connectée plutôt que de laisser ces onglets sans contexte.
  const resolvedChuId =
    prefill?.chuId || chuIdProp || obtenirSessionValide()?.acces.chu?.id || undefined;
  const resolvedServiceId =
    prefill?.serviceId || serviceIdProp || obtenirSessionValide()?.acces.serviceId || undefined;
  const resolvedEpisodeId =
    prefill?.hospitalisationId || hospitalisationIdProp || undefined;

  // Chambre réelle : PatientBloc.chambre n'est jamais renseignée côté bloc (colonne jamais écrite
  // en base), et prefill.chambreNumero/codeLit n'est écrit par aucun flux d'entrée (CPA,
  // notification, etc.) — juste un champ mort. La seule source fiable est l'épisode
  // d'hospitalisation actif du service Hospitalisation : on récupère le lit occupé (litCode), puis
  // on le résout en numéro de chambre via le plan de lits du service. Si le patient n'a aucun
  // épisode ADMIS/EN_COURS, rien n'est affiché — un patient non hospitalisé n'a pas de chambre.
  const [numeroChambreReel, setNumeroChambreReel] = useState<string | number | null>(null);
  useEffect(() => {
    if (!patientId || !resolvedServiceId || !resolvedChuId) {
      setNumeroChambreReel(null);
      return;
    }
    let active = true;
    hospitalisationService
      .getByPatient(patientId, resolvedServiceId, resolvedChuId)
      .then(async (response: any) => {
        if (!active) return;
        const episodes = Array.isArray(response) ? response : (response?.data ?? []);
        // Un patient peut avoir plusieurs épisodes (hospitalisations passées + éventuellement
        // actuelle) — on ne garde que ceux réellement en cours, et parmi eux le plus récent (par
        // date d'admission), plutôt que le premier trouvé dans un ordre non garanti par l'API.
        const actifs = episodes
          .filter((ep: any) => ["ADMIS", "EN_COURS"].includes(ep.statut))
          .sort((a: any, b: any) => {
            const da = new Date(a.dateAdmission ?? a.dateEntrer ?? 0).getTime();
            const db = new Date(b.dateAdmission ?? b.dateEntrer ?? 0).getTime();
            return db - da;
          });
        const episode = actifs[0];
        if (!episode?.litCode) {
          setNumeroChambreReel(null);
          return;
        }
        try {
          const plan: any = await hospitalisationService.planLits(resolvedServiceId, resolvedChuId);
          const chambres = Array.isArray(plan?.chambres) ? plan.chambres : (plan?.data?.chambres ?? []);
          const chambre = chambres.find((c: any) =>
            c.lits?.some((l: any) => l.codeLit === episode.litCode),
          );
          if (!active) return;
          setNumeroChambreReel(chambre?.numeroChambre ?? episode.litCode);
        } catch {
          if (active) setNumeroChambreReel(episode.litCode);
        }
      })
      .catch(() => {
        if (active) setNumeroChambreReel(null);
      });
    return () => {
      active = false;
    };
  }, [patientId, resolvedServiceId, resolvedChuId]);

  // apiPatient (fetch direct Accueil, dépend d'un chuId de session/URL) échoue silencieusement
  // pour tout patient arrivé par un flux interne au bloc (CPA, prescription...) qui n'a jamais
  // été ouvert depuis une carte-lit Accueil — blocPatient (fiche PatientBloc, déjà enrichie
  // côté backend via AccueilClient.enrichWithIdentity, sans dépendance à la session courante)
  // sert alors de filet de sécurité pour ne jamais retomber sur un dossier vide de tout nom.
  const patient = useMemo(() => {
    if (!blocPatient && !apiPatient && !prefill?.patient) return null;
    return { ...(blocPatient || {}), ...(apiPatient || {}), ...(prefill?.patient || {}) };
  }, [blocPatient, apiPatient, prefill]);

  const hydratedPatientInfo = useMemo(
    () => toObservationPatientInfo(patient),
    [patient],
  );

  const nom = pickStr(patient, ["nom", "lastName", "familyName", "name"]) ?? "";
  const prenom = pickStr(patient, ["prenom", "firstName", "givenName"]) ?? "";
  const groupeSanguinPatientBloc = pickStr(patient, [
    "groupeSanguin",
    "groupe_sanguin",
    "bloodGroup",
    "groupageSanguin",
    "groupage",
  ]);
  const groupeSanguin =
    groupeSanguinCpa ||
    (groupeSanguinPatientBloc && groupeSanguinPatientBloc.toUpperCase() !== "INCONNU"
      ? groupeSanguinPatientBloc
      : null) ||
    "—";
  const age = computeAgeYears(patient);
  const sexeRaw = pickStr(patient, ["sexe", "gender"]);
  const sexeLabel = formatSexeLabel(sexeRaw);
  const allergies = pickAllergiesText(patient);
  const chambreLit = numeroChambreReel != null ? `${numeroChambreReel}` : null;

  const priseEnChargeId = pickPriseEnChargeId(patient ?? undefined);
  const { name: priseEnChargeResolved } = usePriseEnChargeName(
    priseEnChargeId,
    patientId,
  );
  const priseEnChargeLabel =
    priseEnChargeResolved || pickPriseEnChargeLabel(patient);

  const courtesy = formatSexeCourtesy(patient);
  const displayName =
    nom || prenom
      ? `${courtesy ? `${courtesy} ` : ""}${nom} ${prenom}`.trim()
      : `Patient ${patientId.slice(0, 8)}`;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F8F9FB] px-4 py-2 sm:px-6">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-2 min-h-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm sm:px-4 sm:py-2.5" style={{ boxShadow: ehr.shadowCard }}>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            {backLabel}
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#05668D] to-[#04556F] text-[13px] font-black text-white shadow-[0_4px_10px_rgba(5,102,141,0.30)]">
              {(nom?.[0] ?? prenom?.[0] ?? displayName?.[0] ?? "?").toUpperCase()}
            </div>
            <h1 className="truncate text-[15px] font-bold tracking-tight sm:text-[16px]" style={{ color: ehr.primary }}>
              {displayName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1">
              <span className="font-semibold text-slate-500">Groupe :</span>
              <span className="font-bold text-slate-800">{groupeSanguin}</span>
            </span>
            <span className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1">
              <span className="font-semibold text-slate-500">Âge / Sexe :</span>
              <span className="font-bold text-slate-800">{age != null ? `${age} ans` : "—"} / {sexeLabel}</span>
            </span>
            {chambreLit ? (
              <span className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1">
                <span className="font-semibold text-slate-500">Chambre :</span>
                <span className="font-bold text-slate-800">{chambreLit}</span>
              </span>
            ) : null}
            {priseEnChargeLabel && priseEnChargeLabel !== "—" ? (
              <span className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1">
                <span className="font-semibold text-slate-500">Prise en charge :</span>
                <span className="font-bold text-slate-800">{priseEnChargeLabel}</span>
              </span>
            ) : null}
            {blocPatient?.statut ? (
              <span className={cn("inline-flex items-baseline gap-1 rounded-md px-2 py-1", styleStatutPatient(blocPatient.statut).badge)}>
                <span className="font-semibold opacity-70">Statut :</span>
                <span className="font-bold">{libelleStatutPatient(blocPatient.statut)}</span>
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
            {blocPatient?.statut === "CPA_INAPTE" ? (
              <div className="flex max-w-full items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-700">
                <span aria-hidden>⚠</span>
                <span className="truncate">CPA : Inapte{blocPatient.motifRefusCpa ? ` — ${blocPatient.motifRefusCpa}` : ""}</span>
              </div>
            ) : null}
            {allergies ? (
              <div className="flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: `${ehr.allergyText}44`, backgroundColor: ehr.allergyBg, color: ehr.allergyText }}>
                <span aria-hidden>⚠</span>
                <span className="truncate">ALLERGIES : {allergies}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="flex flex-1 flex-col min-h-0 overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(5,102,141,0.06)]"
          style={{ boxShadow: ehr.shadowCard }}
        >
          <div className="shrink-0 border-b border-slate-200 bg-[#F8FAFC] px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => selectTab(tab.key)}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-[15px]",
                      isActive
                        ? "bg-[#05668D] text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-[#05668D]",
                    )}
                  >
                    <tab.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            <div
              className={cn(
                "h-full overflow-y-auto p-4 sm:p-5",
                activeTab === "suivi" && "pb-12",
              )}
            >
              {activeTab === "observation" && patientId ? (
                <ObservationTab
                  patientId={patientId}
                  hydratedPatientInfo={hydratedPatientInfo}
                  chuId={resolvedChuId}
                  serviceId={resolvedServiceId}
                />
              ) : activeTab === "diagnostic" && patientId ? (
                <DiagnosticTab
                  patientId={patientId}
                  chuId={resolvedChuId}
                  serviceId={resolvedServiceId}
                />
              ) : activeTab === "suivi" && patientId ? (
                <SuiviTab
                  patientId={patientId}
                  chuId={resolvedChuId}
                  serviceId={resolvedServiceId}
                />
              ) : activeTab === "prescription" && patientId ? (
                <PrescriptionAccueilTab patientId={patientId} />
              ) : activeTab === "cr_operatoire" && patientId ? (
                <CrOperatoireTab patientId={patientId} />
              ) : activeTab === "sortie" && patientId ? (
                <SortieTab
                  patientId={patientId}
                  chuId={resolvedChuId}
                  serviceId={resolvedServiceId}
                  episodeId={resolvedEpisodeId}
                />
              ) : activeTab === "historique" && patientId ? (
                <HistoriqueTab patientId={patientId} />
              ) : activeTab === "resultats" && patientId ? (
                <ResultatsParacliniquesTab patientId={patientId} />
              ) : null}
            </div>

            {activeTab === "suivi" && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "60px",
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)",
                  pointerEvents: "none",
                  zIndex: 20,
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 14,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
