"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  Home,
  ShieldCheck,
  UserMinus,
} from "lucide-react";
import { sortieMedicaleApi } from "@/lib/clinical/dossier-patient-api";
import { listServices, type ServiceChu } from "@/lib/clinical/service-chu-api";
import { hospitalisationService } from "@/lib/clinical/hospitalisation-service";
import { obtenirSessionValide } from "@/lib/auth/central-session";
import { useCurrentMedecin } from "@/lib/clinical-auth/use-current-medecin";
import { usePermissions } from "@/lib/clinical-auth/use-permissions";
import type { CloseHospitalisationPayload, ModeSortie, StatutPaiementSortie } from "@/types/hospitalisation.types";

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

const MODES_SORTIE: Array<{ key: ModeSortie; label: string; icon: React.ReactNode }> = [
  { key: "SORTIE_AUTORISEE", label: "Sortie autorisée", icon: <Home size={22} /> },
  { key: "TRANSFERT_INTERNE", label: "Transfert interne", icon: <ArrowRightLeft size={22} /> },
  { key: "TRANSFERT_EXTERNE", label: "Transfert externe", icon: <ArrowRightLeft size={22} /> },
  { key: "EVACUATION_SANITAIRE", label: "Évacuation sanitaire", icon: <ShieldCheck size={22} /> },
  { key: "SORTIE_CONTRE_AVIS", label: "Contre avis médical", icon: <AlertTriangle size={22} /> },
  { key: "DECES", label: "Décès", icon: <UserMinus size={22} /> },
  { key: "EVASION", label: "Évasion", icon: <AlertTriangle size={22} /> },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuid(value: unknown): string | undefined {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  return UUID_RE.test(text) ? text : undefined;
}

const PAYMENT_OPTIONS: Array<{ value: StatutPaiementSortie; label: string }> = [
  { value: "NON_VERIFIE", label: "Non vérifié" },
  { value: "REGLE", label: "Réglé" },
  { value: "NON_REGLE", label: "Non réglé" },
  { value: "EXONERE", label: "Exonéré" },
  { value: "PRISE_EN_CHARGE", label: "Prise en charge" },
  { value: "REGLEMENT_DIFFERE", label: "Règlement différé" },
];

const SORTIE_UPSERT_FIELDS: Array<keyof SortieMedicale> = [
  "modeSortie",
  "etatSortie",
  "motifSortie",
  "resumeHospitalisation",
  "diagnosticFinal",
  "traitementSortie",
  "conduiteATenir",
  "rendezVousControle",
  "destinationServiceId",
  "destinationEtablissement",
  "moyenTransport",
  "dateDeces",
  "causeDeces",
  "certificatDecesNumero",
  "motifContreAvis",
  "risquesExpliques",
  "signaturePatient",
];

// Le backend valide avec whitelist + forbidNonWhitelisted : on n'envoie QUE les
// champs acceptés par le DTO et on retire les valeurs vides/nulles.
function buildSortiePayload(
  form: SortieMedicale,
  base: {
    chuId?: string;
    serviceId?: string;
    patientId: string;
    episodeId: string;
    isDraft: boolean;
    updatedBy?: string;
  },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    chuId: base.chuId,
    serviceId: base.serviceId,
    patientId: base.patientId,
    episodeId: base.episodeId,
    isDraft: base.isDraft,
  };
  if (base.updatedBy) payload.updatedBy = base.updatedBy;
  for (const key of SORTIE_UPSERT_FIELDS) {
    const value = form[key];
    if (value === undefined || value === null || value === "") continue;
    payload[key] = value;
  }
  return payload;
}

