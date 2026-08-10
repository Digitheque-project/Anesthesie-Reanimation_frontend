"use client";

import { Suspense, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  DossierPatientComplet,
  TABS,
  type TabKey,
} from "@/components/clinical/dossier-patient/DossierPatientComplet";

// Page dédiée (navigation directe, lien partageable, ?tab=... synchronisé dans l'URL) — le
// contenu lui-même vit dans DossierPatientComplet, réutilisé tel quel par DossierPatientModal
// pour l'ouverture en surimpression (voir VoirDossierButton).
function DossierPatientCompletPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const patientId = params.id ?? "";
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && TABS.some((t) => t.key === tabParam)
      ? (tabParam as TabKey)
      : undefined;

  const handleTabChange = useCallback((key: TabKey) => {
    if (typeof globalThis.window === "undefined") return;
    const url = new URL(globalThis.window.location.href);
    url.searchParams.set("tab", key);
    globalThis.window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <DossierPatientComplet
      patientId={patientId}
      chuId={searchParams.get("chuId") ?? undefined}
      serviceId={searchParams.get("serviceId") ?? undefined}
      hospitalisationId={searchParams.get("hospitalisationId") ?? undefined}
      initialTab={initialTab}
      onTabChange={handleTabChange}
      onBack={() => router.back()}
    />
  );
}

export default function DossierPatientCompletPage() {
  return (
    <Suspense fallback={null}>
      <DossierPatientCompletPageContent />
    </Suspense>
  );
}
