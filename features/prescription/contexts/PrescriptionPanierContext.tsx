"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { normalizePayloadForEndpoint } from "@/features/prescription/lib/api";
import {
  authFetch,
  getStoredToken,
  parseJwt,
} from "@/features/prescription/lib/auth";
import { getActiveSession } from "@/features/prescription/platform/session-store";
import { orlApi } from "@/features/prescription/platform/orl";
import { serviceChuApi } from "@/features/prescription/platform/service-chu";
import { gatewayUrl } from "@/features/prescription/platform/gateway";

export type PanierItemStatus = "draft" | "sending" | "sent" | "error";

export type PanierItemType =
  | "medicale"
  | "non-medicale"
  | "surveillance"
  | "transfusion"
  | "bloc"
  | "cpa"
  | "labo"
  | "imagerie"
  | "anapath"
  | "eeg"
  | "kine"
  | "endoscopie"
  | "dialyse"
  | "ecg"
  | "orl"
  | "actes-orl"
  | "polysomnographie"
  | "soins-infirmier";

export interface PanierItem {
  localId: string;
  type: PanierItemType;
  label: string;
  summary: string;
  endpoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  status: PanierItemStatus;
  error?: string;
  prescriptionId?: string;
}

interface ServiceDest {
  id: string;
  name: string;
  baseUrl: string;
  type: string;
  isActive: boolean;
  chuId: string;
}

export interface PanierState {
  items: PanierItem[];
  patientId: string | null;
}

// Mapping des types de panier vers les noms de services dans serviceDest.json
const TYPE_TO_SERVICE_NAME: Record<PanierItemType, string> = {
  medicale: "Pharmacie",
  "non-medicale": "Pharmacie",
  "soins-infirmier": "USER_SERVICE",
  surveillance: "USER_SERVICE",
  transfusion: "Banque de sang",
  bloc: "Anesthésie - Réanimation",
  cpa: "Anesthésie - Réanimation",
  labo: "Laboratoire",
  imagerie: "Imagerie",
  anapath: "Anatomie pathologique (Anapath)",
  eeg: "Électroencéphalographie (EEG)",
  ecg: "Électrocardiographie (ECG)",
  polysomnographie: "Centre de sommeil",
  orl: "ORL",
  "actes-orl": "ORL",
  kine: "Kinésithérapie",
  endoscopie: "Endoscopie",
  dialyse: "Dialyse",
};

// Maps panier type → backend endpoint path (relative to API_URL)
const ENDPOINT_MAP: Record<PanierItemType, string> = {
  medicale: "prescriptions/medicale",
  "non-medicale": "prescriptions/non-medicale",
  surveillance: "prescriptions/surveillance",
  transfusion: "prescriptions/transfusion",
  bloc: "prescriptions/bloc",
  cpa: "prescriptions/cpa",
  labo: "prescriptions/labo",
  imagerie: "prescriptions/imagerie",
  anapath: "prescriptions/anapath",
  eeg: "prescriptions/eeg",
  kine: "prescriptions/kine",
  endoscopie: "prescriptions/endoscopie",
  dialyse: "prescriptions/dialyse",
  ecg: "prescriptions/ecg",
  orl: "prescriptions/orl",
  "actes-orl": "prescriptions/actes-orl",
  polysomnographie: "prescriptions/polysomnographie",
  "soins-infirmier": "prescriptions/soins-infirmier",
};

// Fallback IDs — utilisés uniquement si la résolution dynamique échoue
const FALLBACK_SERVICE_IDS: Record<PanierItemType, string> = {
  medicale: process.env.NEXT_PUBLIC_PHARMACY_SERVICE_ID || "",
  "non-medicale": process.env.NEXT_PUBLIC_PHARMACY_SERVICE_ID || "",
  "soins-infirmier": "",
  surveillance: "",
  transfusion: "",
  bloc: process.env.NEXT_PUBLIC_BLOC_SERVICE_ID || "",
  cpa: process.env.NEXT_PUBLIC_BLOC_SERVICE_ID || "",
  labo: process.env.NEXT_PUBLIC_LABO_SERVICE_ID || "",
  imagerie: process.env.NEXT_PUBLIC_IMAGERIE_SERVICE_ID || "",
  anapath: process.env.NEXT_PUBLIC_ANAPATH_SERVICE_ID || "",
  eeg: process.env.NEXT_PUBLIC_EEG_SERVICE_ID || "",
  ecg: process.env.NEXT_PUBLIC_ECG_SERVICE_ID || "",
  polysomnographie: process.env.NEXT_PUBLIC_POLYSOMNOGRAPHIE_SERVICE_ID || "",
  orl: process.env.NEXT_PUBLIC_ORL_SERVICE_ID || "",
  "actes-orl": process.env.NEXT_PUBLIC_ORL_SERVICE_ID || "",
  kine: process.env.NEXT_PUBLIC_KINE_SERVICE_ID || "",
  endoscopie: process.env.NEXT_PUBLIC_ENDOSCOPIE_SERVICE_ID || "",
  dialyse: process.env.NEXT_PUBLIC_DIALYSE_SERVICE_ID || "",
};

