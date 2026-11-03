"use client";

/**
 * PrescriptionModule
 * ------------------------------------------------------------------
 * Entry point for the Prescription tab of the patient dossier.
 *
 * It hosts the full prescription suite (7 modules) re-skinned to the clinique
 * (ehr) design system. Patient and prescriber identities are resolved from the
 * active clinique session, and the whole tree talks to the prescription backend
 * through NEXT_PUBLIC_GATEWAY_URL.
 *
 * PARA-CLINIQUE (dynamique) : la sous-navigation para-clinique n'est plus
 * codee en dur. Elle est chargee par GET sur le microservice service-service
 * (services de type PARACLINIQUE du CHU courant) puis mappee vers les
 * formulaires existants. Aucune icone n'est affichee devant ces services.
 *
 * NOTE (UI refonte): only the presentation layer changed here (Tailwind utility
 * classes + the .psx design-system stylesheet). State, effects and panier
 * wiring are untouched.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getActiveSession } from "@/features/prescription/platform/session-store";
import { useStickyViewport } from "@/features/prescription/lib/useStickyViewport";
import { getStoredToken } from "@/features/prescription/lib/auth";
import { cn } from "@/lib/utils";
import { accueilApiService } from "@/features/prescription/platform/accueil";
import { usePermissions } from "@/features/prescription/platform/permissions";
import { definirDestinationImposee } from "@/features/prescription/lib/api";
import type { ServiceDestOverride } from "@/features/prescription/contexts/PrescriptionPanierContext";
import {
  PrescriptionPanierProvider,
  usePrescriptionPanier,
} from "@/features/prescription/contexts/PrescriptionPanierContext";
import MedicaleForm from "@/features/prescription/components/medicale/MedicaleForm";
import type { Patient } from "@/features/prescription/components/medicale/types";
import NonMedicaleForm from "@/features/prescription/components/NonMedicaleForm";
import SurveillanceForm from "@/features/prescription/components/SurveillanceForm";
import TransfusionForm from "@/features/prescription/components/TransfusionForm";
import BlocForm from "@/features/prescription/components/BlocForm";
import CpaForm from "@/features/prescription/components/CpaForm";
import HistoriqueForm from "@/features/prescription/components/HistoriqueForm";
import SoinsInfirmierForm from "@/features/prescription/components/SoinsInfirmierForm";
import ActesOrlForm from "@/features/prescription/components/ActesOrlForm";
import StomatologieForm from "@/features/prescription/components/StomatologieForm";
import LaboForm from "@/features/prescription/components/para/LaboForm";
import ImagerieForm from "@/features/prescription/components/para/ImagerieForm";
import EEGForm from "@/features/prescription/components/para/EEGForm";
import KineForm from "@/features/prescription/components/para/KineForm";
import EndoscopieForm from "@/features/prescription/components/para/EndoscopieForm";
import DiaryseForm from "@/features/prescription/components/para/DiaryseForm";
import AnapathForm from "@/features/prescription/components/para/AnapathForm";
import EcgSection from "@/features/prescription/components/para/EcgSection";
import ORLForm from "@/features/prescription/components/para/ORLForm";
import PolysomnographieForm from "@/features/prescription/components/para/PolysomnographieForm";
import {
  fetchParacliniqueServices,
  PARA_SHORT_LABELS,
  type ParacliniqueService,
} from "@/features/prescription/lib/paraclinique";
import "@/features/prescription/prescription-suite.css";
import { gatewayUrl } from "@/features/prescription/platform/gateway";
import { Icone } from '@/components/ui/Icone';

type MainSection =
  | "med"
  | "nm"
  | "soins"
  | "surv"
  | "trans"
  | "para"
  | "bloc"
  | "cpa"
  | "actes-orl"
  | "stomato"
  | "hist";

interface PrescriptionModuleProps {
  patientId: string;
  /** Statut du patient dans le dossier (hospitalisation par defaut). */
  patientType?: "hospitalise" | "consultation_externe" | "accueil";
  /** Limite la navigation aux prescriptions autorisées dans le contexte. */
  scope?: "complete" | "stomatologie";
}

