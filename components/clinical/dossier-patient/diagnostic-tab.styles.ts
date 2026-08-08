import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { ehr } from "@/lib/clinical/ehr-theme";

export type TypeMetaEntry = {
  label: string;
  short: string;
  color: string;
  bg: string;
  border: string;
  Icon: typeof Check;
};

export const FONT = "'Manrope', sans-serif";
export const FOG_GRADIENT =
  "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.97) 100%)";

export const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(12px, 4vw, 32px)",
};
​
export const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 640,
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#fff",
  borderRadius: 18,
  boxShadow: "0 24px 60px rgba(15,23,42,0.28)",
  overflow: "hidden",
  fontFamily: FONT,
};
​
export const modalHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  padding: "clamp(16px, 4vw, 22px)",
  borderBottom: `1px solid ${ehr.borderSoft}`,
};
​
export const modalTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(15px, 1vw + 13px, 17px)",
  fontWeight: 800,
  color: ehr.text,
};
​
export const modalSubtitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: ehr.textMuted,
};
​
export const modalCloseBtn: CSSProperties = {
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: `1px solid ${ehr.borderSoft}`,
  backgroundColor: "#fff",
  color: ehr.textMuted,
  cursor: "pointer",
};
​
export const modalFilters: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "clamp(14px, 3vw, 18px) clamp(16px, 4vw, 22px)",
  borderBottom: `1px solid ${ehr.borderSoft}`,
};
​
export const modalSearchWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 10,
  padding: "9px 12px",
  backgroundColor: "#fff",
};
​
export const modalSearchInput: CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  fontSize: 14,
  color: ehr.text,
  fontFamily: FONT,
  backgroundColor: "transparent",
};
​
export const modalDateRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: 12,
};
​
export const modalDateLabel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 700,
  color: ehr.textMuted,
};
​
export const modalDateInput: CSSProperties = {
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 13,
  color: ehr.text,
  fontFamily: FONT,
  outline: "none",
};
​
export const modalResetBtn: CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  border: "none",
  color: ehr.primary,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
};
​
export const modalList: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "clamp(14px, 3vw, 18px) clamp(16px, 4vw, 22px)",
};
​
export const modalRow: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 12,
  padding: "12px 14px",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontFamily: FONT,
};
​
export const modalPager: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: "12px 22px 16px",
  borderTop: `1px solid ${ehr.borderSoft}`,
};
​
export const modalPagerInfo: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: ehr.textMuted,
};
​
export const modalPagerBtn = (disabled: boolean): CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 9,
  border: `1px solid ${ehr.borderSoft}`,
  backgroundColor: disabled ? "#F1F5F9" : "#fff",
  color: disabled ? ehr.textMuted : ehr.primary,
  fontSize: 13,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: FONT,
});
​
/* -------------------------------------------------------------------------
 * Styles statiques (référencés via style={nom}, sans double accolade)
 * ----------------------------------------------------------------------- */
