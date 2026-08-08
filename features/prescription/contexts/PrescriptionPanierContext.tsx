"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { normalizePayloadForEndpoint } from "@/features/prescription/lib/api";
import { authFetch, getStoredToken, parseJwt } from "@/features/prescription/lib/auth";

export type PanierItemStatus = "draft" | "sending" | "sent" | "error";

// Sous-ensemble porté depuis front-clinique pour la CPA du bloc opératoire : pas de Bloc
// opératoire (ça sert à *demander* une CPA, pas à en faire une) ni de Para-clinique (labo/
// imagerie/etc., hors sujet pour une prescription de sortie de CPA).
export type PanierItemType = "medicale" | "non-medicale" | "surveillance" | "transfusion";

export interface PanierItem {
  localId: string;
  type: PanierItemType;
  label: string;
  summary: string;
  endpoint: string;
  payload: any;
  status: PanierItemStatus;
  error?: string;
  prescriptionId?: string;
}

export interface PanierState {
  items: PanierItem[];
  patientId: string | null;
}

const ENDPOINT_MAP: Record<PanierItemType, string> = {
  medicale: "prescriptions/medicale",
  "non-medicale": "prescriptions/non-medicale",
  surveillance: "prescriptions/surveillance",
  transfusion: "prescriptions/transfusion",
};

// Repli utilisé uniquement si NEXT_PUBLIC_PHARMACY_SERVICE_ID n'est pas défini.
const PHARMACY_SERVICE_ID_FALLBACK = "b0e542b2-4005-4518-bf75-37e6b39a2213";
const PHARMACY_SERVICE_ID = process.env.NEXT_PUBLIC_PHARMACY_SERVICE_ID || PHARMACY_SERVICE_ID_FALLBACK;

// surveillance/transfusion n'ont pas de service de destination connu (aucun serviceId de
// dépôt de sang configuré à ce jour) — laissé vide plutôt qu'une valeur inventée.
const SERVICE_DEST_MAP: Record<PanierItemType, { serviceId: string; serviceName: string }> = {
  medicale:       { serviceId: PHARMACY_SERVICE_ID, serviceName: "Pharmacie" },
  "non-medicale": { serviceId: PHARMACY_SERVICE_ID, serviceName: "Pharmacie" },
  surveillance:   { serviceId: "", serviceName: "" },
  transfusion:    { serviceId: "", serviceName: "Dépôt de sang" },
};

function getUserServiceInfo() {
  const token = getStoredToken();
  if (!token) return { chuId: undefined, chuNom: undefined, serviceId: undefined, serviceName: undefined, userNom: undefined, userPrenom: undefined };
  const payload = parseJwt(token);
  if (!payload) return { chuId: undefined, chuNom: undefined, serviceId: undefined, serviceName: undefined, userNom: undefined, userPrenom: undefined };
  const services = payload.services as Array<Record<string, any>> | undefined;
  const svc = services?.[0];
  const chu = svc?.chu;
  return {
    chuId: chu?.id as string | undefined,
    chuNom: (chu?.name as string | undefined) || "CHU Andrainjato",
    serviceId: svc?.serviceId as string | undefined,
    serviceName: svc?.serviceName as string | undefined,
    userNom: (payload.nom as string | undefined) || undefined,
    userPrenom: (payload.prenom as string | undefined) || (payload.prenoms as string | undefined) || undefined,
  };
}

const LABEL_MAP: Record<PanierItemType, string> = {
  medicale: "Médicamenteuse",
  "non-medicale": "Non médicamenteuse",
  surveillance: "Surveillance",
  transfusion: "Transfusion",
};

// Repli localhost réservé au dev (voir features/prescription/lib/api.ts, même logique).
const RAW_API_URL =
  process.env.NEXT_PUBLIC_PRESCRIPTION_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://prescriptionback-production.up.railway.app");
// Meme normalisation que dans lib/api.ts : on retire un eventuel suffixe
// "/prescriptions" pour eviter le doublon "/prescriptions/prescriptions" (404).
const API_URL = RAW_API_URL.replace(/\/+$/, "").replace(/\/prescriptions$/, "");

export interface ServiceDestOverride {
  serviceId: string;
  serviceName: string;
}

interface PrescriptionPanierContextValue {
  panier: PanierState;
  addToPanier: (type: PanierItemType, summary: string, payload: any) => void;
  removeFromPanier: (localId: string) => void;
  sendAll: (prescripteurId: string) => Promise<void>;
  sendItemDirectly: (type: PanierItemType, summary: string, payload: any, prescripteurId: string) => Promise<any>;
  retryItem: (localId: string) => Promise<void>;
  resetPanier: () => void;
  setPatientId: (patientId: string) => void;
  getLabel: (type: PanierItemType) => string;
  /**
   * Surcharge du service destinataire pour toutes les prescriptions du panier — utilisée
   * quand ce module est ouvert depuis la CPA du bloc (le service destinataire doit être le
   * service d'origine du patient, pas la Pharmacie/le mapping par défaut).
   */
  serviceDestOverride: ServiceDestOverride | null;
  setServiceDestOverride: (override: ServiceDestOverride | null) => void;
}

