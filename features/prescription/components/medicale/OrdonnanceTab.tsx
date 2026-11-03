"use client";

import { useState, useEffect, useMemo } from "react";
import {
  usePrescriptionPanier,
  PanierItem,
} from "@/features/prescription/contexts/PrescriptionPanierContext";
import {
  creerPrescriptionMedicale,
  creerOrdonnanceMedicale,
  getPrescriptionsPatient,
  getQuotaPremierSoin,
} from "@/features/prescription/lib/api";
import { Patient, Prescripteur, Medicament } from "./types";
import { getFrequenceText, getDureeText, formatAriary } from "./utils";
import { scrollPrescriptionContentToTop } from "@/features/prescription/lib/scrollUtils";
import { Icone } from '@/components/ui/Icone';

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
  onAddNew?: () => void;
  premierSoinEligible?: boolean;
}

interface EditableMedicament extends Medicament {
  selected: boolean;
  ordonnanceQuantite: number;
  _cocktailNom?: string;
  _cocktailInstructionsMelange?: string;
}

interface OrdonnanceHistorique {
  id: string;
  statut: string;
  medicaments: any[];
  cocktails?: any[];
  createdAt: string;
  totalAPayer?: number;
  totalPremierSoin?: number;
  prescription: {
    id: string;
    prescripteurNom?: string;
    prescripteurPrenom?: string;
  };
}

