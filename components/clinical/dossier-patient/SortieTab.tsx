"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Home,
  ShieldCheck,
  UserMinus,
} from "lucide-react";
import { sortieMedicaleApi } from "@/lib/clinical/dossier-patient-api";
import { listServices, type ServiceChu } from "@/lib/clinical/service-chu-api";
import { hospitalisationService } from "@/lib/clinical/hospitalisation-service";
import { obtenirSessionValide } from "@/lib/auth/central-session";
import type { ModeSortie } from "@/types/hospitalisation.types";

type SortieMedicale = {
  id?: string;
  chuId?: string;
  serviceId?: string;
  patientId?: string;
  episodeId?: string;
  modeSortie: ModeSortie;
  etatSortie?: string;
  motifSortie?: string;
  resumeHospitalisation?: string;
  diagnosticFinal?: string;
  traitementSortie?: string;
  conduiteATenir?: string;
  rendezVousControle?: string;
  destinationServiceId?: string;
  destinationEtablissement?: string;
  moyenTransport?: string;
  dateDeces?: string;
  causeDeces?: string;
  certificatDecesNumero?: string;
  motifContreAvis?: string;
  risquesExpliques?: string;
  signaturePatient?: boolean;
  isDraft?: boolean;
  isValidated?: boolean;
  validatedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

type SortieTabProps = {
  patientId: string;
  chuId?: string;
  serviceId?: string;
  episodeId?: string;
};

const MODE_SORTIE_META: Record<ModeSortie, { label: string; icon: React.ReactNode }> = {
  SORTIE_AUTORISEE: { label: "Sortie autorisée", icon: <Home size={20} /> },
  TRANSFERT_INTERNE: { label: "Transfert interne", icon: <ArrowRightLeft size={20} /> },
  TRANSFERT_EXTERNE: { label: "Transfert externe", icon: <ArrowRightLeft size={20} /> },
  EVACUATION_SANITAIRE: { label: "Évacuation sanitaire", icon: <ShieldCheck size={20} /> },
  SORTIE_CONTRE_AVIS: { label: "Contre avis médical", icon: <AlertTriangle size={20} /> },
  DECES: { label: "Décès", icon: <UserMinus size={20} /> },
  EVASION: { label: "Évasion", icon: <AlertTriangle size={20} /> },
};

// Le dossier patient est un dossier PARTAGÉ (propriété du service Dossier Patient), et la sortie
// clôt une hospitalisation — un acte administratif hors du périmètre du Bloc opératoire. Cet
// onglet est donc purement en lecture : le formulaire de saisie/validation de sortie (brouillon,
// clôture d'épisode) a été retiré, pas seulement désactivé.
export function SortieTab({ patientId, chuId, serviceId, episodeId }: Readonly<SortieTabProps>) {
  const resolvedChuId = chuId || obtenirSessionValide()?.acces.chu?.id;
  const resolvedServiceId = serviceId || obtenirSessionValide()?.acces.serviceId;

  const [form, setForm] = useState<SortieMedicale | null>(null);
  const [dateSortieEffective, setDateSortieEffective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceChu[]>([]);

  const loadEpisodeIfNeeded = useCallback(async () => {
    if (episodeId) return episodeId;
    if (!resolvedChuId || !resolvedServiceId || !patientId) return undefined;
    const response = await hospitalisationService.getByPatient(patientId, resolvedServiceId, resolvedChuId);
    const episodes = Array.isArray(response) ? response : ((response as any)?.data ?? []);
    const active = episodes.find((ep: any) => ["ADMIS", "EN_COURS"].includes(ep.statut));
    const chosen = active ?? episodes[0];
    if (chosen?.dateSortie) setDateSortieEffective(chosen.dateSortie);
    return chosen?.id as string | undefined;
  }, [episodeId, patientId, resolvedChuId, resolvedServiceId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const epId = await loadEpisodeIfNeeded();
        if (!epId || !resolvedChuId || !resolvedServiceId) return;
        const res = await sortieMedicaleApi.getByEpisode(epId, resolvedChuId, resolvedServiceId);
        if (cancelled) return;
        if (res.data) setForm(res.data);
      } catch {
        // Pas de sortie médicale enregistrée pour cet épisode.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadEpisodeIfNeeded, resolvedChuId, resolvedServiceId]);

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      try {
        const list = await listServices(resolvedChuId);
        if (!cancelled) setServices(list);
      } catch {
        if (!cancelled) setServices([]);
      }
    }
    loadServices();
    return () => {
      cancelled = true;
    };
  }, [resolvedChuId]);

  // Le service de destination n'est connu que par son id — jamais l'id en remplacement du nom
  // (même règle que partout ailleurs dans l'app).
  const destinationServiceName = useMemo(() => {
    if (!form?.destinationServiceId) return undefined;
    return services.find((s) => s.id === form.destinationServiceId)?.name;
  }, [services, form?.destinationServiceId]);

  const isCloture = !!dateSortieEffective || form?.isValidated === true;

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">Chargement...</div>;
  }

  if (!form) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
        Aucune sortie enregistrée pour ce patient.
      </div>
    );
  }

  const modeMeta = MODE_SORTIE_META[form.modeSortie];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FB] text-[#05668D]">
              {modeMeta?.icon}
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900">Sortie du patient</h1>
              <p className="mt-0.5 text-sm font-bold text-slate-600">{modeMeta?.label || form.modeSortie}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${isCloture ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {isCloture ? "ÉPISODE CLÔTURÉ" : "SORTIE EN COURS"}
          </span>
        </div>
        {dateSortieEffective ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            Sortie effective le {new Date(dateSortieEffective).toLocaleString("fr-FR")}
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-slate-900">Résumé médical</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReadField label="État du patient à la sortie" value={form.etatSortie} />
          <ReadField label="Rendez-vous de contrôle" value={form.rendezVousControle} />
          <ReadField label="Diagnostic final" value={form.diagnosticFinal} span2 />
          <ReadField label="Résumé d'hospitalisation" value={form.resumeHospitalisation} span2 />
          <ReadField label="Traitement de sortie" value={form.traitementSortie} span2 />
          <ReadField label="Conduite à tenir / suivi" value={form.conduiteATenir} span2 />
        </div>
      </section>

      {form.modeSortie === "TRANSFERT_INTERNE" ? (
        <ConditionalCard title="Transfert interne">
          <ReadField label="Service de destination" value={destinationServiceName || form.destinationServiceId} />
          <ReadField label="Motif du transfert" value={form.motifSortie} />
        </ConditionalCard>
      ) : null}

      {["TRANSFERT_EXTERNE", "EVACUATION_SANITAIRE"].includes(form.modeSortie) ? (
        <ConditionalCard title="Transfert externe / évacuation">
          <ReadField label="Établissement de destination" value={form.destinationEtablissement} />
          <ReadField label="Moyen de transport" value={form.moyenTransport} />
        </ConditionalCard>
      ) : null}

      {form.modeSortie === "DECES" ? (
        <ConditionalCard title="Décès">
          <ReadField label="Date et heure du décès" value={form.dateDeces ? new Date(form.dateDeces).toLocaleString("fr-FR") : undefined} />
          <ReadField label="Cause du décès" value={form.causeDeces} />
          <ReadField label="Numéro certificat décès" value={form.certificatDecesNumero} />
        </ConditionalCard>
      ) : null}

      {form.modeSortie === "SORTIE_CONTRE_AVIS" ? (
        <ConditionalCard title="Sortie contre avis médical">
          <ReadField label="Motif contre avis" value={form.motifContreAvis} />
          <ReadField label="Risques expliqués au patient" value={form.risquesExpliques} />
          <ReadField label="Patient informé et signature/décharge" value={form.signaturePatient ? "Oui" : "Non"} />
        </ConditionalCard>
      ) : null}
    </div>
  );
}

function ReadField({ label, value, span2 }: Readonly<{ label: string; value?: string; span2?: boolean }>) {
  return (
    <div className={span2 ? "md:col-span-2" : undefined}>
      <div className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{value || "—"}</div>
    </div>
  );
}

function ConditionalCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
      <h2 className="text-base font-black text-amber-900">{title}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}