const MAIN_ITEMS: {
  id: MainSection;
  icon: string;
  label: string;
  hint: string;
}[] = [
  {
    id: "med",
    icon: "medication",
    label: "Médicamenteuse",
    hint: "Ordonnance de médicaments",
  },
  {
    id: "nm",
    icon: "self_care",
    label: "Non médicamenteuse",
    hint: "Soins et mesures non médicamenteux",
  },
  {
    id: "soins",
    icon: "clinical_notes",
    label: "Soins infirmiers",
    hint: "Actes et soins à réaliser",
  },
  {
    id: "surv",
    icon: "monitor_heart",
    label: "Surveillance",
    hint: "Paramètres à surveiller",
  },
  {
    id: "trans",
    icon: "bloodtype",
    label: "Transfusion sanguine",
    hint: "Produits sanguins labiles",
  },
  {
    id: "para",
    icon: "biotech",
    label: "Paraclinique",
    hint: "Examens paracliniques",
  },
  {
    id: "bloc",
    icon: "medical_services",
    label: "Intervention chirurgicale",
    hint: "Prescription et programmation chirurgicales",
  },
  {
    id: "cpa",
    icon: "local_hospital",
    label: "CPA",
    hint: "Consultation de prise en charge anesthésique",
  },
  {
    id: "actes-orl",
    icon: "hearing",
    label: "Actes ORL",
    hint: "Actes ORL prescrits",
  },
  {
    id: "stomato",
    icon: "dentistry",
    label: "Stomatologie",
    hint: "Orienter le patient vers la file Stomatologie",
  },
  {
    id: "hist",
    icon: "history",
    label: "Historique",
    hint: "Prescriptions antérieures",
  },
];

const STOMATOLOGIE_ITEMS: typeof MAIN_ITEMS = [
  {
    id: "med",
    icon: "medication",
    label: "Médicamenteuse",
    hint: "Ordonnance de médicaments",
  },
  {
    id: "nm",
    icon: "self_care",
    label: "Non médicamenteuse",
    hint: "Soins et mesures non médicamenteux",
  },
  {
    id: "para",
    icon: "radiology",
    label: "Imagerie",
    hint: "Prescription d’examen d’imagerie",
  },
];