const PrescriptionPanierContext = createContext<PrescriptionPanierContextValue | undefined>(undefined);

export function PrescriptionPanierProvider({ children }: { children: React.ReactNode }) {
  const [panier, setPanier] = useState<PanierState>({
    items: [],
    patientId: null,
  });
  const [serviceDestOverride, setServiceDestOverride] = useState<ServiceDestOverride | null>(null);

  // Use a ref to avoid stale closure issues in sendAll/retryItem
  const panierRef = useRef(panier);
  panierRef.current = panier;
  const serviceDestOverrideRef = useRef(serviceDestOverride);
  serviceDestOverrideRef.current = serviceDestOverride;

  const setPatientId = useCallback((patientId: string) => {
    setPanier((prev) => {
      if (prev.patientId !== patientId) {
        // Clear the basket when patient changes
        return { items: [], patientId };
      }
      return prev;
    });
  }, []);

  const addToPanier = useCallback((type: PanierItemType, summary: string, payload: any) => {
    const localId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const override = serviceDestOverrideRef.current;
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
          payload: override
            ? { ...payload, serviceIdDest: override.serviceId, serviceNameDest: override.serviceName }
            : payload,
          status: "draft" as PanierItemStatus,
        },
      ],
    }));
  }, []);

  const removeFromPanier = useCallback((localId: string) => {
    setPanier((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.localId !== localId),
    }));
  }, []);

  const sendSingleItem = useCallback(async (item: PanierItem) => {
    const endpoint = item.endpoint;
    const url = `${API_URL}/${endpoint}`;
    const userInfo = getUserServiceInfo();
    const dest = SERVICE_DEST_MAP[item.type] || { serviceId: "", serviceName: "" };
    const normalizedPayload = normalizePayloadForEndpoint(endpoint, {
      ...item.payload,
      chuId: item.payload.chuId || userInfo.chuId,
      chuNom: item.payload.chuNom || userInfo.chuNom,
      serviceIdSource: item.payload.serviceIdSource || item.payload.serviceId || userInfo.serviceId,
      serviceNameSource: item.payload.serviceNameSource || item.payload.serviceName || userInfo.serviceName,
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
  }, []);

  const sendItemDirectly = useCallback(async (type: PanierItemType, summary: string, payload: any, prescripteurId: string) => {
    const current = panierRef.current;
    if (!current.patientId) {
      throw new Error("Aucun patient sélectionné");
    }

    const override = serviceDestOverrideRef.current;
    const tempItem: PanierItem = {
      localId: `direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: LABEL_MAP[type],
      summary,
      endpoint: ENDPOINT_MAP[type],
      payload: override
        ? { ...payload, serviceIdDest: override.serviceId, serviceNameDest: override.serviceName }
        : payload,
      status: "draft" as PanierItemStatus,
    };

    return sendSingleItem(tempItem);
  }, [sendSingleItem]);

  const sendAll = useCallback(async (prescripteurId: string) => {
    const current = panierRef.current;
    if (!current.patientId) {
      throw new Error("Aucun patient sélectionné");
    }

    // Get items that need sending (draft or error for retry-all)
    const itemsToSend = current.items.filter(
      (i) => i.status === "draft" || i.status === "error"
    );

    if (itemsToSend.length === 0) return;

    // Mark all as sending
    setPanier((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        itemsToSend.some((s) => s.localId === item.localId)
          ? { ...item, status: "sending" as PanierItemStatus, error: undefined }
          : item
      ),
    }));

    // Send all in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      itemsToSend.map(async (item) => {
        try {
          const result = await sendSingleItem(item);
          return { localId: item.localId, result, error: null };
        } catch (error) {
          return {
            localId: item.localId,
            result: null,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          };
        }
      })
    );

    // Update status based on results
    setPanier((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
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
      }),
    }));
  }, [sendSingleItem]);

  const retryItem = useCallback(async (localId: string) => {
    const current = panierRef.current;
    const item = current.items.find((i) => i.localId === localId);
    if (!item) return;

    // Mark as sending
    setPanier((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.localId === localId
          ? { ...i, status: "sending" as PanierItemStatus, error: undefined }
          : i
      ),
    }));

    try {
      const result = await sendSingleItem(item);
      setPanier((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.localId === localId
            ? { ...i, status: "sent" as PanierItemStatus, prescriptionId: result.id, error: undefined }
            : i
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
                error: error instanceof Error ? error.message : "Erreur inconnue",
              }
            : i
        ),
      }));
    }
  }, [sendSingleItem]);

  const resetPanier = useCallback(() => {
    setPanier({ items: [], patientId: null });
  }, []);

  const getLabel = useCallback((type: PanierItemType) => {
    return LABEL_MAP[type];
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
        serviceDestOverride,
        setServiceDestOverride,
      }}
    >
      {children}
    </PrescriptionPanierContext.Provider>
  );
}

export function usePrescriptionPanier() {
  const context = useContext(PrescriptionPanierContext);
  if (!context) {
    throw new Error("usePrescriptionPanier must be used within PrescriptionPanierProvider");
  }
  return context;
}