// Fonction pour charger les services du CHU de l'utilisateur via l'API
async function loadServiceDest(chuId?: string): Promise<ServiceDest[]> {
  try {
    const services = await serviceChuApi.getAll(chuId);
    const mapped = services.map((s) => ({
      id: s.serviceId,
      name: s.name,
      baseUrl: "",
      type: s.type || "CLINIQUE",
      isActive: s.deletedAt === null,
      chuId: s.chuId,
    }));
    return mapped;
  } catch {
    return [];
  }
}

function normalizeServiceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

// Fonction pour trouver le service par nom
function findServiceByName(
  services: ServiceDest[],
  name: string,
): ServiceDest | null {
  if (!name) return null;
  const normalizedTarget = normalizeServiceName(name);
  const exactMatch = services.find(
    (service) => normalizeServiceName(service.name) === normalizedTarget,
  );
  if (exactMatch) return exactMatch;

  // Le registre peut déclarer l'ORL sous un libellé long et comme service
  // clinique (ex. « Oto-rhino-laryngologie (ORL) »).
  if (normalizedTarget === "ORL") {
    return (
      services.find((service) => {
        const normalizedName = normalizeServiceName(service.name);
        return (
          /(^| )ORL($| )/.test(normalizedName) ||
          normalizedName.includes("OTO RHINO")
        );
      }) || null
    );
  }

  return null;
}

// Fonction pour obtenir le service de destination dynamiquement
function getServiceDest(
  type: PanierItemType,
  serviceDestList: ServiceDest[],
  userInfo?: any,
): { serviceId: string; serviceName: string } {
  const serviceName = TYPE_TO_SERVICE_NAME[type];

  // Cas spécial : surveillance envoyée au service de l'utilisateur connecté
  if (serviceName === "USER_SERVICE") {
    return {
      serviceId: userInfo?.serviceId || "",
      serviceName: userInfo?.serviceName || "",
    };
  }

  if (!serviceName) {
    return { serviceId: "", serviceName: "" };
  }

  const service = findServiceByName(serviceDestList, serviceName);
  if (service) {
    return { serviceId: service.id, serviceName: service.name };
  }

  // Fallback vers les IDs par défaut
  const fallbackId = FALLBACK_SERVICE_IDS[type] || "";
  return { serviceId: fallbackId, serviceName };
}

function resolveDestination(
  type: PanierItemType,
  userInfo: ReturnType<typeof getUserServiceInfo>,
  serviceDestList: ServiceDest[],
  override?: { serviceId: string; serviceName: string },
) {
  if (override?.serviceId?.trim()) return override;

  // Utiliser la résolution dynamique via l'API des services
  return getServiceDest(type, serviceDestList, userInfo);
}

function getUserServiceInfo() {
  const session = getActiveSession();
  const svc = session?.currentService;
  return {
    chuId: svc?.chu?.id,
    chuNom: svc?.chu?.name,
    serviceId: svc?.serviceId,
    serviceName: svc?.serviceName,
    userNom: session?.claims?.name,
    userPrenom: session?.claims?.firstname,
  };
}

const LABEL_MAP: Record<PanierItemType, string> = {
  medicale: "Médicamenteuse",
  "non-medicale": "Non médicamenteuse",
  surveillance: "Surveillance",
  transfusion: "Transfusion sanguine",
  bloc: "Intervention chirurgicale",
  cpa: "CPA",
  labo: "Laboratoire",
  imagerie: "Imagerie",
  anapath: "Anapath",
  eeg: "EEG",
  kine: "Kinésithérapie",
  endoscopie: "Endoscopie",
  dialyse: "Dialyse",
  ecg: "ECG",
  orl: "ORL",
  "actes-orl": "Actes ORL",
  polysomnographie: "Polysomnographie",
  "soins-infirmier": "Soins infirmiers",
};