export function SortieTab({ patientId, chuId, serviceId, episodeId }: Readonly<SortieTabProps>) {
  const currentMedecin = useCurrentMedecin();
  const { canDo } = usePermissions();
  const canCreateSortie = canDo('sortieMedicale', 'create');
  const canCloseHospitalisation = canDo('hospitalisation', 'close');
  const actorUuid =
    asUuid(currentMedecin?.id) ||
    (typeof window !== "undefined" ? asUuid(window.localStorage.getItem("userId")) : undefined) ||
    (typeof window !== "undefined" ? asUuid(window.localStorage.getItem("medecinId")) : undefined);
  const resolvedChuId = chuId || obtenirSessionValide()?.acces.chu?.id;
  const resolvedServiceId = serviceId || obtenirSessionValide()?.acces.serviceId;

  const [resolvedEpisodeId, setResolvedEpisodeId] = useState<string | undefined>(episodeId);
  const [form, setForm] = useState<SortieMedicale>({ modeSortie: "SORTIE_AUTORISEE", isDraft: true });
  const [fraisRegles, setFraisRegles] = useState(false);
  const [statutPaiementSortie, setStatutPaiementSortie] = useState<StatutPaiementSortie>("NON_VERIFIE");
  const [referencePaiement, setReferencePaiement] = useState("");
  const [commentairePaiement, setCommentairePaiement] = useState("");
  const [dateSortieEffective, setDateSortieEffective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceChu[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const isCloture = !!dateSortieEffective || form.isValidated === true;

  const setField = <K extends keyof SortieMedicale>(key: K, value: SortieMedicale[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadEpisodeIfNeeded = useCallback(async () => {
    if (episodeId) {
      setResolvedEpisodeId(episodeId);
      return episodeId;
    }
    if (!resolvedChuId || !resolvedServiceId || !patientId) return undefined;
    const response = await hospitalisationService.getByPatient(patientId, resolvedServiceId, resolvedChuId);
    const episodes = Array.isArray(response) ? response : ((response as any)?.data ?? []);
    const active = episodes.find((ep: any) => ["ADMIS", "EN_COURS"].includes(ep.statut));
    const chosen = active ?? episodes[0];
    if (chosen?.id) {
      setResolvedEpisodeId(chosen.id);
      if (chosen.dateSortie) setDateSortieEffective(chosen.dateSortie);
      return chosen.id as string;
    }
    return undefined;
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
        if (res.data) setForm((current) => ({ ...current, ...res.data }));
      } catch {
        // Pas encore de brouillon de sortie médicale.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadEpisodeIfNeeded, resolvedChuId, resolvedServiceId]);

  const missingContext = useMemo(
    () => !resolvedChuId || !resolvedServiceId || !patientId,
    [patientId, resolvedChuId, resolvedServiceId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      setServicesLoading(true);
      try {
        const list = await listServices(resolvedChuId);
        if (!cancelled) setServices(list);
      } catch {
        if (!cancelled) setServices([]);
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    }
    loadServices();
    return () => {
      cancelled = true;
    };
  }, [resolvedChuId]);

  const destinationServiceOptions = useMemo(
    () =>
      services
        .filter((service) => service.isActive !== false && service.id !== resolvedServiceId)
        .map((service) => ({ value: service.id, label: service.name })),
    [services, resolvedServiceId],
  );

  async function handleSaveDraft() {
    if (missingContext || !resolvedEpisodeId) {
      alert("Impossible d'enregistrer : patient, CHU, service ou épisode manquant.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildSortiePayload(form, {
        chuId: resolvedChuId,
        serviceId: resolvedServiceId,
        patientId,
        episodeId: resolvedEpisodeId,
        isDraft: true,
        updatedBy: actorUuid,
      });
      const res = await sortieMedicaleApi.upsert(payload);
      setForm((current) => ({ ...current, ...res.data }));
      alert("Brouillon de sortie enregistré.");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Erreur lors de la sauvegarde de la sortie.");
    } finally {
      setSaving(false);
    }
  }

  function validateBeforeClose(): string | null {
    if (!resolvedEpisodeId) return "Aucun épisode d'hospitalisation actif trouvé.";
    if (!form.modeSortie) return "Le mode de sortie est obligatoire.";
    if (form.modeSortie === "DECES" && !form.causeDeces) return "La cause du décès est obligatoire.";
    if (form.modeSortie === "TRANSFERT_INTERNE" && !form.destinationServiceId) return "Le service de destination est obligatoire.";
    if (["TRANSFERT_EXTERNE", "EVACUATION_SANITAIRE"].includes(form.modeSortie) && !form.destinationEtablissement) {
      return "L'établissement de destination est obligatoire.";
    }
    if (form.modeSortie === "SORTIE_CONTRE_AVIS" && (!form.motifContreAvis || !form.risquesExpliques)) {
      return "Le motif et les risques expliqués sont obligatoires pour une sortie contre avis médical.";
    }
    return null;
  }

  async function handleValidateAndClose() {
    const error = validateBeforeClose();
    if (error) {
      alert(error);
      return;
    }
    if (!actorUuid) {
      alert("Impossible de valider : l'ID utilisateur connecté doit être un UUID.");
      return;
    }
    setSaving(true);
    try {
      const sortieRes = await sortieMedicaleApi.upsert(
        buildSortiePayload(form, {
          chuId: resolvedChuId,
          serviceId: resolvedServiceId,
          patientId,
          episodeId: resolvedEpisodeId!,
          isDraft: false,
          updatedBy: actorUuid,
        }),
      );
      const sortie = sortieRes.data;
      if (sortie?.id) {
        await sortieMedicaleApi.validate(sortie.id, {
          chuId: resolvedChuId,
          serviceId: resolvedServiceId,
          validatedBy: actorUuid,
        });
      }

      const closePayload: CloseHospitalisationPayload = {
        chuId: resolvedChuId!,
        updatedBy: actorUuid,
        modeSortie: form.modeSortie,
        etatSortie: form.etatSortie,
        motifSortie: form.motifSortie,
        resumeSortie: form.resumeHospitalisation,
        diagnosticFinal: form.diagnosticFinal,
        traitementSortie: form.traitementSortie,
        conduiteATenir: form.conduiteATenir,
        rendezVousControle: form.rendezVousControle,
        destinationServiceId: form.destinationServiceId,
        destinationEtablissement: form.destinationEtablissement,
        moyenTransport: form.moyenTransport,
        dateDeces: form.dateDeces,
        causeDeces: form.causeDeces,
        certificatDecesNumero: form.certificatDecesNumero,
        motifContreAvis: form.motifContreAvis,
        risquesExpliques: form.risquesExpliques,
        signaturePatient: form.signaturePatient,
        fraisRegles,
        statutPaiementSortie: fraisRegles ? "REGLE" : statutPaiementSortie,
        referencePaiement,
        commentairePaiement,
      };

      // Ne pas envoyer dateSortie : elle est générée automatiquement par le backend.
      const closed = await hospitalisationService.close(resolvedEpisodeId!, closePayload);
      setForm((current) => ({ ...current, ...sortie, isValidated: true, isDraft: false }));
      setDateSortieEffective((closed as any)?.dateSortie ?? (closed as any)?.data?.dateSortie ?? new Date().toISOString());
      alert("Sortie validée et épisode clôturé.");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Erreur lors de la validation de la sortie.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">Chargement...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Sortie du patient</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              La date et l&apos;heure de sortie ne sont pas saisies ici : elles seront générées automatiquement à la validation.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${isCloture ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {isCloture ? "ÉPISODE CLÔTURÉ" : "PATIENT HOSPITALISÉ"}
          </span>
        </div>
        {dateSortieEffective ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            Sortie effective validée le {new Date(dateSortieEffective).toLocaleString("fr-FR")}
          </div>
        ) : null}
      </div>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <legend className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Mode de sortie *</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODES_SORTIE.map((mode) => {
            const active = form.modeSortie === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                disabled={isCloture}
                onClick={() => setField("modeSortie", mode.key)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                  active ? "border-[#05668D] bg-sky-50 text-[#05668D]" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                } ${isCloture ? "cursor-default opacity-75" : "cursor-pointer"}`}
              >
                {mode.icon}
                <span className="text-sm font-extrabold">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">Résumé médical</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="État du patient à la sortie" value={form.etatSortie} disabled={isCloture} onChange={(v) => setField("etatSortie", v)} placeholder="Stable, amélioré, stationnaire..." />
            <Input label="Rendez-vous de contrôle" value={form.rendezVousControle} disabled={isCloture} onChange={(v) => setField("rendezVousControle", v)} />
            <div className="md:col-span-2">
              <TextArea label="Diagnostic final" value={form.diagnosticFinal} disabled={isCloture} onChange={(v) => setField("diagnosticFinal", v)} />
            </div>
            <div className="md:col-span-2">
              <TextArea label="Résumé d'hospitalisation" value={form.resumeHospitalisation} disabled={isCloture} onChange={(v) => setField("resumeHospitalisation", v)} />
            </div>
            <div className="md:col-span-2">
              <TextArea label="Traitement de sortie" value={form.traitementSortie} disabled={isCloture} onChange={(v) => setField("traitementSortie", v)} />
            </div>
            <div className="md:col-span-2">
              <TextArea label="Conduite à tenir / suivi" value={form.conduiteATenir} disabled={isCloture} onChange={(v) => setField("conduiteATenir", v)} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">Situation administrative</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <span className="text-sm font-extrabold text-slate-700">Patient réglé tous les frais</span>
              <input
                type="checkbox"
                disabled={isCloture}
                checked={fraisRegles}
                onChange={(e) => {
                  setFraisRegles(e.target.checked);
                  setStatutPaiementSortie(e.target.checked ? "REGLE" : "NON_VERIFIE");
                }}
                className="h-5 w-5"
              />
            </label>

            {!fraisRegles ? (
              <div>
                <Label>Statut paiement</Label>
                <select
                  disabled={isCloture}
                  value={statutPaiementSortie}
                  onChange={(e) => setStatutPaiementSortie(e.target.value as StatutPaiementSortie)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <Input label="Référence paiement" value={referencePaiement} disabled={isCloture} onChange={setReferencePaiement} placeholder="Reçu, facture, convention..." />
            <div className="md:col-span-2">
              <TextArea label="Commentaire paiement" value={commentairePaiement} disabled={isCloture} onChange={setCommentairePaiement} />
            </div>
          </div>
        </section>
      </div>

      {form.modeSortie === "TRANSFERT_INTERNE" ? (
        <ConditionalCard title="Transfert interne">
          <Select
            label="Service de destination *"
            value={form.destinationServiceId}
            disabled={isCloture}
            onChange={(v) => setField("destinationServiceId", v)}
            options={destinationServiceOptions}
            placeholder={servicesLoading ? "Chargement des services..." : "Sélectionner un service"}
          />
          <TextArea label="Motif du transfert" value={form.motifSortie} disabled={isCloture} onChange={(v) => setField("motifSortie", v)} />
        </ConditionalCard>
      ) : null}

      {["TRANSFERT_EXTERNE", "EVACUATION_SANITAIRE"].includes(form.modeSortie) ? (
        <ConditionalCard title="Transfert externe / évacuation">
          <Input label="Établissement de destination *" value={form.destinationEtablissement} disabled={isCloture} onChange={(v) => setField("destinationEtablissement", v)} />
          <Input label="Moyen de transport" value={form.moyenTransport} disabled={isCloture} onChange={(v) => setField("moyenTransport", v)} />
        </ConditionalCard>
      ) : null}

      {form.modeSortie === "DECES" ? (
        <ConditionalCard title="Décès">
          <Input label="Date et heure du décès" type="datetime-local" value={form.dateDeces} disabled={isCloture} onChange={(v) => setField("dateDeces", v)} />
          <TextArea label="Cause du décès *" value={form.causeDeces} disabled={isCloture} onChange={(v) => setField("causeDeces", v)} />
          <Input label="Numéro certificat décès" value={form.certificatDecesNumero} disabled={isCloture} onChange={(v) => setField("certificatDecesNumero", v)} />
        </ConditionalCard>
      ) : null}

      {form.modeSortie === "SORTIE_CONTRE_AVIS" ? (
        <ConditionalCard title="Sortie contre avis médical">
          <TextArea label="Motif contre avis *" value={form.motifContreAvis} disabled={isCloture} onChange={(v) => setField("motifContreAvis", v)} />
          <TextArea label="Risques expliqués au patient *" value={form.risquesExpliques} disabled={isCloture} onChange={(v) => setField("risquesExpliques", v)} />
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input type="checkbox" disabled={isCloture} checked={!!form.signaturePatient} onChange={(e) => setField("signaturePatient", e.target.checked)} />{" "}
            Patient informé et signature/décharge obtenue
          </label>
        </ConditionalCard>
      ) : null}

      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:justify-end">
        {!isCloture ? (
          <>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || !canCreateSortie}
              title={!canCreateSortie ? "Vous n'avez pas la permission d'enregistrer une sortie" : undefined}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="mr-2 inline h-4 w-4" />
              Enregistrer brouillon
            </button>
            <button
              type="button"
              onClick={handleValidateAndClose}
              disabled={saving || missingContext || !canCreateSortie || !canCloseHospitalisation}
              title={!canCloseHospitalisation ? "Vous n'avez pas la permission de clôturer l'hospitalisation" : undefined}
              className="rounded-xl bg-[#05668D] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#045777] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              Valider la sortie & clôturer
            </button>
          </>
        ) : (
          <span className="text-sm font-bold text-emerald-700">Sortie validée</span>
        )}
      </div>
    </div>
  );
}

function Label({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{children}</div>;
}

function Input({ label, value, onChange, disabled, placeholder, type = "text" }: Readonly<{
  label: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}>) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#05668D] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled }: Readonly<{
  label: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#05668D] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
}

function Select({ label, value, onChange, disabled, options, placeholder }: Readonly<{
  label: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}>) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#05668D] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <option value="">{placeholder || "Sélectionner..."}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