export default function OrdonnanceTab({
  patient,
  prescripteur,
  onAddNew,
  premierSoinEligible,
}: Props) {
  const { panier, removeFromPanier, resolveServiceId } =
    usePrescriptionPanier();
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [historique, setHistorique] = useState<OrdonnanceHistorique[]>([]);
  const [showHistorique, setShowHistorique] = useState(true);
  const [kitDejaUtilise, setKitDejaUtilise] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    scrollPrescriptionContentToTop();
    setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    chargerHistorique();
    if (premierSoinEligible) {
      getQuotaPremierSoin(
        patient.id,
        prescripteur?.chuId,
        prescripteur?.serviceId,
      )
        .then((q) => setKitDejaUtilise(q.eligible === false && q.used > 0))
        .catch(() => setKitDejaUtilise(false));
    } else {
      setKitDejaUtilise(false);
    }
  }, [
    patient.id,
    premierSoinEligible,
    prescripteur?.chuId,
    prescripteur?.serviceId,
  ]);

  async function chargerHistorique() {
    try {
      const data = await getPrescriptionsPatient("medicale", patient.id);
      const ords = data
        .filter((p: any) => p.ordonnance)
        .map((p: any) => ({
          id: p.ordonnance.id,
          statut: p.ordonnance.statut,
          medicaments: p.ordonnance.medicaments,
          cocktails: p.cocktails || [],
          createdAt: p.ordonnance.createdAt,
          totalAPayer: Number(p.ordonnance.totalAPayer) || undefined,
          totalPremierSoin: Number(p.ordonnance.totalPremierSoin) || undefined,
          prescription: {
            id: p.id,
            prescripteurNom: p.prescripteurNom,
            prescripteurPrenom: p.prescripteurPrenom,
          },
        }));
      setHistorique(ords);
    } catch {}
  }

  const draftItems = useMemo(
    () =>
      panier.items.filter((i) => i.type === "medicale" && i.status === "draft"),
    [panier.items],
  );

  const [itemsState, setItemsState] = useState<
    Record<string, EditableMedicament[]>
  >({});

  useEffect(() => {
    const next: Record<string, EditableMedicament[]> = {};
    for (const item of draftItems) {
      const existing = itemsState[item.localId];
      if (existing) {
        next[item.localId] = existing;
      } else {
        // Médicaments classiques
        const meds = (item.payload?.medicaments ?? []).map((m: any) => ({
          ...m,
          id:
            m.id ??
            `${item.localId}-${m.nom}-${Math.random().toString(36).slice(2, 8)}`,
          selected: true,
          ordonnanceQuantite: m.quantite,
          premierSoin: m.premierSoin ?? false,
        }));
        // Composants des cocktails — aplatir comme des médicaments séparés
        const cocktailMeds = (item.payload?.cocktails ?? []).flatMap((c: any) =>
          (c.composants ?? []).map((comp: any, idx: number) => ({
            id: `${item.localId}-cocktail-${comp.nom}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
            nom: comp.nom,
            dose: comp.dose,
            quantite: comp.quantite ?? 1,
            quantiteType: comp.quantiteType || undefined,
            voie: c.voie || "",
            frequenceType: c.frequenceType || "",
            frequenceValeur: c.frequenceValeur || 0,
            dureeJours: c.dureeJours || 0,
            dateDebut: c.dateDebut || "",
            heureDebut: c.heureDebut || "",
            instructions: c.instructions || "",
            remarques: c.remarques || "",
            prixUnitaire: comp.prixUnitaire || 0,
            selected: true,
            ordonnanceQuantite: comp.quantite ?? 1,
            premierSoin: comp.premierSoin ?? c.premierSoin ?? false,
            articleId: comp.articleId || undefined,
            // Tag pour identifier l'origine cocktail
            _cocktailNom:
              c.nom ||
              c.composants
                ?.map((cc: any) => `${cc.nom} ${cc.dose}`)
                .join(" + ") ||
              "",
            _cocktailInstructionsMelange: c.instructionsMelange || undefined,
          })),
        );
        next[item.localId] = [...meds, ...cocktailMeds];
      }
    }
    setItemsState(next);
  }, [draftItems.map((i) => i.localId).join(",")]);

  function toggleMedication(itemLocalId: string, medId: string) {
    setItemsState((prev) => ({
      ...prev,
      [itemLocalId]: (prev[itemLocalId] ?? []).map((m) =>
        m.id === medId ? { ...m, selected: !m.selected } : m,
      ),
    }));
  }

  function updateQuantite(itemLocalId: string, medId: string, qty: number) {
    setItemsState((prev) => ({
      ...prev,
      [itemLocalId]: (prev[itemLocalId] ?? []).map((m) =>
        m.id === medId ? { ...m, ordonnanceQuantite: Math.max(0, qty) } : m,
      ),
    }));
  }

  function togglePremierSoin(itemLocalId: string, medId: string) {
    setItemsState((prev) => ({
      ...prev,
      [itemLocalId]: (prev[itemLocalId] ?? []).map((m) =>
        m.id === medId ? { ...m, premierSoin: !m.premierSoin } : m,
      ),
    }));
  }

  function calculerPrix(meds: EditableMedicament[]): number {
    return meds.reduce(
      (sum, m) => sum + m.ordonnanceQuantite * (m.prixUnitaire || 0),
      0,
    );
  }

  async function handleCreateOrdonnance(item: PanierItem) {
    const meds = itemsState[item.localId] ?? [];
    const selected = meds.filter((m) => m.selected && m.ordonnanceQuantite > 0);
    if (selected.length === 0) return;

    setLoading(item.localId);
    try {
      // 1. Créer la prescription médicale sur le backend
      const medicamentsPayload = selected.map((m) => ({
        nom: m.nom,
        dose: m.dose,
        quantite: m.ordonnanceQuantite,
        quantiteType: m.quantiteType || undefined,
        voie: m.voie,
        frequenceType: m.frequenceType,
        frequenceValeur: m.frequenceValeur,
        dureeJours: m.dureeJours,
        instructions: m.instructions,
        remarques: m.remarques,
        dateDebut: m.dateDebut || undefined,
        heureDebut: m.heureDebut || undefined,
        prixUnitaire: m.prixUnitaire || undefined,
        premierSoin: m.premierSoin ?? false,
      }));

      // Résoudre le serviceIdDest Pharmacie depuis le registry AVANT création
      const pharmacyDest = resolveServiceId("medicale");
      const serviceIdDest = pharmacyDest.serviceId || prescripteur.serviceId;

      let prescriptionId = item.payload?.prescriptionId;

      // If no prescriptionId yet, create the prescription on the backend
      if (!prescriptionId) {
        const prescriptionPayload = {
          ...item.payload,
          chuId: item.payload.chuId || prescripteur.chuId,
          serviceIdSource:
            item.payload.serviceIdSource || prescripteur.serviceId,
          serviceIdDest,
          medicaments: medicamentsPayload,
        };

        const prescriptionResult =
          await creerPrescriptionMedicale(prescriptionPayload);

        if (!prescriptionResult?.id) {
          throw new Error(
            "Erreur lors de la création de la prescription médicale",
          );
        }
        prescriptionId = prescriptionResult.id;
      }

      // 2. Créer l'ordonnance directement (pas de panier)
      await creerOrdonnanceMedicale(
        prescriptionId,
        medicamentsPayload,
        undefined,
        serviceIdDest,
      );

      // 3. Retirer l'item du panier
      removeFromPanier(item.localId);

      showToast("Ordonnance créée et envoyée à la pharmacie");
      await chargerHistorique();
    } catch (e: any) {
      showToast(e?.message || "Erreur lors de la création de l'ordonnance.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* === TITRE DE L'ONGLET === */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          background: "linear-gradient(135deg,#006A8C 0%,#04556F 100%)",
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(5,102,141,.25)",
        }}
      >
        <Icone nom="receipt_long" style={{ fontSize: 26, color: "#fff" }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
            Ordonnances pharmacie
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)" }}>
            Espace dédié aux ordonnances à envoyer à la pharmacie. Distinct des
            prescriptions en cours du patient.
          </div>
        </div>
      </div>

      {/* === SECTION ORDONNANCES EN ATTENTE (PANIER) === */}
      {draftItems.length === 0 && historique.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--txt3)",
          }}
        >
          <Icone nom="description" style={{ fontSize: 40, display: "block", marginBottom: 8, color: "var(--bdr)", }} />
          <p style={{ fontSize: 13 }}>Aucune ordonnance en attente</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Ajoutez des médicaments depuis l&apos;onglet{" "}
            <strong>Nouvelle prescription</strong> puis cliquez{" "}
            <strong>Valider</strong>.
          </p>
        </div>
      ) : (
        <>
          {draftItems.map((item) => {
            // Pour les prescriptions médicales (à convertir en ordonnance)
            const meds = itemsState[item.localId] ?? [];
            const selected = meds.filter(
              (m) => m.selected && m.ordonnanceQuantite > 0,
            );
            const selectedCount = selected.length;
            const isLoading = loading === item.localId;

            const premierSoinMeds = premierSoinEligible
              ? meds.filter((m) => m.premierSoin)
              : [];
            const nonPremierSoinMeds = premierSoinEligible
              ? meds.filter((m) => !m.premierSoin)
              : [];

            // Calculs de prix
            const selectedMeds = meds.filter((m) => m.selected);
            const totalTous = calculerPrix(selectedMeds);
            const totalPremierSoinBrut =
              premierSoinEligible && !kitDejaUtilise
                ? calculerPrix(selectedMeds.filter((m) => m.premierSoin))
                : 0;
            const PLAFOND_PS = 79000;
            const totalPremierSoin =
              totalPremierSoinBrut > 0 && totalPremierSoinBrut <= PLAFOND_PS
                ? totalPremierSoinBrut
                : 0;
            const totalAPayer = totalTous - totalPremierSoin;

            return (
              <div
                key={item.localId}
                style={{
                  border: "1px solid var(--bdr)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  background: "var(--card)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--navy-lt)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icone nom="description" style={{ fontSize: 18, color: "var(--navy)" }} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--txt)",
                        }}
                      >
                        {item.summary}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--txt3)" }}>
                        {selectedCount}/{meds.length} sélectionné(s) pour
                        l&apos;ordonnance
                      </div>
                    </div>
                  </div>
                  <button
                    className="bdel"
                    onClick={() => removeFromPanier(item.localId)}
                    title="Ne pas faire d'ordonnance"
                  >
                    <Icone nom="delete" />
                  </button>
                </div>

                {/* RÉCAPITULATIF PRIX */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 12,
                    padding: "10px 12px",
                    background: "var(--green-lt)",
                    borderRadius: 8,
                    border: "1px solid var(--green-bdr)",
                    fontSize: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--txt3)" }}>Total brut : </span>
                    <strong>{formatAriary(totalTous)}</strong>
                  </div>
                  {premierSoinEligible && totalPremierSoin > 0 && (
                    <div>
                      <span style={{ color: "var(--txt3)" }}>
                        Premiers soins (déduit) :{" "}
                      </span>
                      <strong style={{ color: "var(--green)" }}>
                        - {formatAriary(totalPremierSoin)}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: "var(--txt3)" }}>
                      Total à payer :{" "}
                    </span>
                    <strong
                      style={{
                        color: totalAPayer > 0 ? "var(--red)" : "var(--green)",
                        fontSize: 14,
                      }}
                    >
                      {formatAriary(totalAPayer)}
                    </strong>
                  </div>
                </div>

                {/* PREMIER SOINS SECTION (uniquement si éligible) */}
                {premierSoinEligible && premierSoinMeds.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                        padding: "6px 10px",
                        background: "var(--blue-ps-lt)",
                        borderRadius: 6,
                        border: "1px solid var(--blue-ps-bdr)",
                      }}
                    >
                      <Icone nom="local_hospital" style={{ fontSize: 14, color: "var(--blue-ps)" }} />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--blue-ps-dk)",
                        }}
                      >
                        PREMIER SOINS
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--blue-info)",
                          fontWeight: 600,
                        }}
                      >
                        ({premierSoinMeds.length})
                      </span>
                    </div>
                    {premierSoinMeds.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderBottom: "1px solid var(--bdr)",
                          fontSize: 13,
                          borderLeft: "3px solid var(--blue-ps)",
                          background: "var(--blue-ps-lt)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={m.selected}
                          onChange={() => toggleMedication(item.localId, m.id)}
                          style={{ flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>
                            {m.nom} {m.dose}
                          </strong>
                          {m._cocktailNom && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: "rgba(5,102,141,0.10)",
                                color: "var(--navy)",
                                fontWeight: 600,
                                marginLeft: 6,
                              }}
                            >
                              Cocktail: {m._cocktailNom}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--txt3)",
                              display: "block",
                            }}
                          >
                            {[
                              getFrequenceText(
                                m.frequenceType,
                                m.frequenceValeur,
                              ),
                              getDureeText(m),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {m.prixUnitaire != null && m.prixUnitaire > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--blue-ps)",
                                fontWeight: 600,
                              }}
                            >
                              {formatAriary(m.prixUnitaire)} / unité
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: 11, color: "var(--txt3)" }}>
                            Qté:
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={m.ordonnanceQuantite}
                            onChange={(e) =>
                              updateQuantite(
                                item.localId,
                                m.id,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            disabled={!m.selected}
                            style={{
                              width: 55,
                              textAlign: "center",
                              padding: "4px 0",
                              fontSize: 12,
                              borderRadius: 6,
                              border: "1px solid var(--bdr)",
                              opacity: m.selected ? 1 : 0.5,
                            }}
                          />
                        </div>
                        <label
                          title="Premier Soin"
                          style={{
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexShrink: 0,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={m.premierSoin ?? false}
                            onChange={() =>
                              togglePremierSoin(item.localId, m.id)
                            }
                            style={{
                              accentColor: "var(--blue-ps)",
                              width: 14,
                              height: 14,
                            }}
                          />
                          <Icone nom="local_hospital" style={{ fontSize: 12, color: "var(--blue-ps)" }} />
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Médicaments — liste unique si non éligible, ou section "autres" si éligible */}
                {(premierSoinEligible ? nonPremierSoinMeds : meds).length >
                  0 && (
                  <div style={{ marginBottom: 12 }}>
                    {premierSoinEligible && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 6,
                          padding: "6px 10px",
                          background: "#f9fafb",
                          borderRadius: 6,
                          border: "1px solid var(--bdr)",
                        }}
                      >
                        <Icone nom="medication" style={{ fontSize: 14, color: "var(--txt3)" }} />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--txt2)",
                          }}
                        >
                          AUTRES MÉDICAMENTS
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--txt3)",
                            fontWeight: 600,
                          }}
                        >
                          ({nonPremierSoinMeds.length})
                        </span>
                      </div>
                    )}
                    {(premierSoinEligible ? nonPremierSoinMeds : meds).map(
                      (m) => (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderBottom: "1px solid var(--bdr)",
                            fontSize: 13,
                            ...(m._cocktailNom
                              ? {
                                  borderLeft: "3px solid var(--navy)",
                                  background: "rgba(5,102,141,0.03)",
                                }
                              : {}),
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={m.selected}
                            onChange={() =>
                              toggleMedication(item.localId, m.id)
                            }
                            style={{ flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>
                              {m.nom} {m.dose}
                            </strong>
                            {m._cocktailNom && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: "rgba(5,102,141,0.10)",
                                  color: "var(--navy)",
                                  fontWeight: 600,
                                  marginLeft: 6,
                                }}
                              >
                                Cocktail: {m._cocktailNom}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--txt3)",
                                display: "block",
                              }}
                            >
                              {[
                                getFrequenceText(
                                  m.frequenceType,
                                  m.frequenceValeur,
                                ),
                                getDureeText(m),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                            {m.prixUnitaire != null && m.prixUnitaire > 0 && (
                              <span
                                style={{ fontSize: 10, color: "var(--txt3)" }}
                              >
                                {formatAriary(m.prixUnitaire)} / unité
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{ fontSize: 11, color: "var(--txt3)" }}
                            >
                              Qté:
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={m.ordonnanceQuantite}
                              onChange={(e) =>
                                updateQuantite(
                                  item.localId,
                                  m.id,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              disabled={!m.selected}
                              style={{
                                width: 55,
                                textAlign: "center",
                                padding: "4px 0",
                                fontSize: 12,
                                borderRadius: 6,
                                border: "1px solid var(--bdr)",
                                opacity: m.selected ? 1 : 0.5,
                              }}
                            />
                          </div>
                          {premierSoinEligible && (
                            <label
                              title="Premier Soin"
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexShrink: 0,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={m.premierSoin ?? false}
                                onChange={() =>
                                  togglePremierSoin(item.localId, m.id)
                                }
                                style={{
                                  accentColor: "var(--blue-ps)",
                                  width: 14,
                                  height: 14,
                                }}
                              />
                              <Icone nom="local_hospital" style={{ fontSize: 12, color: "var(--txt3)" }} />
                            </label>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* Empty state */}
                {meds.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "16px",
                      color: "var(--txt3)",
                      fontSize: 12,
                    }}
                  >
                    Aucun médicament dans cette ordonnance
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="bok"
                    onClick={() => handleCreateOrdonnance(item)}
                    disabled={isLoading || selectedCount === 0}
                    style={{
                      flex: 1,
                      opacity: isLoading || selectedCount === 0 ? 0.5 : 1,
                      pointerEvents:
                        isLoading || selectedCount === 0 ? "none" : "auto",
                    }}
                  >
                    {isLoading ? "Envoi..." : `Créer et envoyer l'ordonnance`}
                  </button>
                  <button
                    className="bca"
                    onClick={() => removeFromPanier(item.localId)}
                    disabled={isLoading}
                  >
                    Ne pas faire d'ordonnance
                  </button>
                </div>
              </div>
            );
          })}

          {/* === HISTORIQUE DES ORDONNANCES === */}
          {historique.length > 0 && (
            <div style={{ marginTop: draftItems.length > 0 ? 24 : 0 }}>
              <div
                onClick={() => setShowHistorique(!showHistorique)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  padding: "10px 12px",
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid var(--bdr)",
                  marginBottom: 8,
                }}
              >
                <Icone nom="history" style={{ fontSize: 18, color: "var(--navy)" }} />
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}
                >
                  Historique des ordonnances ({historique.length})
                </span>
                <Icone nom={showHistorique ? "expand_less" : "expand_more"} style={{ marginLeft: "auto", fontSize: 16, color: "var(--txt3)", }} />
              </div>

              {showHistorique &&
                historique.map((h) => {
                  const totalAPayer = h.totalAPayer ?? 0;
                  const totalPS = h.totalPremierSoin ?? 0;
                  return (
                    <div
                      key={h.id}
                      style={{
                        border: "1px solid var(--bdr)",
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          Ordonnance du{" "}
                          {new Date(h.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background:
                              h.statut === "EN_ATTENTE"
                                ? "var(--amber-lt)"
                                : h.statut === "VALIDEE"
                                  ? "var(--green-lt)"
                                  : "var(--surface-alt)",
                            color:
                              h.statut === "EN_ATTENTE"
                                ? "var(--amber-dk)"
                                : h.statut === "VALIDEE"
                                  ? "var(--green-dk)"
                                  : "var(--txt3)",
                          }}
                        >
                          {h.statut}
                        </div>
                      </div>
                      <div style={{ color: "var(--txt3)", marginBottom: 6 }}>
                        Dr {h.prescription.prescripteurNom}{" "}
                        {h.prescription.prescripteurPrenom}
                      </div>
                      {Array.isArray(h.medicaments) &&
                        h.medicaments.slice(0, 5).map((m: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              padding: "2px 0",
                              color: "var(--txt2)",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span>•</span>
                            <span style={{ fontWeight: 600 }}>{m.nom}</span>
                            {m.dose && <span>- {m.dose}</span>}
                            <span>× {m.quantite}</span>
                            {m.cocktailNom && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: "rgba(5,102,141,0.10)",
                                  color: "var(--navy)",
                                  fontWeight: 600,
                                }}
                              >
                                Cocktail: {m.cocktailNom}
                              </span>
                            )}
                          </div>
                        ))}
                      {Array.isArray(h.medicaments) &&
                        h.medicaments.length > 5 && (
                          <div
                            style={{
                              color: "var(--txt3)",
                              fontSize: 10,
                              marginTop: 2,
                            }}
                          >
                            + {h.medicaments.length - 5} autre(s)
                          </div>
                        )}
                      {Array.isArray(h.cocktails) &&
                        h.cocktails.length > 0 &&
                        h.cocktails.map((c: any, ci: number) => {
                          const freq =
                            c.frequenceType && c.frequenceValeur != null
                              ? getFrequenceText(
                                  c.frequenceType,
                                  c.frequenceValeur,
                                )
                              : "";
                          const dur = getDureeText(c);
                          const dateStr = c.dateDebut
                            ? new Date(c.dateDebut).toLocaleDateString("fr-FR")
                            : "";
                          const totalComp =
                            c.composants?.reduce(
                              (s: number, comp: any) =>
                                s + comp.quantite * (comp.prixUnitaire || 0),
                              0,
                            ) || 0;
                          return (
                            <div
                              key={`cocktail-h-${ci}`}
                              style={{
                                marginTop: 6,
                                padding: "8px 10px",
                                background: "rgba(5,102,141,0.04)",
                                borderRadius: 8,
                                borderLeft: "3px solid var(--navy)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginBottom: 4,
                                }}
                              >
                                <Icone nom="science" style={{ fontSize: 14, color: "var(--navy)" }} />
                                <strong style={{ fontSize: 12 }}>
                                  {c.nom ||
                                    c.composants
                                      ?.map((cc: any) => `${cc.nom} ${cc.dose}`)
                                      .join(" + ") ||
                                    "Cocktail"}
                                </strong>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    background: "var(--navy)",
                                    color: "#fff",
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                  }}
                                >
                                  Cocktail
                                </span>
                              </div>
                              {c.instructionsMelange && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--navy)",
                                    fontStyle: "italic",
                                    padding: "2px 6px",
                                    background: "rgba(5,102,141,0.06)",
                                    borderRadius: 4,
                                    marginBottom: 4,
                                  }}
                                >
                                  Mélange: {c.instructionsMelange}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "var(--txt2)",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "2px 10px",
                                  lineHeight: 1.5,
                                }}
                              >
                                {c.voie && (
                                  <span>
                                    Voie: <strong>{c.voie}</strong>
                                  </span>
                                )}
                                {freq && (
                                  <span>
                                    Fréquence: <strong>{freq}</strong>
                                  </span>
                                )}
                                {dur && (
                                  <span>
                                    Durée: <strong>{dur}</strong>
                                  </span>
                                )}
                                {dateStr && (
                                  <span>
                                    Début: <strong>{dateStr}</strong>
                                  </span>
                                )}
                                {c.heureDebut && (
                                  <span>
                                    Heure: <strong>{c.heureDebut}</strong>
                                  </span>
                                )}
                              </div>
                              {c.composants && c.composants.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                  {c.composants.map(
                                    (comp: any, cpi: number) => (
                                      <div
                                        key={cpi}
                                        style={{
                                          fontSize: 10,
                                          color: "var(--txt2)",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 5,
                                          padding: "1px 0",
                                        }}
                                      >
                                        <Icone nom="medication" style={{ fontSize: 10, color: "var(--txt3)", }} />
                                        <span style={{ fontWeight: 600 }}>
                                          {comp.nom}
                                        </span>
                                        <span>{comp.dose}</span>
                                        <span
                                          style={{
                                            fontSize: 9,
                                            padding: "1px 4px",
                                            borderRadius: 4,
                                            background: "var(--inp)",
                                            fontWeight: 600,
                                          }}
                                        >
                                          qté {comp.quantite}
                                        </span>
                                        {comp.prixUnitaire != null &&
                                          comp.prixUnitaire > 0 && (
                                            <span
                                              style={{
                                                fontSize: 9,
                                                color: "var(--txt3)",
                                              }}
                                            >
                                              {formatAriary(comp.prixUnitaire)}
                                            </span>
                                          )}
                                      </div>
                                    ),
                                  )}
                                  {totalComp > 0 && (
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "var(--navy)",
                                        marginTop: 2,
                                        textAlign: "right",
                                      }}
                                    >
                                      Total: {formatAriary(totalComp)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {c.instructions && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--txt2)",
                                    fontStyle: "italic",
                                    marginTop: 3,
                                    padding: "2px 6px",
                                    background: "rgba(0,0,0,.03)",
                                    borderRadius: 4,
                                  }}
                                >
                                  {c.instructions}
                                </div>
                              )}
                              {c.remarques && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--txt3)",
                                    marginTop: 2,
                                  }}
                                >
                                  {c.remarques}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          fontSize: 11,
                        }}
                      >
                        <span>
                          Total brut :{" "}
                          <strong>{formatAriary(totalAPayer + totalPS)}</strong>
                        </span>
                        {totalPS > 0 && (
                          <span style={{ color: "#16a34a" }}>
                            Premiers soins :{" "}
                            <strong>- {formatAriary(totalPS)}</strong>
                          </span>
                        )}
                        <span
                          style={{
                            fontWeight: 700,
                            color: totalAPayer > 0 ? "#dc2626" : "#16a34a",
                          }}
                        >
                          À payer : {formatAriary(totalAPayer)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="tst on">
          <Icone nom="check_circle" />
          {toast}
        </div>
      )}
    </div>
  );
}
