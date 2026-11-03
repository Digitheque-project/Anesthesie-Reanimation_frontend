"use client";
import { useState, useEffect } from "react";
import ECGForm from "./ECGForm";
import { updateEcgInterpretation } from "@/features/prescription/lib/api";
import { getStoredToken } from "@/features/prescription/lib/auth";
import { gatewayUrl } from "@/features/prescription/platform/gateway";
import { Icone } from '@/components/ui/Icone';

interface Props {
  patient: {
    id: string;
    nom?: string;
    prenom?: string;
    sexe?: string;
    dateNaissance?: string;
    allergies?: string[];
    groupeSanguin?: string;
  };
  prescripteur: {
    id?: string;
    nom?: string;
    prenom?: string;
    service?: string;
  };
  patientType?: "hospitalise" | "consultation_externe" | "accueil";
  ecgCount?: number;
}

interface EcgPrescription {
  id: string;
  createdAt: string;
  renseignements?: string;
  remarques?: string;
  alertes?: string;
  statut?: string;
  urgence?: string;
  interpretation?: string;
  interpreteParId?: string;
  interpreteLe?: string;
  prescripteurId?: string;
  nomMedecinPrescripteur?: string;
}

export default function EcgSection({
  patient,
  prescripteur,
  patientType,
  ecgCount,
}: Props) {
  const [activeTab, setActiveTab] = useState<"prescription" | "interpretation">(
    "prescription",
  );
  const [ecgs, setEcgs] = useState<EcgPrescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEcg, setSelectedEcg] = useState<EcgPrescription | null>(null);
  const [interpretationText, setInterpretationText] = useState("");
  const [saving, setSaving] = useState(false);

  // Origine de la passerelle : les routes ajoutent deja "/prescriptions".
  const apiUrl = gatewayUrl();

  async function fetchPatientECGs() {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch(
        `${apiUrl}/prescriptions/ecg/patient/${encodeURIComponent(patient.id)}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setEcgs(Array.isArray(data) ? data : []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      setEcgs([]);
      setInitialLoadDone(false);
      setActiveTab("prescription");
      fetchPatientECGs();
    }
  }, [patient?.id]);

  useEffect(() => {
    if (!initialLoadDone && ecgs.length > 0) {
      const hasUninterpreted = ecgs.some((e) => !e.interpretation);
      if (hasUninterpreted) {
        setActiveTab("interpretation");
      }
      setInitialLoadDone(true);
    }
  }, [ecgs, initialLoadDone]);

  async function handleSaveInterpretation() {
    if (!selectedEcg?.id || !interpretationText.trim()) return;
    setSaving(true);
    try {
      const updated = await updateEcgInterpretation(
        selectedEcg.id,
        interpretationText,
      );
      setEcgs((prev) =>
        prev.map((e) =>
          e.id === updated.id
            ? {
                ...e,
                interpretation: updated.interpretation,
                interpreteLe: updated.interpreteLe,
                interpreteParId: updated.interpreteParId,
              }
            : e,
        ),
      );
      setSelectedEcg((prev) =>
        prev
          ? {
              ...prev,
              interpretation: updated.interpretation,
              interpreteLe: updated.interpreteLe,
              interpreteParId: updated.interpreteParId,
            }
          : prev,
      );
    } catch {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const uninterpretedCount = ecgs.filter((e) => !e.interpretation).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "var(--bg2)",
          borderRadius: 10,
          padding: 3,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setActiveTab("prescription")}
          style={{
            flex: 1,
            padding: "10px 16px",
            border: "none",
            borderRadius: 8,
            background: activeTab === "prescription" ? "#fff" : "transparent",
            color:
              activeTab === "prescription"
                ? "var(--green-dk, #16a34a)"
                : "var(--txt3)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow:
              activeTab === "prescription"
                ? "0 1px 3px rgba(0,0,0,.1)"
                : "none",
            transition: "all .15s",
          }}
        >
          <Icone nom="note_add" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />
          Prescription
        </button>
        <button
          onClick={() => setActiveTab("interpretation")}
          style={{
            flex: 1,
            padding: "10px 16px",
            border: "none",
            borderRadius: 8,
            background: activeTab === "interpretation" ? "#fff" : "transparent",
            color:
              activeTab === "interpretation"
                ? "var(--green-dk, #16a34a)"
                : "var(--txt3)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow:
              activeTab === "interpretation"
                ? "0 1px 3px rgba(0,0,0,.1)"
                : "none",
            transition: "all .15s",
            position: "relative",
          }}
        >
          <Icone nom="favorite" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />
          Interprétation
          {uninterpretedCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 10,
                background: "var(--amber, #d97706)",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {uninterpretedCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "prescription" ? (
        <ECGForm
          patient={patient}
          prescripteur={prescripteur}
          patientType={patientType}
        />
      ) : (
        <div>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--txt3)",
                fontSize: 13,
              }}
            >
              Chargement des ECG...
            </div>
          ) : ecgs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--txt3)",
                fontSize: 13,
              }}
            >
              Aucune prescription ECG trouvée pour ce patient.
            </div>
          ) : selectedEcg ? (
            <div>
              <button
                onClick={() => setSelectedEcg(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--navy)",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icone nom="arrow_back" style={{ fontSize: 16 }} />
                Retour à la liste
              </button>

              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--txt3)",
                    marginBottom: 4,
                  }}
                >
                  Prescription du{" "}
                  {new Date(selectedEcg.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {selectedEcg.alertes && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--txt)",
                      marginBottom: 4,
                    }}
                  >
                    <strong>Alertes :</strong> {selectedEcg.alertes}
                  </div>
                )}
                {selectedEcg.renseignements && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--txt)",
                      marginBottom: 4,
                    }}
                  >
                    <strong>Renseignements cliniques :</strong>{" "}
                    {selectedEcg.renseignements}
                  </div>
                )}
                {selectedEcg.remarques && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--txt)",
                      marginBottom: 4,
                    }}
                  >
                    <strong>Remarques :</strong> {selectedEcg.remarques}
                  </div>
                )}
              </div>

              <div
                className="card"
                style={{ padding: 16, border: "1px solid var(--bdr)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <Icone nom={selectedEcg.interpretation ? "check_circle" : "pending"} style={{ fontSize: 18, color: selectedEcg.interpretation ? "var(--green-dk)" : "var(--amber-dk)", }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: selectedEcg.interpretation
                        ? "var(--green-dk)"
                        : "var(--amber-dk)",
                    }}
                  >
                    {selectedEcg.interpretation
                      ? "Interprété"
                      : "Non interprété"}
                  </span>
                  {selectedEcg.interpreteLe && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--txt3)",
                        marginLeft: 8,
                      }}
                    >
                      le{" "}
                      {new Date(selectedEcg.interpreteLe).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  )}
                </div>

                {selectedEcg.interpretation && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--txt)",
                      lineHeight: 1.6,
                      marginBottom: 12,
                      padding: 10,
                      background: "var(--bg2)",
                      borderRadius: 8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedEcg.interpretation}
                  </div>
                )}

                <textarea
                  value={interpretationText}
                  onChange={(e) => setInterpretationText(e.target.value)}
                  placeholder="Saisir l'interprétation de l'ECG..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1.5px solid var(--bdr)",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
                <button
                  onClick={handleSaveInterpretation}
                  disabled={!interpretationText.trim() || saving}
                  style={{
                    marginTop: 8,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: interpretationText.trim()
                      ? "var(--green-dk, #16a34a)"
                      : "var(--bdr)",
                    color: interpretationText.trim() ? "#fff" : "var(--txt3)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: interpretationText.trim() ? "pointer" : "default",
                  }}
                >
                  {saving
                    ? "Enregistrement..."
                    : selectedEcg.interpretation
                      ? "Modifier"
                      : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ecgs.map((ecg) => (
                <div
                  key={ecg.id}
                  onClick={() => {
                    setSelectedEcg(ecg);
                    setInterpretationText(ecg.interpretation || "");
                  }}
                  className="card"
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--txt)",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ecg.renseignements || "ECG"}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--txt3)",
                        marginTop: 2,
                      }}
                    >
                      {new Date(ecg.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    {ecg.statut && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--bg2)",
                          color: "var(--txt2)",
                        }}
                      >
                        {ecg.statut}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: ecg.interpretation
                          ? "var(--green-lt)"
                          : "var(--amber-lt)",
                        color: ecg.interpretation
                          ? "var(--green-dk)"
                          : "var(--amber-dk)",
                        fontWeight: 600,
                      }}
                    >
                      {ecg.interpretation ? "Interprété" : "Non interprété"}
                    </span>
                    <Icone nom="chevron_right" style={{ fontSize: 16, color: "var(--txt3)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
