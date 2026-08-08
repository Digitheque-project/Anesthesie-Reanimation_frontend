"use client";
​
import type { Dispatch, SetStateAction } from "react";
import {
  User,
  Check,
  X,
  Clock,
  Search,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { ehr } from "@/lib/clinical/ehr-theme";
import type { TypeMetaEntry } from "./diagnostic-tab.styles";
import {
  modalOverlay,
  modalCard,
  modalHeader,
  modalTitle,
  modalSubtitle,
  modalCloseBtn,
  modalFilters,
  modalSearchWrap,
  modalSearchInput,
  modalDateRow,
  modalDateLabel,
  modalDateInput,
  modalResetBtn,
  modalList,
  modalRow,
  modalPager,
  modalPagerInfo,
  modalPagerBtn,
  labelStyle,
  confirmCard,
  confirmHeaderInner,
  confirmIconCircle,
  confirmBody,
  confirmSummaryRow,
  confirmValue,
  confirmQuestion,
  confirmErrorBox,
  confirmFooter,
  emptyAnterieur,
  anterieurMetaRow,
  anterieurDate,
  anterieurTitle,
  anterieurMedecin,
  ghostBtn,
  typeBadgeStyle,
  saveBtnStyle,
} from "./diagnostic-tab.styles";
import type { Diagnostic, DiagnosticType } from "./DiagnosticTab";
​
/* -------------------------------------------------------------------------
 * Type « suspicion » / « retenu » : couleurs sémantiques
 * ----------------------------------------------------------------------- */
​
export const typeMeta: Record<DiagnosticType, TypeMetaEntry> = {
  retenu: {
    label: "Diagnostic retenu",
    short: "Retenu",
    color: "#047857",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    Icon: CheckCircle2,
  },
  suspicion: {
    label: "Suspicion diagnostique",
    short: "Suspicion",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
    Icon: AlertTriangle,
  },
};
​
/* -------------------------------------------------------------------------
 * Badge de type
 * ----------------------------------------------------------------------- */
export function TypeBadge({
  type,
  large = false,
}: {
  type?: string;
  large?: boolean;
}) {
  const key: DiagnosticType =
    String(type).toLowerCase() === "suspicion" ? "suspicion" : "retenu";
  const m = typeMeta[key];
  const Icon = m.Icon;
  return (
    <span style={typeBadgeStyle(m, large)}>
      <Icon size={large ? 16 : 13} />
      {large ? m.label : m.short}
    </span>
  );
}
​
type ConfirmModalProps = {
  form: { type?: string; diagnosticPrincipal: string; cim10: string };
  saveError: string | null;
  isSaving: boolean;
  setShowConfirm: Dispatch<SetStateAction<boolean>>;
  confirmSave: () => void;
};
​
export function ConfirmModal({
  form,
  saveError,
  isSaving,
  setShowConfirm,
  confirmSave,
}: ConfirmModalProps) {
  return (
        <div
          style={modalOverlay}
          onClick={() => {
            if (!isSaving) setShowConfirm(false);
          }}
          role="presentation"
        >
          <div style={confirmCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div style={confirmHeaderInner}>
                <span style={confirmIconCircle}>
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <h3 style={modalTitle}>Confirmer l'enregistrement</h3>
                  <p style={modalSubtitle}>
                    Verifiez les informations avant de valider le diagnostic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={modalCloseBtn}
                aria-label="Fermer"
                disabled={isSaving}
              >
                <X size={18} />
              </button>
            </div>
​
            <div style={confirmBody}>
              <div style={confirmSummaryRow}>
                <span style={labelStyle}>Type de diagnostic</span>
                <TypeBadge type={form.type} large />
              </div>
              <div style={confirmSummaryRow}>
                <span style={labelStyle}>Diagnostic principal</span>
                <span style={confirmValue}>
                  {form.diagnosticPrincipal.trim() || "—"}
                </span>
              </div>
              {form.cim10.trim() ? (
                <div style={confirmSummaryRow}>
                  <span style={labelStyle}>Codage CIM-10</span>
                  <span style={confirmValue}>{form.cim10.trim()}</span>
                </div>
              ) : null}
              <p style={confirmQuestion}>
                Souhaitez-vous enregistrer ce diagnostic ? Cette action est
                definitive : aucune modification ulterieure n'est possible.
              </p>
              {saveError ? (
                <div style={confirmErrorBox} role="alert">
                  <AlertTriangle size={16} />
                  <span>{saveError}</span>
                </div>
              ) : null}
            </div>
​
            <div style={confirmFooter}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={ghostBtn}
                disabled={isSaving}
              >
                <X size={16} />
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={isSaving}
                style={saveBtnStyle(isSaving)}
              >
                {isSaving ? (
                  "Enregistrement..."
                ) : (
                  <>
                    <Check size={18} /> Confirmer et enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
  );
}
​
type SearchModalProps = {
  filteredModal: Diagnostic[];
  modalPageItems: Diagnostic[];
  modalTotalPages: number;
  modalCurrentPage: number;
  search: string;
  dateFrom: string;
  dateTo: string;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setSearch: Dispatch<SetStateAction<string>>;
  setDateFrom: Dispatch<SetStateAction<string>>;
  setDateTo: Dispatch<SetStateAction<string>>;
  setModalPage: Dispatch<SetStateAction<number>>;
  handleSelectDiagnostic: (d: Diagnostic) => void;
};
​
export function SearchModal({
  filteredModal,
  modalPageItems,
  modalTotalPages,
  modalCurrentPage,
  search,
  dateFrom,
  dateTo,
  setShowModal,
  setSearch,
  setDateFrom,
  setDateTo,
  setModalPage,
  handleSelectDiagnostic,
}: SearchModalProps) {
  return (
        <div
          style={modalOverlay}
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h3 style={modalTitle}>Tous les diagnostics antérieurs</h3>
                <p style={modalSubtitle}>
                  {filteredModal.length} diagnostic
                  {filteredModal.length > 1 ? "s" : ""} (non archivés)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={modalCloseBtn}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
​
            <div style={modalFilters}>
              <div style={modalSearchWrap}>
                <Search size={16} color={ehr.textMuted} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setModalPage(1);
                  }}
                  placeholder="Rechercher (médecin, diagnostic, code CIM-10...)"
                  style={modalSearchInput}
                />
              </div>
              <div style={modalDateRow}>
                <label style={modalDateLabel}>
                  Du
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setModalPage(1);
                    }}
                    style={modalDateInput}
                  />
                </label>
                <label style={modalDateLabel}>
                  Au
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setModalPage(1);
                    }}
                    style={modalDateInput}
                  />
                </label>
                {dateFrom || dateTo || search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDateFrom("");
                      setDateTo("");
                      setModalPage(1);
                    }}
                    style={modalResetBtn}
                  >
                    Réinitialiser
                  </button>
                ) : null}
              </div>
            </div>
