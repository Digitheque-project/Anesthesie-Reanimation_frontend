"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import type { ServiceDestOverride } from "@/features/prescription/contexts/PrescriptionPanierContext";
import { cn } from "@/lib/utils";
import { accueilApiService } from "@/lib/clinical/accueil-api";
import { patientService } from "@/lib/api";
import { libelleStatutPatient, styleStatutPatient } from "@/lib/statut";
import { usePriseEnChargeName } from "@/components/clinical/bed-cards/usePriseEnChargeName";
import { pickPriseEnChargeId } from "@/components/clinical/shared/utils";

const TABS = [
  { key: "observation", label: "Observation médical", icon: Stethoscope },
  { key: "diagnostic", label: "Diagnostic", icon: Activity },
  { key: "suivi", label: "Suivi / Évolution", icon: LineChart },
  { key: "prescription", label: "Prescription", icon: Pill },
  { key: "cr_operatoire", label: "Compte-rendu opératoire", icon: Scissors },
  { key: "resultats", label: "Résultats paracliniques", icon: FlaskConical },
  { key: "sortie", label: "Sortie", icon: DoorOpen },
  { key: "historique", label: "Historique", icon: History },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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

function DossierPatientCompletPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const patientId = params.id ?? "";
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("observation");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.some((t) => t.key === tab)) {
      setActiveTab(tab as TabKey);
    }
  }, [searchParams]);

  const selectTab = useCallback((key: TabKey) => {
    setActiveTab(key);
    if (typeof globalThis.window === "undefined") return;
    const url = new URL(globalThis.window.location.href);
    url.searchParams.set("tab", key);
    globalThis.window.history.replaceState({}, "", url.toString());
  }, []);

  const [prefill, setPrefill] = useState<DossierPatientRoutePrefill | null>(
    null,
  );
  const [apiPatient, setApiPatient] = useState<Record<string, unknown> | null>(
    null,
  );
  const urlChuId = searchParams.get("chuId") ?? "";
  const urlServiceId = searchParams.get("serviceId") ?? "";
  const urlHospitalisationId = searchParams.get("hospitalisationId") ?? "";

  useEffect(() => {
    if (patientId) {
      const storedPrefill = readDossierPatientPrefill(patientId);
      const updatedPrefill = { ...storedPrefill };
      if (urlChuId && !storedPrefill?.chuId) {
        updatedPrefill.chuId = urlChuId;
      }
      if (urlServiceId && !storedPrefill?.serviceId) {
        updatedPrefill.serviceId = urlServiceId;
      }
      if (urlHospitalisationId && !storedPrefill?.hospitalisationId) {
        updatedPrefill.hospitalisationId = urlHospitalisationId;
      }
      setPrefill(updatedPrefill);
    }
  }, [patientId, urlChuId, urlServiceId, urlHospitalisationId]);

  useEffect(() => {
    if (!patientId) {
      setApiPatient(null);
      return;
    }

    let active = true;
    accueilApiService.getPatientById(patientId, urlChuId || undefined).then((patientData) => {
      if (!active) return;
      setApiPatient(patientData ? (patientData as Record<string, unknown>) : null);
    });

    return () => {
      active = false;
    };
  }, [patientId, urlChuId]);

  // Fiche PatientBloc du bloc (distincte de l'identité Accueil ci-dessus) — fournit le service
  // d'origine (sans lui, toute prescription "surveillance"/"transfusion" créée depuis cet onglet
  // partait avec un service destinataire vide, voir PrescriptionPanierContext.SERVICE_DEST_MAP)
  // et surtout le vrai statut de parcours du patient (CPA, VPA, en attente, ...), affiché dans
  // l'en-tête ci-dessous : ce dossier "intégré" doit refléter le statut à jour, pas seulement
  // l'identité brute renvoyée par le service Accueil.
  const [blocPatient, setBlocPatient] = useState<any>(null);
  const [serviceDestOverride, setServiceDestOverride] = useState<ServiceDestOverride | undefined>(undefined);
  useEffect(() => {
    if (!patientId) { setServiceDestOverride(undefined); setBlocPatient(null); return; }
    let active = true;
    patientService.getById(patientId).then((p: any) => {
      if (!active) return;
      setBlocPatient(p ?? null);
      setServiceDestOverride(
        p?.serviceOrigineId && p?.serviceOrigine
          ? { serviceId: p.serviceOrigineId, serviceName: p.serviceOrigine }
          : undefined,
      );
    }).catch(() => { if (active) { setServiceDestOverride(undefined); setBlocPatient(null); } });
    return () => { active = false; };
  }, [patientId]);

  const resolvedChuId = prefill?.chuId || urlChuId || undefined;
  const resolvedServiceId = prefill?.serviceId || urlServiceId || undefined;
  const resolvedEpisodeId =
    prefill?.hospitalisationId || urlHospitalisationId || undefined;

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
  const groupeSanguin =
    pickStr(patient, [
      "groupeSanguin",
      "groupe_sanguin",
      "bloodGroup",
      "groupageSanguin",
      "groupage",
    ]) ?? "—";
  const age = computeAgeYears(patient);
  const sexeRaw = pickStr(patient, ["sexe", "gender"]);
  const sexeLabel = formatSexeLabel(sexeRaw);
  const allergies = pickAllergiesText(patient);
  const chambreLit =
    prefill?.chambreNumero != null && prefill?.codeLit
      ? `Chambre ${prefill.chambreNumero} – ${prefill.codeLit}`
      : pickStr(patient, ["chambreLit", "chambre", "lit", "roomLabel"]) ?? "—";

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
            onClick={() => router.back()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Retour
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
            <span className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1">
              <span className="font-semibold text-slate-500">Chambre :</span>
              <span className="font-bold text-slate-800">{chambreLit}</span>
            </span>
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
                <PrescriptionAccueilTab patientId={patientId} serviceDestOverride={serviceDestOverride} />
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

export default function DossierPatientCompletPage() {
  return (
    <Suspense fallback={null}>
      <DossierPatientCompletPageContent />
    </Suspense>
  );
}
