"use client";

import { useState, useEffect } from "react";
import { Calendar, User, ChevronDown, Clock, Stethoscope } from "lucide-react";
import { dossierPatientApi as api } from "@/lib/clinical/dossier-patient-api";
import { ehr } from "@/lib/clinical/ehr-theme";
import {
  labelStyle,
  cardStyle,
  rootBase,
  RESPONSIVE_CSS,
  mainCol,
  headerRow,
  titleH1,
  subtitleRow,
  bandeauRow,
  updateInfoBox,
  miniLabel,
  miniValue,
  bodyStack,
  principalDisplayBox,
  principalDisplayText,
  readGrid,
  footerRow,
  medecinBox,
  medecinIconCircle,
  medecinName,
  emptyCard,
  emptyIconCircle,
  emptyTitle,
  emptyText,
  sidebarHeader,
  sidebarTitle,
  countBadge,
  emptyAnterieur,
  listWrap,
  fogOverlay,
  voirPlusBtn,
  anterieurClickable,
  anterieurMetaRow,
  anterieurDate,
  anterieurTitle,
  anterieurMedecin,
  readValueStyle,
  listInnerStyle,
  voirPlusWrap,
} from "./diagnostic-tab.styles";
import { TypeBadge, SearchModal } from "./DiagnosticModals";

export type DiagnosticType = "suspicion" | "retenu";

export interface Diagnostic {
  id: string;
  type?: string;
  icdCode?: string;
  icdLabel?: string;
  isPrimary?: boolean;
  diagnosticPrincipal: string;
  diagnosticSecondaire?: string;
  justification?: string;
  diagnosticDifferentielle?: string;
  ecarteCar?: string;
  severityScore?: string;
  etiologicalHypotheses?: string;
  medecinResponsable?: string;
  isActive?: boolean;
  isArchived?: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  patientId: string;
  medecinNom?: string;
  chuId?: string;
  serviceId?: string;
}

const MEDECIN_INCONNU = "Identité non résolue";

function isArchived(d: { isArchived?: boolean; archived?: boolean }): boolean {
  return d.isArchived === true || d.archived === true;
}

/* -------------------------------------------------------------------------
 * Champ en lecture seule
 * ----------------------------------------------------------------------- */
function ReadField({ label, value }: { label: string; value?: string }) {
  const hasValue = Boolean(value && value.trim());
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={readValueStyle(hasValue)}>
        {hasValue ? value : "Non renseigné"}
      </p>
    </div>
  );
}

