"use client";
import { useEffect, useState } from "react";

import { authFetch } from "@/features/prescription/lib/auth";
import { scrollPrescriptionContentToTop } from "@/features/prescription/lib/scrollUtils";
import { getActiveSession } from "@/features/prescription/platform/session-store";
import { serviceChuApi } from "@/features/prescription/platform/service-chu";
import { gatewayUrl } from "@/features/prescription/platform/gateway";
import { Urgence, urgenceClasses } from "./types";
import { Icone } from '@/components/ui/Icone';

/**
 * Orientation d'un patient vers la file d'attente de la Stomatologie
 * (même passage que celui créé par l'accueil) : POST /stomato/passages via la
 * passerelle. Le service Stomatologie est retrouvé par son nom dans le
 * registre du CHU courant — aucun identifiant dans le code ni dans l'env.
 */

interface Props {
  patient: { id: string };
  prescripteur: { id?: string; service?: string };
}

const STOMATO_MATCHERS = ["STOMATO", "DENTAIRE", "DENTISTE", "ODONTO"];

const FLAGS = [
  { key: "gonflement", label: "Gonflement" },
  { key: "saignement", label: "Saignement" },
  { key: "traumatisme", label: "Traumatisme" },
  { key: "fievre", label: "Fièvre" },
] as const;
type Flag = (typeof FLAGS)[number]["key"];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

export default function StomatologieForm({ patient, prescripteur }: Props) {
  const session = getActiveSession();
  const chuId = session?.chuId ?? "";
  const [stomatoServiceId, setStomatoServiceId] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState("");
  const [motif, setMotif] = useState("");
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [douleur, setDouleur] = useState(0);
  const [localisation, setLocalisation] = useState("");
  const [signes, setSignes] = useState<Record<Flag, boolean>>({
    gonflement: false,
    saignement: false,
    traumatisme: false,
    fievre: false,
  });
  const [infoComplementaire, setInfoComplementaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    serviceChuApi
      .getAll(chuId || undefined)
      .then((services) => {
        if (cancelled) return;
        const stomato = services.find((s) =>
          STOMATO_MATCHERS.some((m) => normalize(s.name).includes(m)),
        );
        if (stomato) setStomatoServiceId(stomato.serviceId);
        else setServiceError("Aucun service de Stomatologie n'est déclaré pour ce CHU.");
      })
      .catch(() => {
        if (!cancelled) setServiceError("Impossible de charger les services du CHU.");
      });
    return () => {
      cancelled = true;
    };
  }, [chuId]);

  const isFormValid =
    motif.trim() !== "" && !!stomatoServiceId && !!chuId && !!prescripteur.id;

  async function handleSubmit() {
    if (!isFormValid || !stomatoServiceId) return;
    setLoading(true);
    setApiError("");
    try {
      const response = await authFetch(gatewayUrl("/stomato/passages"), {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          chuId,
          serviceIdSource: session?.serviceId || undefined,
          serviceIdDest: stomatoServiceId,
          motif: motif.trim(),
          urgence: urgence === "NORMAL" ? "NORMALE" : urgence,
          douleur,
          localisation: localisation.trim() || undefined,
          ...signes,
          infoComplementaire: infoComplementaire.trim() || undefined,
          createdBy: prescripteur.id,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;
        throw new Error(message || `Erreur ${response.status}`);
      }
      setMotif("");
      setUrgence("NORMAL");
      setDouleur(0);
      setLocalisation("");
      setSignes({ gonflement: false, saignement: false, traumatisme: false, fievre: false });
      setInfoComplementaire("");
      setToast("Patient orienté vers la file Stomatologie");
      scrollPrescriptionContentToTop();
      setTimeout(() => setToast(""), 2800);
    } catch (error) {
      setApiError(
        `Orientation non envoyée : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {(apiError || serviceError) && (
        <div style={{
          background: "var(--red-lt)", border: "1px solid var(--red-bdr)",
          borderRadius: 8, padding: "10px 12px", fontSize: 12,
          color: "var(--red)", marginBottom: 12,
        }}>{apiError || serviceError}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Motif <span className="req">*</span></label>
            <textarea
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : douleur dentaire aiguë, dent cassée, abcès suspecté..."
            />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Localisation</label>
            <input
              type="text"
              value={localisation}
              onChange={(e) => setLocalisation(e.target.value)}
              placeholder="Ex : mandibule gauche, dent 36, gencive supérieure..."
            />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Signes associés</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {FLAGS.map((flag) => (
                <label key={flag.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={signes[flag.key]}
                    onChange={(e) => setSignes({ ...signes, [flag.key]: e.target.checked })}
                  />
                  {flag.label}
                </label>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Informations complémentaires</label>
            <textarea
              rows={2}
              value={infoComplementaire}
              onChange={(e) => setInfoComplementaire(e.target.value)}
              placeholder="Traitement déjà pris, contexte du traumatisme, précautions..."
            />
          </div>
        </div>
        <div className="psx-side" style={{ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select
                className="urgs"
                value={urgence}
                onChange={(e) => setUrgence(e.target.value as Urgence)}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="TRES_URGENT">Très urgent</option>
              </select>
            </div>
            <label className="lbl">Douleur : {douleur}/10</label>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={douleur}
              onChange={(e) => setDouleur(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <button
            className="bp"
            onClick={handleSubmit}
            style={{
              opacity: isFormValid && !loading ? 1 : 0.5,
              pointerEvents: isFormValid && !loading ? "auto" : "none",
              marginTop: 0,
            }}
          >
            <Icone nom="check_circle" />
            {loading ? "Envoi..." : "Orienter vers la Stomatologie"}
          </button>
        </div>
      </div>
      <p className="hint" style={{ textAlign: "center", marginTop: 6 }}>
        Le patient sera ajouté à la file d&apos;attente de la Stomatologie
      </p>

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    </div>
  );
}
