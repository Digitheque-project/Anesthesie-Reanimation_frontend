"use client";

import React, { useState } from "react";
import { usePrescriptionPanier, PanierItemStatus } from "@/features/prescription/contexts/PrescriptionPanierContext";

const TYPE_ICONS: Record<string, string> = {
  medicale: "medication",
  "non-medicale": "self_care",
  surveillance: "monitor_heart",
  transfusion: "bloodtype",
  bloc: "medical_services",
  labo: "science",
  imagerie: "radiology",
  anapath: "biotech",
  eeg: "neurology",
  kine: "exercise",
  endoscopie: "visibility",
  dialyse: "water_full",
};

export default function PrescriptionPanier({ prescripteurId = "" }: { prescripteurId?: string }) {
  const { panier, removeFromPanier, sendAll, retryItem, resetPanier } = usePrescriptionPanier();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const getStatusColor = (status: PanierItemStatus) => {
    switch (status) {
      case "draft": return "var(--txt3)";
      case "sending": return "#3b82f6";
      case "sent": return "#10b981";
      case "error": return "#ef4444";
    }
  };

  const getStatusIcon = (status: PanierItemStatus) => {
    switch (status) {
      case "draft": return "schedule";
      case "sending": return "hourglass_top";
      case "sent": return "check_circle";
      case "error": return "error";
    }
  };

  const getStatusLabel = (status: PanierItemStatus) => {
    switch (status) {
      case "draft": return "En attente";
      case "sending": return "Envoi...";
      case "sent": return "Envoyé ✓";
      case "error": return "Échec ✗";
    }
  };

  const handleSendAll = async () => {
    setIsSending(true);
    try {
      await sendAll(prescripteurId);
    } catch (error) {
      console.error("Erreur envoi groupé:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (localId: string) => {
    try {
      await retryItem(localId);
    } catch (error) {
      console.error("Erreur relance:", error);
    }
  };

  const draftCount = panier.items.filter((i) => i.status === "draft").length;
  const sentCount = panier.items.filter((i) => i.status === "sent").length;
  const errorCount = panier.items.filter((i) => i.status === "error").length;
  const sendingCount = panier.items.filter((i) => i.status === "sending").length;
  const totalCount = panier.items.length;

  // Summary text after sending
  const summaryText = sentCount > 0 || errorCount > 0
    ? `${sentCount} envoyée${sentCount > 1 ? "s" : ""}${errorCount > 0 ? `, ${errorCount} échec${errorCount > 1 ? "s" : ""}` : ""}`
    : "";

  return (
    <>
      {/* FAB (Floating Action Button) — always visible */}
      <button
        id="panier-fab"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: totalCount > 0
            ? (errorCount > 0 ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #1e3a5f, #2d5a8e)")
            : "linear-gradient(135deg, #6b7280, #9ca3af)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1100,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isOpen ? "rotate(45deg)" : "none",
        }}
      >
        <span className="ms" style={{ fontSize: 26 }}>
          {isOpen ? "close" : "shopping_basket"}
        </span>
        {/* Badge count */}
        {totalCount > 0 && !isOpen && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: errorCount > 0 ? "#ef4444" : "#3b82f6",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            {totalCount}
          </div>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1050,
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 380,
          maxWidth: "90vw",
          background: "#fff",
          borderLeft: "1px solid var(--bdr, #e5e7eb)",
          display: "flex",
          flexDirection: "column",
          zIndex: 1060,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen ? "-8px 0 30px rgba(0,0,0,0.12)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--bdr, #e5e7eb)",
            background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="ms" style={{ fontSize: 22 }}>shopping_basket</span>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Panier de prescriptions
                </h3>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  {totalCount === 0
                    ? "Aucune prescription"
                    : `${totalCount} prescription${totalCount > 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {totalCount > 0 && (
                <button
                  onClick={resetPanier}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 11,
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Vider
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 8px",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span className="ms" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {totalCount === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--txt3, #9ca3af)",
                fontSize: 13,
                padding: "48px 24px",
              }}
            >
              <span className="ms" style={{ fontSize: 48, display: "block", marginBottom: 12, opacity: 0.4 }}>
                shopping_basket
              </span>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Le panier est vide</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                Remplissez un formulaire et cliquez « Ajouter au panier »
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {panier.items.map((item) => {
                const isSent = item.status === "sent";
                const isError = item.status === "error";
                const isDraft = item.status === "draft";
                const color = getStatusColor(item.status);

                return (
                  <div
                    key={item.localId}
                    style={{
                      background: isSent ? "#f0fdf4" : isError ? "#fef2f2" : "#fff",
                      border: `1px solid ${isSent ? "#bbf7d0" : isError ? "#fecaca" : "var(--bdr, #e5e7eb)"}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      opacity: isSent ? 0.7 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {/* Type icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: `${color}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span className="ms" style={{ fontSize: 18, color }}>
                          {TYPE_ICONS[item.type] || "description"}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt, #1f2937)" }}>
                            {item.label}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 6,
                              background: `${color}20`,
                              color,
                            }}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--txt2, #6b7280)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.summary}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {isDraft && (
                          <button
                            onClick={() => removeFromPanier(item.localId)}
                            title="Retirer du panier"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              color: "#9ca3af",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                          >
                            <span className="ms" style={{ fontSize: 18 }}>close</span>
                          </button>
                        )}
                        {isError && (
                          <button
                            onClick={() => handleRetry(item.localId)}
                            style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 8,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#ef4444",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span className="ms" style={{ fontSize: 14 }}>refresh</span>
                            Réessayer
                          </button>
                        )}
                        {item.status === "sending" && (
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              border: "2px solid #3b82f620",
                              borderTop: "2px solid #3b82f6",
                              borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Error message */}
                    {item.error && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#ef4444",
                          marginTop: 8,
                          padding: "6px 10px",
                          background: "#fef2f2",
                          borderRadius: 6,
                          border: "1px solid #fecaca",
                        }}
                      >
                        <span className="ms" style={{ fontSize: 12, verticalAlign: "middle", marginRight: 4 }}>
                          warning
                        </span>
                        {item.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — summary and send button */}
        {totalCount > 0 && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--bdr, #e5e7eb)",
              background: "#f9fafb",
            }}
          >
            {/* Summary stats */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                fontSize: 11,
                marginBottom: 12,
              }}
            >
              {draftCount > 0 && (
                <span style={{ color: "#6b7280", fontWeight: 600 }}>
                  <span className="ms" style={{ fontSize: 12, verticalAlign: "middle", marginRight: 2 }}>schedule</span>
                  {draftCount} en attente
                </span>
              )}
              {sentCount > 0 && (
                <span style={{ color: "#10b981", fontWeight: 600 }}>
                  <span className="ms" style={{ fontSize: 12, verticalAlign: "middle", marginRight: 2 }}>check_circle</span>
                  {sentCount} envoyée{sentCount > 1 ? "s" : ""}
                </span>
              )}
              {errorCount > 0 && (
                <span style={{ color: "#ef4444", fontWeight: 600 }}>
                  <span className="ms" style={{ fontSize: 12, verticalAlign: "middle", marginRight: 2 }}>error</span>
                  {errorCount} échec{errorCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Summary text after send */}
            {summaryText && sentCount > 0 && errorCount === 0 && draftCount === 0 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "#10b981",
                  fontWeight: 600,
                  marginBottom: 12,
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  borderRadius: 8,
                  border: "1px solid #bbf7d0",
                }}
              >
                <span className="ms" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>
                  task_alt
                </span>
                Toutes les prescriptions ont été envoyées !
              </div>
            )}

            {/* Send button */}
            {(draftCount > 0 || errorCount > 0) && (
              <button
                id="panier-send-all"
                onClick={handleSendAll}
                disabled={isSending || sendingCount > 0}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSending || sendingCount > 0 ? "not-allowed" : "pointer",
                  background:
                    isSending || sendingCount > 0
                      ? "#d1d5db"
                      : "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 2px 8px rgba(30, 58, 95, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                {isSending || sendingCount > 0 ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid #fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <span className="ms" style={{ fontSize: 18 }}>send</span>
                    Envoyer toutes les prescriptions ({draftCount + errorCount})
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
