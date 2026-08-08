"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPriseEnChargeById } from "@/lib/clinical/prise-en-charge-api";
import { accueilApiService } from "@/lib/clinical/accueil-api";

const priseEnChargeNameCache = new Map<string, string | null>();
const priseEnChargeInFlight = new Map<string, Promise<string>>();

function pickValidPriseEnChargeId(value: unknown): string {
  if (typeof value !== "string") return "";

  const cleanId = value.trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(cleanId) ? cleanId : "";
}

export function usePriseEnChargeName(
  priseEnChargeId?: string | null,
  patientId?: string | null,
): {
  name: string;
  loading: boolean;
} {
  const cleanPatientId = patientId?.trim() || "";
  const directPriseEnChargeId = pickValidPriseEnChargeId(priseEnChargeId);
  const cacheKey = useMemo(() => {
    if (directPriseEnChargeId) return `prise-en-charge:${directPriseEnChargeId}`;
    if (cleanPatientId) return `patient:${cleanPatientId}`;
    return "";
  }, [directPriseEnChargeId, cleanPatientId]);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(Boolean(cacheKey));

  useEffect(() => {
    let cancelled = false;

    if (!cacheKey) {
      setName("");
      setLoading(false);
      return;
    }

    if (priseEnChargeNameCache.has(cacheKey)) {
      setName(priseEnChargeNameCache.get(cacheKey) ?? "");
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadPriseEnChargeName = async () => {
      let resolvedPriseEnChargeId = directPriseEnChargeId;

      if (!resolvedPriseEnChargeId && cleanPatientId) {
        const patient = await accueilApiService.getPatientById(cleanPatientId);
        resolvedPriseEnChargeId = pickValidPriseEnChargeId(
          patient?.["priseEnChargeId"],
        );
      }

      if (!resolvedPriseEnChargeId) return "";

      const priseEnCharge = await fetchPriseEnChargeById(resolvedPriseEnChargeId);
      return priseEnCharge?.companyName?.trim() || "";
    };

    // Déduplique les requêtes concurrentes pour une même clé (plusieurs cartes
    // du même patient, re-montage rapide lors de la pagination, etc.).
    let request = priseEnChargeInFlight.get(cacheKey);
    if (!request) {
      request = loadPriseEnChargeName()
        .then((companyName) => {
          priseEnChargeNameCache.set(cacheKey, companyName || null);
          return companyName;
        })
        .catch(() => {
          priseEnChargeNameCache.set(cacheKey, null);
          return "";
        })
        .finally(() => {
          priseEnChargeInFlight.delete(cacheKey);
        });
      priseEnChargeInFlight.set(cacheKey, request);
    }

    request
      .then((companyName) => {
        if (!cancelled) setName(companyName);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, directPriseEnChargeId, cleanPatientId]);

  return { name, loading };
}