// Le dossier patient est un dossier PARTAGÉ (propriété du service Dossier Patient) : le Bloc n'a
// que le droit de le consulter, jamais d'y écrire. Cet onglet est donc purement en lecture —
// le formulaire d'ajout/modification de diagnostic (mode "edit", bouton "Ajouter un diagnostic",
// modale de confirmation) a été retiré, pas seulement désactivé.
export function DiagnosticTab({
  patientId,
  medecinNom = "",
  chuId,
  serviceId,
}: Props) {
  const resolvedMedecinNom = medecinNom;
  const [current, setCurrent] = useState<Diagnostic | null>(null);
  const [anterieurs, setAnterieurs] = useState<Diagnostic[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [all, setAll] = useState<Diagnostic[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalPage, setModalPage] = useState(1);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, chuId, serviceId]);

  const load = async () => {
    if (!patientId || !chuId || !serviceId) {
      setCurrent(null);
      return;
    }
    try {
      const res = await api.get("/diagnostics", {
        params: { chuId, serviceId, patientId },
      });
      const raw: Diagnostic[] = res.data || [];
      const sorted = raw
        .filter((d) => !isArchived(d))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      setAll(sorted);
      const active =
        sorted.find((d) => d.isActive) ??
        sorted.find(
          (d) => d.isPrimary && String(d.type).toLowerCase() === "retenu",
        ) ??
        sorted.find((d) => d.isPrimary) ??
        sorted[0] ??
        null;
      setCurrent(active);
      setAnterieurs(active ? sorted.filter((d) => d.id !== active.id) : sorted);
      setShowAll(false);
    } catch {
      setCurrent(null);
      setAll([]);
      setAnterieurs([]);
    }
  };

  const handleSelectDiagnostic = (d: Diagnostic) => {
    setCurrent(d);
    setAnterieurs(all.filter((x) => x.id !== d.id));
    setShowModal(false);
    setShowAll(false);
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return (
      d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " à " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const formattedDate = formatDate(current?.updatedAt);
  const collapsed = anterieurs.length > 3;
  const visibleAnterieurs = anterieurs.slice(0, 3);

  // --- Modale : tous les diagnostics antérieurs (non archivés) ---
  const q = search.trim().toLowerCase();
  const fromT = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toT = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
  const filteredModal = all.filter((d) => {
    if (q) {
      const hay =
        `${d.diagnosticPrincipal || ""} ${d.medecinResponsable || ""} ${d.icdCode || ""} ${d.icdLabel || ""} ${d.justification || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const t = new Date(d.createdAt).getTime();
    if (fromT != null && !isNaN(t) && t < fromT) return false;
    if (toT != null && !isNaN(t) && t > toT) return false;
    return true;
  });
  const MODAL_PAGE_SIZE = 5;
  const modalTotalPages = Math.max(
    1,
    Math.ceil(filteredModal.length / MODAL_PAGE_SIZE),
  );
  const modalCurrentPage = Math.min(modalPage, modalTotalPages);
  const modalPageItems = filteredModal.slice(
    (modalCurrentPage - 1) * MODAL_PAGE_SIZE,
    modalCurrentPage * MODAL_PAGE_SIZE,
  );

  const renderAnterieur = (d: Diagnostic, first: boolean) => (
    <div
      key={d.id}
      onClick={() => handleSelectDiagnostic(d)}
      style={anterieurClickable(first)}
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
    </div>
  );

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>
      <div className="ehr-diag-root" style={rootBase}>
        <div className="ehr-diag-grid">
          {/* ====================== COLONNE PRINCIPALE ====================== */}
          <div className="ehr-diag-main" style={mainCol}>
            <div style={headerRow}>
              <div>
                <h1 style={titleH1}>Diagnostic</h1>
                <div style={subtitleRow}>
                  <Calendar size={14} />
                  <span>Diagnostic de l&apos;épisode actuel</span>
                </div>
              </div>
            </div>

            {/* -------------------- LECTURE : diagnostic actuel -------------------- */}
            {current ? (
              <div style={cardStyle}>
                <div style={bandeauRow}>
                  <TypeBadge type={current.type} large />
                  {formattedDate ? (
                    <div style={updateInfoBox}>
                      <p style={miniLabel}>Dernière mise à jour</p>
                      <p style={miniValue}>{formattedDate}</p>
                    </div>
                  ) : null}
                </div>

                <div style={bodyStack}>
                  <div>
                    <p style={labelStyle}>Diagnostic principal</p>
                    <div style={principalDisplayBox}>
                      <Stethoscope size={22} color={ehr.primary} />
                      <span style={principalDisplayText}>
                        {current.diagnosticPrincipal || "Non renseigné"}
                      </span>
                    </div>
                  </div>

                  <div style={readGrid}>
                    <ReadField
                      label="Codage CIM-10"
                      value={
                        current.icdCode
                          ? `${current.icdCode}${current.icdLabel ? ` — ${current.icdLabel}` : ""}`
                          : undefined
                      }
                    />
                    <ReadField
                      label="Argumentation"
                      value={current.justification}
                    />
                    <ReadField
                      label="Diagnostic différentiel"
                      value={current.diagnosticDifferentielle}
                    />
                    <ReadField label="Écarté car" value={current.ecarteCar} />
                    <ReadField
                      label="Score de sévérité (si applicable)"
                      value={current.severityScore}
                    />
                    <ReadField
                      label="Hypothèse étiologique / Bilan diagnostique à poursuivre"
                      value={current.etiologicalHypotheses}
                    />
                  </div>
                </div>

                <div style={footerRow}>
                  <div style={medecinBox}>
                    <div style={medecinIconCircle}>
                      <User size={20} />
                    </div>
                    <div>
                      <p style={miniLabel}>Médecin responsable</p>
                      <p style={medecinName}>
                        {current.medecinResponsable || resolvedMedecinNom || MEDECIN_INCONNU}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={emptyCard}>
                <div style={emptyIconCircle}>
                  <Stethoscope size={30} />
                </div>
                <h3 style={emptyTitle}>Aucun diagnostic actif</h3>
                <p style={emptyText}>
                  Aucun diagnostic n&apos;a encore été enregistré pour l&apos;épisode en
                  cours.
                </p>
              </div>
            )}
          </div>

          {/* ====================== SIDEBAR : ANTÉRIEURS (colonne de droite) ====================== */}
          <div className="ehr-diag-sidebar">
            <div style={cardStyle}>
              <div style={sidebarHeader}>
                <h3 style={sidebarTitle}>Diagnostics antérieurs</h3>
                {anterieurs.length > 0 ? (
                  <span style={countBadge}>{anterieurs.length}</span>
                ) : null}
              </div>

              {anterieurs.length === 0 ? (
                <p style={emptyAnterieur}>Aucun diagnostic antérieur</p>
              ) : (
                <>
                  <div style={listWrap}>
                    <div style={listInnerStyle(collapsed)}>
                      {visibleAnterieurs.map((d, i) =>
                        renderAnterieur(d, i === 0),
                      )}
                    </div>
                    {collapsed ? <div style={fogOverlay} /> : null}
                  </div>

                  {anterieurs.length > 3 ? (
                    <div style={voirPlusWrap(collapsed)}>
                      <button
                        type="button"
                        onClick={() => {
                          setModalPage(1);
                          setShowModal(true);
                        }}
                        style={voirPlusBtn}
                      >
                        Voir tous ({anterieurs.length}){" "}
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal ? (
        <SearchModal
          filteredModal={filteredModal}
          modalPageItems={modalPageItems}
          modalTotalPages={modalTotalPages}
          modalCurrentPage={modalCurrentPage}
          search={search}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setShowModal={setShowModal}
          setSearch={setSearch}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          setModalPage={setModalPage}
          handleSelectDiagnostic={handleSelectDiagnostic}
        />
      ) : null}
    </>
  );
}