​
            <div style={modalList}>
              {modalPageItems.length === 0 ? (
                <p style={emptyAnterieur}>Aucun diagnostic ne correspond.</p>
              ) : (
                modalPageItems.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDiagnostic(d)}
                    style={modalRow}
                  >
                    <div style={anterieurMetaRow}>
                      <span style={anterieurDate}>
                        <Clock size={12} />
                        {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <TypeBadge type={d.type} />
                    </div>
                    <p style={anterieurTitle}>{d.diagnosticPrincipal}</p>
                    {d.medecinResponsable ? (
                      <p style={anterieurMedecin}>
                        <User size={12} />
                        {d.medecinResponsable}
                      </p>
                    ) : null}
                  </button>
                ))
              )}
            </div>
​
            {modalTotalPages > 1 ? (
              <div style={modalPager}>
                <button
                  type="button"
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                  disabled={modalCurrentPage <= 1}
                  style={modalPagerBtn(modalCurrentPage <= 1)}
                >
                  Précédent
                </button>
                <span style={modalPagerInfo}>
                  Page {modalCurrentPage} / {modalTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setModalPage((p) => Math.min(modalTotalPages, p + 1))
                  }
                  disabled={modalCurrentPage >= modalTotalPages}
                  style={modalPagerBtn(modalCurrentPage >= modalTotalPages)}
                >
                  Suivant
                </button>
              </div>
            ) : null}
          </div>
        </div>
  );
}
