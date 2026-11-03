"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredToken } from "@/features/prescription/lib/auth";
import { gatewayUrl } from "@/features/prescription/platform/gateway";

// Origine de la passerelle : les routes ajoutent deja "/prescriptions".
const RAW_API_URL = gatewayUrl();
const API_URL = RAW_API_URL.replace(/\/+$/, "").replace(/\/prescriptions$/, "");

export interface TimelineItem {
  id: string;
  type: "medicament" | "non-medicale" | "surveillance";
  referenceType: string;
  label: string;
  detail: string;
  heurePrevue: string;
  statut: "EN_ATTENTE" | "NOTIFIE";
  urgence: string | null;
}

export function useTimeline(patientId: string | null, hours: number = 24) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch(
        `${API_URL}/prescriptions/prises/patient/${patientId}/timeline?hours=${hours}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [patientId, hours]);

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 60_000);
    return () => clearInterval(interval);
  }, [fetchTimeline]);

  const confirmPrise = useCallback(async (priseId: string) => {
    const token = getStoredToken();
    await fetch(`${API_URL}/prescriptions/prises/${priseId}/confirmer`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setItems((prev) => prev.filter((i) => i.id !== priseId));
  }, []);

  const refusePrise = useCallback(
    async (
      priseId: string,
      motif: string = "Refusé depuis le panneau timeline",
    ) => {
      const token = getStoredToken();
      await fetch(`${API_URL}/prescriptions/prises/${priseId}/refuser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ motif }),
      });
      setItems((prev) => prev.filter((i) => i.id !== priseId));
    },
    [],
  );

  return { items, loading, confirmPrise, refusePrise, refresh: fetchTimeline };
}