function PrescriptionModuleInner({
  patientId,
  patientType = "hospitalise",
  scope = "complete",
}: PrescriptionModuleProps) {
  const { setPatientId, setDestination } = usePrescriptionPanier();
  const { canDo } = usePermissions();
  const canCreatePrescription = canDo("prescription", "create");
  const stomatologieOnly = scope === "stomatologie";

  // Le dossier patient defile dans un panneau interne, pas dans la fenetre :
  // on mesure la hauteur reelle de ce panneau et on l'expose en `--psx-vh`
  // pour que les panneaux sticky (menu de gauche, colonnes de droite) soient
  // bornes a la zone VISIBLE et non a 100vh.
  const rootRef = useRef<HTMLDivElement>(null);
  useStickyViewport(rootRef);

  const [main, setMain] = useState<MainSection>(() =>
    canCreatePrescription ? "med" : "hist",
  );
  const visibleMainItems = useMemo(() => {
    if (!canCreatePrescription) {
      return stomatologieOnly
        ? []
        : MAIN_ITEMS.filter((item) => item.id === "hist");
    }
    return stomatologieOnly ? STOMATOLOGIE_ITEMS : MAIN_ITEMS;
  }, [canCreatePrescription, stomatologieOnly]);

  useEffect(() => {
    if (!canCreatePrescription && !stomatologieOnly && main !== "hist") {
      setMain("hist");
      return;
    }
    if (
      canCreatePrescription &&
      visibleMainItems.length > 0 &&
      !visibleMainItems.some((item) => item.id === main)
    ) {
      setMain(visibleMainItems[0].id);
    }
  }, [canCreatePrescription, main, stomatologieOnly, visibleMainItems]);
  const [patientDetails, setPatientDetails] = useState<Partial<Patient> | null>(
    null,
  );

  // --- Para-clinique dynamique (charge depuis service-service) --------------
  const [paraServices, setParaServices] = useState<ParacliniqueService[]>([]);
  const [paraServiceId, setParaServiceId] = useState<string | null>(null);
  const [paraLoading, setParaLoading] = useState(false);
  const [paraError, setParaError] = useState<string | null>(null);

  const session = useMemo(() => getActiveSession(), []);

  // ── ECG pending interpretation check ──────────────────────────────
  const PRESCRIPTION_API_URL = gatewayUrl()
    .replace(/\/+$/, "")
    .replace(/\/prescriptions$/, "");
  const [pendingEcg, setPendingEcg] = useState(false);
  const [pendingEcgAutoNav, setPendingEcgAutoNav] = useState(false);

  useEffect(() => {
    if (stomatologieOnly || !patientId || !canCreatePrescription) {
      setPendingEcg(false);
      setPendingEcgAutoNav(false);
      return;
    }
    let cancelled = false;
    const token = getStoredToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(
      `${PRESCRIPTION_API_URL}/prescriptions/ecg/patient/${encodeURIComponent(patientId)}`,
      { headers },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : [];
        const hasPending = items.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) =>
            p.statut === "CREEE" ||
            p.statut === "EN_COURS" ||
            p.statut === "PRISE_EN_CHARGE" ||
            p.statut === "EN_ATTENTE",
        );
        setPendingEcg(hasPending);
        if (hasPending) setPendingEcgAutoNav(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patientId, canCreatePrescription, stomatologieOnly]);

  // When pending ECG + paraServices loaded → auto-navigate to ECG
  useEffect(() => {
    if (
      stomatologieOnly ||
      !canCreatePrescription ||
      !pendingEcgAutoNav ||
      paraServices.length === 0
    )
      return;
    const ecgService = paraServices.find((s) => s.formKey === "ecg");
    if (ecgService) {
      setMain("para");
      setParaServiceId(ecgService.serviceId);
      setPendingEcgAutoNav(false);
    }
  }, [
    canCreatePrescription,
    pendingEcgAutoNav,
    paraServices,
    stomatologieOnly,
  ]);

  const prescripteur = useMemo(() => {
    const claims = session?.claims;
    return {
      id: claims?.userId ?? "",
      nom: claims?.name ?? "",
      prenom: claims?.firstname ?? "",
      service: session?.currentService?.serviceName ?? "",
      poste: session?.currentService?.roleName ?? "",
    };
  }, [session]);

  const patient = useMemo(
    () => ({
      ...(patientDetails ?? {}),
      id: patientId,
      patientType,
    }),
    [patientDetails, patientId, patientType],
  );

  // Les formulaires (transfusion, impression, alertes/allergies) ont besoin du
  // patient complet, pas seulement de son identifiant. Chargement best-effort :
  // la prescription reste utilisable si le service Accueil est indisponible.
  useEffect(() => {
    let cancelled = false;
    setPatientDetails(null);
    if (!patientId) return;
    accueilApiService
      .getPatientById(patientId)
      .then((value) => {
        if (!cancelled && value)
          setPatientDetails(value as unknown as Partial<Patient>);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Keep the shared panier context in sync with the current patient.
  useEffect(() => {
    if (patientId) setPatientId(patientId);
  }, [patientId, setPatientId]);

  // GET dynamique des services para-cliniques du CHU courant.
  useEffect(() => {
    let cancelled = false;
    setParaLoading(true);
    setParaError(null);
    fetchParacliniqueServices(session?.chuId ?? undefined)
      .then((list) => {
        if (cancelled) return;
        // Repli ORL : si service-service ne renvoie pas de service ORL
        // paraclinique (le service ORL y est souvent déclaré en CLINIQUE),
        // on l'ajoute en dur pour que la prescription ORL reste accessible.
        const hasOrl = list.some((s) => s.formKey === "orl");
        const completeList: ParacliniqueService[] = hasOrl
          ? list
          : [
              ...list,
              {
                serviceId: process.env.NEXT_PUBLIC_ORL_SERVICE_ID || "",
                name: "ORL",
                formKey: "orl",
              },
            ];
        // En Stomatologie, seul le formulaire Imagerie est exposé. Le service
        // cible reste résolu dynamiquement depuis service-service.
        const visibleServices = stomatologieOnly
          ? list.filter((service) => service.formKey === "imag")
          : completeList;
        setParaServices(visibleServices);
        setParaServiceId((prev) =>
          visibleServices.some((service) => service.serviceId === prev)
            ? prev
            : (visibleServices[0]?.serviceId ?? null),
        );
      })
      .catch(() => {
        if (!cancelled)
          setParaError("Impossible de charger les services paracliniques.");
      })
      .finally(() => {
        if (!cancelled) setParaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, stomatologieOnly]);

  const activeParaService = useMemo(
    () => paraServices.find((s) => s.serviceId === paraServiceId) ?? null,
    [paraServices, paraServiceId],
  );

  useEffect(() => {
    if (!activeParaService?.formKey) return;
    // Repli ORL : sans serviceId réel (pas de service ORL enregistré dans
    // service-service), on garde la destination par défaut
    // (NEXT_PUBLIC_ORL_SERVICE_ID) au lieu d'écraser par une chaine vide.
    if (!activeParaService.serviceId) return;
    const typeByForm = {
      labo: "labo",
      imag: "imagerie",
      eeg: "eeg",
      kine: "kine",
      endo: "endoscopie",
      dial: "dialyse",
      ana: "anapath",
      ecg: "ecg",
      orl: "orl",
      poly: "polysomnographie",
    } as const;
    setDestination(
      typeByForm[activeParaService.formKey],
      activeParaService.serviceId,
      activeParaService.name,
    );
  }, [activeParaService, setDestination]);

  function renderParaForm() {
    if (paraLoading) {
      return (
        <p className="px-1 py-6 text-[14px] text-slate-500">
          Chargement des services paracliniques…
        </p>
      );
    }
    if (paraError) {
      return <p className="px-1 py-6 text-[14px] text-red-600">{paraError}</p>;
    }
    if (paraServices.length === 0) {
      return (
        <p className="px-1 py-6 text-[14px] text-slate-500">
          Aucun service paraclinique disponible pour ce CHU.
        </p>
      );
    }
    if (!activeParaService) {
      return (
        <p className="px-1 py-6 text-[14px] text-slate-500">
          Sélectionnez un service paraclinique.
        </p>
      );
    }
    switch (activeParaService.formKey) {
      case "labo":
        return (
          <LaboForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "imag":
        return (
          <ImagerieForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "eeg":
        return (
          <EEGForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "kine":
        return (
          <KineForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "endo":
        return (
          <EndoscopieForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "dial":
        return (
          <DiaryseForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "ana":
        return (
          <AnapathForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "ecg":
        return (
          <EcgSection
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "orl":
        return (
          <ORLForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "poly":
        return (
          <PolysomnographieForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      default:
        return (
          <p className="px-1 py-6 text-[14px] text-slate-500">
            Aucun formulaire de saisie n&apos;est disponible pour «&nbsp;
            {activeParaService.name}&nbsp;».
          </p>
        );
    }
  }

  function renderSection() {
    if (!canCreatePrescription) {
      return <HistoriqueForm patient={patient} prescripteur={prescripteur} />;
    }

    switch (main) {
      case "med":
        return (
          <MedicaleForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "nm":
        return (
          <NonMedicaleForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "soins":
        return (
          <SoinsInfirmierForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "surv":
        return (
          <SurveillanceForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "trans":
        return (
          <TransfusionForm patient={patient} prescripteur={prescripteur} />
        );
      case "bloc":
        return <BlocForm patient={patient} prescripteur={prescripteur} />;
      case "cpa":
        return <CpaForm patient={patient} prescripteur={prescripteur} />;
      case "actes-orl":
        return (
          <ActesOrlForm
            patient={patient}
            prescripteur={prescripteur}
            patientType={patientType}
          />
        );
      case "stomato":
        return <StomatologieForm patient={patient} prescripteur={prescripteur} />;
      case "hist":
        return <HistoriqueForm patient={patient} prescripteur={prescripteur} />;
      case "para":
        return renderParaForm();
      default:
        return null;
    }
  }

  if (!canCreatePrescription && stomatologieOnly) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
        Vous n’avez pas la permission de créer une prescription.
      </div>
    );
  }

  // --- derived, presentation-only values (no business logic) ---------------
  const activeMain =
    visibleMainItems.find((item) => item.id === main) ?? visibleMainItems[0];
  const paraTitle = activeParaService
    ? activeParaService.formKey
      ? PARA_SHORT_LABELS[activeParaService.formKey]
      : activeParaService.name
    : "Paraclinique";

  return (
    <div
      ref={rootRef}
      id="prescription-scroll-target"
      className="psx flex scroll-mt-4 items-start gap-3 sm:gap-4 lg:gap-5"
    >
      {/*
        ── Menu latéral gauche (sticky, ancrage stable) ──

        Le menu ne doit jamais bouger quand on change de section. Un element
        `sticky` reste colle a l'interieur de son bloc conteneur : si la hauteur
        de la colonne de droite change (chaque section a une hauteur
        differente), la plage d'adherence change elle aussi et le menu semble
        "sauter" ou redescendre au clic.

        Deux garde-fous :
        1. Un conteneur exterieur (`self-stretch`) donne au sticky une plage
           d'adherence qui couvre toute la hauteur de la ligne flex, quelle que
           soit la section affichee.
        2. Le panneau interne est borne a la hauteur du viewport et defile
           lui-meme si la liste devient plus haute que l'ecran.
      */}
      <div className="w-56 shrink-0 self-stretch lg:w-60">
        <aside className="psx-menu rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
          <nav aria-label="Types de prescription">
            <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Prescriptions
            </p>
            <ul className="flex flex-col gap-1">
              {visibleMainItems.map((item) => {
                const active = main === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setMain(item.id)}
                      aria-current={active ? "page" : undefined}
                      title={item.hint}
                      className={cn(
                        "w-full cursor-pointer rounded-full px-4 py-2.5 text-left text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-[#006A8C] font-semibold text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-[#006A8C]",
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </div>

      {/*
        ── Content area ──
        `min-h` reserve une hauteur plancher : sans elle, une section courte
        (ex. Historique vide) raccourcit brutalement la page, le navigateur
        recalcule le defilement et le menu sticky se decale visuellement.
      */}
      <div className="psx-content min-w-0 flex-1">
        {canCreatePrescription && !stomatologieOnly && pendingEcg && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={18} className="shrink-0 text-amber-600" />
            <div className="flex-1 text-sm text-amber-800">
              <span className="font-semibold">
                Interprétation ECG en attente
              </span>
              {" — "}Ce patient a une prescription ECG qui n&apos;a pas encore
              été interprétée.
            </div>
            <button
              onClick={() => setPendingEcg(false)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              Ignorer
            </button>
          </div>
        )}
        <header className="mb-4 flex min-h-14 items-center gap-3.5 border-b border-slate-200 pb-4">
          {(main !== "para" || stomatologieOnly) && (
            <span className="flex h-12 w-12 shrink-0 self-center items-center justify-center rounded-xl bg-[#EBF5FB] text-[#006A8C]">
              <Icone nom={activeMain.icon} className="block text-[24px] leading-none" />
            </span>
          )}
          <div className="flex min-h-12 min-w-0 flex-col justify-center">
            <h3 className="text-[18px] font-extrabold leading-tight tracking-tight text-slate-800">
              {main === "para"
                ? stomatologieOnly
                  ? "Imagerie"
                  : `Paraclinique · ${paraTitle}`
                : activeMain.label}
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-slate-500">
              {main === "para"
                ? stomatologieOnly
                  ? "Prescription d’examen d’imagerie"
                  : "Examens paracliniques"
                : activeMain.hint}
            </p>
          </div>
        </header>

        {/* Sous-navigation para-clinique (pills) — dynamique */}
        {main === "para" && !stomatologieOnly && paraServices.length > 0 && (
          <nav
            aria-label="Type paraclinique"
            className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-[#b7efcf] bg-[#EAFDF3] p-2.5"
          >
            {paraServices.map((item) => {
              const active = paraServiceId === item.serviceId;
              return (
                <button
                  key={item.serviceId}
                  type="button"
                  onClick={() => setParaServiceId(item.serviceId)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "psx-subtab inline-flex cursor-pointer items-center whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold",
                    active ? "is-active" : "",
                  )}
                >
                  {item.formKey ? PARA_SHORT_LABELS[item.formKey] : item.name}
                </button>
              );
            })}
          </nav>
        )}

        {/* Active section */}
        <div>{renderSection()}</div>
      </div>
    </div>
  );
}

export default function PrescriptionModule({
  patientId,
  patientType,
  scope,
  serviceDestOverride,
}: PrescriptionModuleProps & {
  /**
   * Bloc opératoire (CPA) : médicamenteuse, non médicamenteuse, surveillance et
   * transfusion partent au service d'origine du patient (voir definirDestinationImposee).
   */
  serviceDestOverride?: ServiceDestOverride;
}) {
  useEffect(() => {
    definirDestinationImposee(serviceDestOverride ?? null);
    return () => definirDestinationImposee(null);
  }, [serviceDestOverride]);

  return (
    <PrescriptionPanierProvider>
      <PrescriptionModuleInner
        patientId={patientId}
        patientType={patientType}
        scope={scope}
      />
    </PrescriptionPanierProvider>
  );
}