export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  color: ehr.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};
​
export const inputStyle: CSSProperties = {
  width: "100%",
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  color: ehr.text,
  outline: "none",
  fontFamily: FONT,
  boxSizing: "border-box",
  backgroundColor: "#fff",
  transition: "all 0.2s ease",
};
​
export const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 72,
  resize: "vertical",
  lineHeight: 1.55,
};
​
export const principalInputStyle: CSSProperties = {
  ...inputStyle,
  border: `2px solid ${ehr.primary}`,
  fontSize: 16,
  fontWeight: 600,
};
​
export const cardStyle: CSSProperties = {
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 16,
  backgroundColor: "#fff",
  boxShadow: ehr.shadowCard,
};
​
export const confirmCard: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  backgroundColor: "#fff",
  borderRadius: 18,
  boxShadow: "0 24px 60px rgba(15,23,42,0.28)",
  overflow: "hidden",
  fontFamily: FONT,
};
​
export const confirmHeaderInner: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
};
​
export const confirmIconCircle: CSSProperties = {
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: "50%",
  backgroundColor: "#FFFBEB",
  color: "#B45309",
};
​
export const confirmBody: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "clamp(16px, 4vw, 22px)",
};
​
export const confirmSummaryRow: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
​
export const confirmValue: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: ehr.text,
  lineHeight: 1.5,
};
​
export const confirmQuestion: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  color: ehr.textMuted,
  lineHeight: 1.6,
};
​
export const confirmErrorBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 10,
  backgroundColor: "#FEF2F2",
  border: "1px solid #FECACA",
  color: "#B91C1C",
  fontSize: 13,
  fontWeight: 600,
};
​
export const confirmFooter: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  padding: "clamp(14px, 3vw, 18px) clamp(16px, 4vw, 22px)",
  borderTop: `1px solid ${ehr.borderSoft}`,
};
​
export const rootBase: CSSProperties = {
  fontFamily: FONT,
  color: ehr.text,
};
​
// Mise en page basée sur la taille de l'écran (viewport) :
//  - < 768px (md) : une seule colonne, cartes empilées (comme l'image).
//  - >= 768px (md) : les deux cartes côte à côte (diagnostic à gauche,
//    « Diagnostics antérieurs » à droite, sticky).
export const RESPONSIVE_CSS = `
.ehr-diag-root {
  width: 100%;
  box-sizing: border-box;
}
.ehr-diag-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
}
.ehr-diag-main {
  width: 100%;
  min-width: 0;
}
.ehr-diag-sidebar {
  width: 100%;
  min-width: 0;
}
@media (min-width: 768px) {
  .ehr-diag-grid {
    flex-direction: row;
    align-items: flex-start;
  }
  .ehr-diag-main {
    flex: 1 1 0%;
    min-width: 0;
  }
  .ehr-diag-sidebar {
    width: 340px;
    flex-shrink: 0;
    position: sticky;
    top: 16px;
  }
}
`;
​
export const mainCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
};
​
export const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
​
export const titleH1: CSSProperties = {
  margin: 0,
  fontSize: "clamp(20px, 1.2vw + 16px, 24px)",
  fontWeight: 800,
  color: ehr.text,
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
};
​
export const subtitleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 4,
  fontSize: "clamp(12px, 1vw + 10px, 13px)",
  color: ehr.textMuted,
  fontWeight: 500,
};
​
export const bandeauRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "clamp(14px, 3vw, 18px) clamp(16px, 4vw, 24px)",
  borderBottom: `1px solid ${ehr.borderSoft}`,
  flexWrap: "wrap",
};
​
export const updateInfoBox: CSSProperties = { textAlign: "right" };
​
export const miniLabel: CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: ehr.textMuted,
};
​
export const miniValue: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 13,
  fontWeight: 700,
  color: ehr.text,
};
​
export const bodyStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "clamp(10px, 2vw, 14px)",
  padding: "clamp(14px, 3vw, 18px)",
};
​
export const principalDisplayBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "clamp(14px, 3vw, 16px) clamp(14px, 3vw, 18px)",
  borderRadius: 12,
  backgroundColor: ehr.highlightBlueTint,
  border: `1px solid ${ehr.highlightBorder}`,
};
​
export const principalDisplayText: CSSProperties = {
  margin: 0,
  fontSize: "clamp(15px, 1vw + 13px, 18px)",
  fontWeight: 700,
  color: ehr.text,
  lineHeight: 1.4,
};
​
export const readGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
  gap: "clamp(14px, 3vw, 20px)",
};
​
export const footerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "clamp(14px, 3vw, 16px) clamp(16px, 4vw, 24px)",
  borderTop: `1px solid ${ehr.borderSoft}`,
  flexWrap: "wrap",
};
​
export const medecinBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};
​
export const medecinIconCircle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  backgroundColor: ehr.highlightBlueTint,
  color: ehr.primary,
  flexShrink: 0,
};
​
export const medecinName: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 14,
  fontWeight: 700,
  color: ehr.text,
};
​
export const emptyCard: CSSProperties = {
  ...cardStyle,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 8,
  padding: "clamp(32px, 7vw, 48px) clamp(16px, 4vw, 24px)",
};
​
export const emptyIconCircle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 64,
  height: 64,
  borderRadius: "50%",
  backgroundColor: ehr.highlightBlueTint,
  color: ehr.primary,
  marginBottom: 8,
};
​
export const emptyTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(16px, 1vw + 14px, 18px)",
  fontWeight: 800,
  color: ehr.text,
};
​
export const emptyText: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "clamp(13px, 1vw + 11px, 14px)",
  color: ehr.textMuted,
  maxWidth: 360,
  lineHeight: 1.55,
};
​
export const formHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "clamp(14px, 3vw, 18px) clamp(16px, 4vw, 24px)",
  borderBottom: `1px solid ${ehr.borderSoft}`,
};
​
export const formTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(15px, 1vw + 13px, 17px)",
  fontWeight: 800,
  color: ehr.text,
};
​
export const twoColGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "clamp(10px, 2vw, 14px)",
};
​
export const typeRow: CSSProperties = { display: "flex", gap: 12 };
​
export const requiredStar: CSSProperties = { color: ehr.danger, fontWeight: 800 };
​
export const formMedecinBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: ehr.textMuted,
  fontSize: 13,
  fontWeight: 600,
};
​
export const actionsRow: CSSProperties = { display: "flex", gap: 12 };
​
export const sidebarHeader: CSSProperties = {
  padding: "clamp(14px, 3vw, 18px) clamp(16px, 4vw, 20px)",
  borderBottom: `1px solid ${ehr.borderSoft}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
​
export const sidebarTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(14px, 1vw + 12px, 15px)",
  fontWeight: 800,
  color: ehr.text,
};
​
export const countBadge: CSSProperties = {
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  backgroundColor: ehr.highlightBlueTint,
  color: ehr.primary,
  fontSize: 12,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
​
export const emptyAnterieur: CSSProperties = {
  margin: 0,
  padding: "28px 20px",
  textAlign: "center",
  fontSize: 13,
  color: ehr.textMuted,
};
​
export const listWrap: CSSProperties = { position: "relative" };
​
export const listInner: CSSProperties = { display: "flex", flexDirection: "column" };
​
export const fogOverlay: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 96,
  background: FOG_GRADIENT,
  pointerEvents: "none",
};
​
export const voirPlusBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  color: ehr.primary,
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: FONT,
};
​
export const anterieurClickable = (first: boolean): CSSProperties => ({
  ...anterieurItemStyle(first),
  cursor: "pointer",
});
​
export const anterieurMetaRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};
​
export const anterieurDate: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  color: ehr.textMuted,
};
​
export const anterieurTitle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(13px, 1vw + 11px, 14px)",
  fontWeight: 700,
  color: ehr.text,
  lineHeight: 1.45,
};
​
export const anterieurMedecin: CSSProperties = {
  margin: "6px 0 0",
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  color: ehr.textMuted,
};
​
export const primaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: ehr.primary,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
  transition: "all 0.15s ease",
};
​
export const ghostBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: "#fff",
  color: ehr.textMuted,
  border: `1px solid ${ehr.borderSoft}`,
  borderRadius: 10,
  padding: "11px 18px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
  transition: "all 0.15s ease",
};
​
/* -------------------------------------------------------------------------
 * Styles dynamiques (fonctions -> style={fn(...)}, jamais de double accolade)
 * ----------------------------------------------------------------------- */
export const typeBadgeStyle = (m: TypeMetaEntry, large: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: large ? "6px 14px" : "3px 10px",
  borderRadius: 999,
  backgroundColor: m.bg,
  color: m.color,
  border: `1px solid ${m.border}`,
  fontSize: large ? 13 : 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
});
​
export const typeSelectBtnStyle = (
  active: boolean,
  m: TypeMetaEntry,
): CSSProperties => ({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "13px 16px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: FONT,
  backgroundColor: active ? m.bg : "#fff",
  color: active ? m.color : ehr.textMuted,
  border: `2px solid ${active ? m.border : ehr.borderSoft}`,
  transition: "all 0.15s ease",
});
​
export const readValueStyle = (hasValue: boolean): CSSProperties => ({
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  color: hasValue ? ehr.text : ehr.textMuted,
  fontWeight: hasValue ? 500 : 400,
  fontStyle: hasValue ? "normal" : "italic",
});
​
export const anterieurItemStyle = (first: boolean): CSSProperties => ({
  padding: "clamp(12px, 3vw, 14px) clamp(14px, 4vw, 18px)",
  borderTop: first ? "none" : `1px solid ${ehr.borderSoft}`,
});
​
export const saveBtnStyle = (disabled: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: disabled ? ehr.primaryDisabled : ehr.primary,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
  fontFamily: FONT,
  transition: "all 0.15s ease",
});
​
export const listInnerStyle = (collapsed: boolean): CSSProperties => ({
  ...listInner,
  maxHeight: collapsed ? 300 : "none",
  overflow: "hidden",
});
​
export const voirPlusWrap = (collapsed: boolean): CSSProperties => ({
  padding: "12px 20px 16px",
  borderTop: collapsed ? "none" : `1px solid ${ehr.borderSoft}`,
  display: "flex",
  justifyContent: "center",
  position: "relative",
  zIndex: 1,
});