// Origine de la passerelle : les routes ajoutent deja "/prescriptions".
const RAW_API_URL = gatewayUrl();
// Meme normalisation que dans lib/api.ts : on retire un eventuel suffixe
// "/prescriptions" pour eviter le doublon "/prescriptions/prescriptions" (404).
const API_URL = RAW_API_URL.replace(/\/+$/, "").replace(/\/prescriptions$/, "");

/** Service destinataire imposé (CPA du bloc), voir definirDestinationImposee (lib/api). */
export interface ServiceDestOverride {
  serviceId: string;
  serviceName: string;
}

interface PrescriptionPanierContextValue {
  panier: PanierState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addToPanier: (type: PanierItemType, summary: string, payload: any) => void;
  removeFromPanier: (localId: string) => void;
  sendAll: (
    prescripteurId: string,
  ) => Promise<{ allSent: boolean; errorCount: number }>;
  sendItemDirectly: (
    type: PanierItemType,
    summary: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
    prescripteurId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  retryItem: (localId: string) => Promise<void>;
  resetPanier: () => void;
  setPatientId: (patientId: string) => void;
  getLabel: (type: PanierItemType) => string;
  resolveServiceId: (type: PanierItemType) => {
    serviceId: string;
    serviceName: string;
  };
  setDestination: (
    type: PanierItemType,
    serviceId: string,
    serviceName: string,
  ) => void;
}

const PrescriptionPanierContext = createContext<
  PrescriptionPanierContextValue | undefined
>(undefined);

export function PrescriptionPanierProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panier, setPanier] = useState<PanierState>({
    items: [],
    patientId: null,
  });
  const [serviceDestList, setServiceDestList] = useState<ServiceDest[]>([]);

  // Load serviceDest.json on mount
  useEffect(() => {
    loadServiceDest(getUserServiceInfo().chuId).then(setServiceDestList);
  }, []);

  // Use a ref to avoid stale closure issues in sendAll/retryItem
  const panierRef = useRef(panier);
  const destinationOverridesRef = useRef<
    Partial<Record<PanierItemType, { serviceId: string; serviceName: string }>>
  >({});
  const serviceDestListRef = useRef(serviceDestList);
  panierRef.current = panier;
  serviceDestListRef.current = serviceDestList;

  const setDestination = useCallback(
    (type: PanierItemType, serviceId: string, serviceName: string) => {
      destinationOverridesRef.current[type] = { serviceId, serviceName };
    },
    [],
  );

  const setPatientId = useCallback((patientId: string) => {
    setPanier((prev) => {
      if (prev.patientId !== patientId) {
        // Clear the basket when patient changes
        return { items: [], patientId };
      }
      return prev;
    });
  }, []);

  const addToPanier = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type: PanierItemType, summary: string, payload: any) => {
      const localId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setPanier((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            localId,
            type,
            label: LABEL_MAP[type],
            summary,
            endpoint: ENDPOINT_MAP[type],
            payload,
            status: "draft" as PanierItemStatus,
          },
        ],
      }));
    },
    [],
  );

  const removeFromPanier = useCallback((localId: string) => {
    setPanier((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.localId !== localId),
    }));
  }, []);

  const resolveDestinationForSend = useCallback(
    async (
      type: PanierItemType,
      userInfo: ReturnType<typeof getUserServiceInfo>,
    ) => {
      let destination = resolveDestination(
        type,
        userInfo,
        serviceDestListRef.current,
        destinationOverridesRef.current[type],
      );

      // Evite la course entre le chargement asynchrone du registre et l'envoi.
      // Une seconde lecture permet aussi de recuperer un ORL declare CLINIQUE.
      if (
        (type === "orl" || type === "actes-orl") &&
        !destination.serviceId?.trim()
      ) {
        const refreshedServices = await loadServiceDest(userInfo.chuId);
        if (refreshedServices.length > 0) {
          serviceDestListRef.current = refreshedServices;
          setServiceDestList(refreshedServices);
          destination = resolveDestination(
            type,
            userInfo,
            refreshedServices,
            destinationOverridesRef.current[type],
          );
        }
      }

      if (
        (type === "orl" || type === "actes-orl") &&
        !destination.serviceId?.trim()
      ) {
        throw new Error(
          "Service ORL de destination introuvable. Vérifiez le registre des services ou NEXT_PUBLIC_ORL_SERVICE_ID.",
        );
      }

      return {
        ...destination,
        serviceId: destination.serviceId?.trim() || "",
      };
    },
    [],
  );

  const sendSingleItem = useCallback(
    async (item: PanierItem) => {
      // Handle imagerie: single POST to primary backend only
      // The backend handles external API integration (imagerie-integration.service.ts)
      if (item.type === "imagerie") {
        const examens = Array.isArray(item.payload?.examens)
          ? item.payload.examens
          : [];

        if (examens.length === 0) {
          throw new Error("Aucun examen à envoyer");
        }

        const userInfo = getUserServiceInfo();
        const dest = await resolveDestinationForSend(item.type, userInfo);
        const commonFields = {
          patientId: item.payload.patientId,
          prescripteurId: item.payload.prescripteurId,
          urgence: item.payload.urgence,
          alertes: item.payload.alertes,
          renseignements: item.payload.renseignements,
          notes: item.payload.notes,
          chuId: item.payload.chuId || userInfo.chuId,
          chuNom: item.payload.chuNom || userInfo.chuNom,
          serviceIdSource:
            item.payload.serviceIdSource ||
            item.payload.serviceId ||
            userInfo.serviceId,
          serviceNameSource:
            item.payload.serviceNameSource ||
            item.payload.serviceName ||
            userInfo.serviceName,
          serviceIdDest:
            item.payload.serviceIdDest ||
            item.payload.serviceNotifId ||
            dest.serviceId,
          serviceNameDest: item.payload.serviceNameDest || dest.serviceName,
          statutPatient: item.payload.statutPatient,
          estHospitalise: item.payload.estHospitalise,
          lieuHosp: item.payload.lieuHosp,
          serviceHosp: item.payload.serviceHosp,
          moyenDeplacement: item.payload.moyenDeplacement,
          questionRadio: item.payload.questionRadio,
        };

        const normalizedPayload = normalizePayloadForEndpoint(
          "prescriptions/imagerie",
          {
            ...commonFields,
            examens: examens,
          },
        );

        const primaryUrl = `${API_URL}/prescriptions/imagerie`;

        const response = await authFetch(primaryUrl, {
          method: "POST",
          body: JSON.stringify(normalizedPayload),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err.message || `Erreur backend imagerie (${response.status})`,
          );
        }

        return response.json();
      }

      // Non-imagerie: inject service fields and send
      const endpoint = item.endpoint;
      const url = `${API_URL}/${endpoint}`;
      const userInfo = getUserServiceInfo();
      const dest = await resolveDestinationForSend(item.type, userInfo);
      const normalizedPayload = normalizePayloadForEndpoint(endpoint, {
        ...item.payload,
        chuId: item.payload.chuId || userInfo.chuId,
        chuNom: item.payload.chuNom || userInfo.chuNom,
        serviceIdSource:
          item.payload.serviceIdSource ||
          item.payload.serviceId ||
          userInfo.serviceId,
        serviceNameSource:
          item.payload.serviceNameSource ||
          item.payload.serviceName ||
          userInfo.serviceName,
        serviceIdDest: item.payload.serviceIdDest || dest.serviceId,
        serviceNameDest: item.payload.serviceNameDest || dest.serviceName,
      });
      const response = await authFetch(url, {
        method: "POST",
        body: JSON.stringify(normalizedPayload),
      });

      if (!response.ok) {
        let message = `Échec envoi ${item.label}`;
        try {
          const err = await response.json();
          message = err.message || message;
        } catch {}
        throw new Error(message);
      }

      return response.json();
    },
    [resolveDestinationForSend],
  );

  const sendItemDirectly = useCallback(
    async (
      type: PanierItemType,
      summary: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any,
      prescripteurId: string,
    ) => {
      const current = panierRef.current;
      if (!current.patientId) {
        throw new Error("Aucun patient sélectionné");
      }

      const tempItem: PanierItem = {
        localId: `direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        label: LABEL_MAP[type],
        summary,
        endpoint: ENDPOINT_MAP[type],
        payload: {
          ...payload,
          prescripteurId: payload?.prescripteurId || prescripteurId,
        },
        status: "draft" as PanierItemStatus,
      };

      return sendSingleItem(tempItem);
    },
    [sendSingleItem],
  );

  const sendAll = useCallback(
    async (prescripteurId: string) => {
      const current = panierRef.current;
      if (!current.patientId) {
        throw new Error("Aucun patient sélectionné");
      }

      // Get items that need sending (draft or error for retry-all)
      const itemsToSend = current.items.filter(
        (i) => i.status === "draft" || i.status === "error",
      );

      if (itemsToSend.length === 0) return { allSent: false, errorCount: 0 };

      // Mark all as sending
      setPanier((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          itemsToSend.some((s) => s.localId === item.localId)
            ? {
                ...item,
                status: "sending" as PanierItemStatus,
                error: undefined,
              }
            : item,
        ),
      }));

      // Send all in parallel with Promise.allSettled
      const results = await Promise.allSettled(
        itemsToSend.map(async (item) => {
          try {
            const result = await sendSingleItem({
              ...item,
              payload: {
                ...item.payload,
                prescripteurId: item.payload?.prescripteurId || prescripteurId,
              },
            });
            return { localId: item.localId, result, error: null };
          } catch (error) {
            return {
              localId: item.localId,
              result: null,
              error: error instanceof Error ? error.message : "Erreur inconnue",
            };
          }
        }),
      );

      // Update status based on results
      setPanier((prev) => {
        const updatedItems = prev.items.map((item) => {
          const settledResult = results.find((r) => {
            if (r.status === "fulfilled") {
              return r.value.localId === item.localId;
            }
            return false;
          });

          if (!settledResult) return item;

          const { result: res, error } =
            settledResult.status === "fulfilled"
              ? settledResult.value
              : { result: null, error: "Erreur inconnue" };

          if (error) {
            return { ...item, status: "error" as PanierItemStatus, error };
          }

          return {
            ...item,
            status: "sent" as PanierItemStatus,
            prescriptionId: res?.id,
            error: undefined,
          };
        });
        return { ...prev, items: updatedItems };
      });

      const errorCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.error,
      ).length;

      // Signale à la page hôte (ex. consultation externe) les types de
      // prescriptions réellement envoyées.
      const sentTypes = itemsToSend
        .filter((_, index) => {
          const r = results[index];
          return r?.status === "fulfilled" && !r.value.error;
        })
        .map((i) => i.type);
      if (sentTypes.length > 0) {
        window.dispatchEvent(new CustomEvent("prescriptions-envoyees", { detail: { types: sentTypes } }));
      }

      // Synchronisation ORL : une prescription ORL (actes / consultation)
      // envoyée doit apparaître immédiatement dans la liste du module
      // actes-orl, même si la notification (dépendante du service externe de
      // notifications) n'est pas encore parvenue à orl_back.
      if (errorCount === 0) {
        const sentOrl = itemsToSend.some(
          (i) => i.type === "orl" || i.type === "actes-orl",
        );
        if (sentOrl) {
          const userInfo = getUserServiceInfo();
          if (userInfo.serviceId) {
            orlApi
              .syncAll({
                chuId: userInfo.chuId || undefined,
                serviceIdDest: userInfo.serviceId,
              })
              .then(() => {
                window.dispatchEvent(new CustomEvent("orl-new-prescriptions"));
              })
              .catch(() => {});
          }
        }
      }

      return { allSent: errorCount === 0, errorCount };
    },
    [sendSingleItem],
  );

  const retryItem = useCallback(
    async (localId: string) => {
      const current = panierRef.current;
      const item = current.items.find((i) => i.localId === localId);
      if (!item) return;

      // Mark as sending
      setPanier((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.localId === localId
            ? { ...i, status: "sending" as PanierItemStatus, error: undefined }
            : i,
        ),
      }));

      try {
        const result = await sendSingleItem(item);
        setPanier((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.localId === localId
              ? {
                  ...i,
                  status: "sent" as PanierItemStatus,
                  prescriptionId: result.id,
                  error: undefined,
                }
              : i,
          ),
        }));
      } catch (error) {
        setPanier((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.localId === localId
              ? {
                  ...i,
                  status: "error" as PanierItemStatus,
                  error:
                    error instanceof Error ? error.message : "Erreur inconnue",
                }
              : i,
          ),
        }));
      }
    },
    [sendSingleItem],
  );

  const resetPanier = useCallback(() => {
    setPanier({ items: [], patientId: null });
  }, []);

  const getLabel = useCallback((type: PanierItemType) => {
    return LABEL_MAP[type];
  }, []);

  const resolveServiceId = useCallback((type: PanierItemType) => {
    const userInfo = getUserServiceInfo();
    return resolveDestination(
      type,
      userInfo,
      serviceDestListRef.current,
      destinationOverridesRef.current[type],
    );
  }, []);

  return (
    <PrescriptionPanierContext.Provider
      value={{
        panier,
        addToPanier,
        removeFromPanier,
        sendAll,
        sendItemDirectly,
        retryItem,
        resetPanier,
        setPatientId,
        getLabel,
        resolveServiceId,
        setDestination,
      }}
    >
      {children}
    </PrescriptionPanierContext.Provider>
  );
}

export function usePrescriptionPanier() {
  const context = useContext(PrescriptionPanierContext);
  if (!context) {
    throw new Error(
      "usePrescriptionPanier must be used within PrescriptionPanierProvider",
    );
  }
  return context;
}
