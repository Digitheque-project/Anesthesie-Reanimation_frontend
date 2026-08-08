"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  User,
  Check,
  Plus,
  Pencil,
  X,
  ChevronDown,
  Clock,
  Stethoscope,
} from "lucide-react";
import { dossierPatientApi as api } from "@/lib/clinical/dossier-patient-api";
import { ehr } from "@/lib/clinical/ehr-theme";
import { Cim10Autocomplete } from "./Cim10Autocomplete";
import { useCurrentMedecin } from "@/lib/clinical-auth/use-current-medecin";
import { usePermissions } from "@/lib/clinical-auth/use-permissions";
import { useSession } from "@/lib/clinical-auth/use-session";
import {
  labelStyle,
  textareaStyle,
  principalInputStyle,
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
  formHeader,
  formTitle,
  twoColGrid,
  typeRow,
  requiredStar,
  formMedecinBox,
  actionsRow,
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
  primaryBtn,
  ghostBtn,
  typeSelectBtnStyle,
  readValueStyle,
  saveBtnStyle,
  listInnerStyle,
  voirPlusWrap,
} from "./diagnostic-tab.styles";
import { typeMeta, TypeBadge, ConfirmModal, SearchModal } from "./DiagnosticModals";

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

const emptyForm = {
  type: "suspicion" as DiagnosticType,
  cim10: "",
  diagnosticPrincipal: "",
  diagnosticsSecondaires: "",
  justificationClinique: "",
  diagnosticsDifferentiels: "",
  ecarteCar: "",
  graviteStade: "",
  etiologicalHypotheses: "",
  // Volontairement vide : mieux vaut afficher "Identité non résolue" (voir resolvedMedecinNom)
  // qu'un nom plausible mais faux enregistré comme si c'était le vrai médecin responsable.
  medecinResponsable: "",
};

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

export function DiagnosticTab({
  patientId,
  medecinNom = "",
  chuId,
  serviceId,
}: Props) {
  // Identite du medecin courant, derivee du token JWT si le portail
  // ne renseigne pas d'objet `medecin` local (fallback sur medecinNom, jamais un nom inventé).
  const currentMedecin = useCurrentMedecin();
  const session = useSession();
  const { canDo } = usePermissions();
  const canCreateDiagnostic = canDo('diagnostic', 'create');
  const resolvedMedecinNom =
    [currentMedecin?.prenom, currentMedecin?.nom]
      .filter(Boolean)
      .join(" ")
      .trim() || medecinNom;
  const [current, setCurrent] = useState<Diagnostic | null>(null);
  const [anterieurs, setAnterieurs] = useState<Diagnostic[]>([]);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [all, setAll] = useState<Diagnostic[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...emptyForm,
    medecinResponsable: resolvedMedecinNom,
  });

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
      setMode("view");
      setShowAll(false);
    } catch {
      setCurrent(null);
      setAll([]);
      setAnterieurs([]);
      setMode("view");
    }
  };

  const handleAddNew = () => {
    setForm({ ...emptyForm, medecinResponsable: resolvedMedecinNom });
    setIsNew(true);
    setMode("edit");
  };

  const handleEdit = () => {
    if (!current) return;
    setForm({
      type: (String(current.type).toLowerCase() === "suspicion"
        ? "suspicion"
        : "retenu") as DiagnosticType,
      cim10: current.icdCode
        ? `${current.icdCode}${current.icdLabel ? ` — ${current.icdLabel}` : ""}`
        : "",
      diagnosticPrincipal: current.diagnosticPrincipal || "",
      diagnosticsSecondaires: current.diagnosticSecondaire || "",
      justificationClinique: current.justification || "",
      diagnosticsDifferentiels: current.diagnosticDifferentielle || "",
      ecarteCar: current.ecarteCar || "",
      graviteStade: current.severityScore || "",
      etiologicalHypotheses: current.etiologicalHypotheses || "",
      medecinResponsable: current.medecinResponsable || resolvedMedecinNom,
    });
    setIsNew(false);
    setMode("edit");
  };
  void handleEdit;

  const handleCancel = () => {
    setMode("view");
    load();
  };

  // Etape 1 : ouvre la modale de confirmation (aucune validation directe).
  const requestSave = () => {
    if (!form.diagnosticPrincipal.trim()) return;
    setSaveError(null);
    setShowConfirm(true);
  };

  // Etape 2 : enregistrement reel apres confirmation dans la modale.
  const confirmSave = async () => {
    if (!form.diagnosticPrincipal.trim()) return;
    if (!chuId || !serviceId) {
      setSaveError(
        "Impossible d'enregistrer : CHU ou service manquant. Rouvrez le dossier depuis la liste des patients.",
      );
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      // Sépare le champ CIM-10 « CODE — Libellé » en icdCode (≤20) + icdLabel (≤255).
      const rawCim = (form.cim10 || "").trim();
      const cimMatch = rawCim.match(
        /^([A-Za-z]\d{1,2}(?:\.\d{1,3})?)\s*[—–:-]?\s*(.*)$/,
      );
      const firstToken = rawCim.split(/\s+/)[0] || "";
      const icdCode = (cimMatch ? cimMatch[1] : firstToken)
        .toUpperCase()
        .slice(0, 20);
      const icdLabel = (
        cimMatch ? cimMatch[2] : rawCim.slice(firstToken.length)
      )
        .trim()
        .slice(0, 255);

      const payload = {
        chuId,
        serviceId,
        patientId,
        icdCode,
        icdLabel: icdLabel || undefined,
        type: form.type.toUpperCase(),
        isPrimary: true,
        diagnosticPrincipal: form.diagnosticPrincipal.trim() || undefined,
        diagnosticSecondaire: form.diagnosticsSecondaires || undefined,
        justification: form.justificationClinique || undefined,
        diagnosticDifferentielle: form.diagnosticsDifferentiels || undefined,
        ecarteCar: form.ecarteCar || undefined,
        severityScore: form.graviteStade || undefined,
        etiologicalHypotheses: form.etiologicalHypotheses || undefined,
        createdBy: session.userId || undefined,
      };
      // Le back ne propose pas de PUT : chaque enregistrement crée un diagnostic.
      await api.post("/diagnostics", payload);
      setShowConfirm(false);
      setMode("view");
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { message?: unknown } } };
      const raw = e?.response?.data?.message;
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : typeof raw === "string"
          ? raw
          : "Echec de l'enregistrement du diagnostic. Verifiez les champs et reessayez.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDiagnostic = (d: Diagnostic) => {
    setCurrent(d);
    setAnterieurs(all.filter((x) => x.id !== d.id));
    setMode("view");
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
            {/* En-tête + bouton Ajouter */}
            <div style={headerRow}>
              <div>
                <h1 style={titleH1}>Diagnostic</h1>
                <div style={subtitleRow}>
                  <Calendar size={14} />
                  <span>Diagnostic de l&apos;épisode actuel</span>
                </div>
              </div>

              {mode === "view" ? (
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={!canCreateDiagnostic}
                  title={!canCreateDiagnostic ? "Vous n'avez pas la permission de créer un diagnostic" : undefined}
                  style={{ ...primaryBtn, opacity: canCreateDiagnostic ? 1 : 0.5, cursor: canCreateDiagnostic ? 'pointer' : 'not-allowed' }}
                >
                  <Plus size={18} />
                  Ajouter un diagnostic
                </button>
              ) : null}
            </div>

            {/* -------------------- LECTURE : diagnostic actuel -------------------- */}
            {mode === "view" && current ? (
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
            ) : null}

            {/* -------------------- LECTURE : aucun diagnostic -------------------- */}
            {mode === "view" && !current ? (
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
            ) : null}

            {/* -------------------- FORMULAIRE -------------------- */}
            {mode === "edit" ? (
              <div style={cardStyle}>
                <div style={formHeader}>
                  <Pencil size={18} color={ehr.primary} />
                  <h3 style={formTitle}>
                    {isNew ? "Nouveau diagnostic" : "Modifier le diagnostic"}
                  </h3>
                </div>

                <div style={bodyStack}>
                  {/* Choix du type */}
                  <div>
                    <label style={labelStyle}>
                      Type de diagnostic <span style={requiredStar}>*</span>
                    </label>
                    <div style={typeRow}>
                      {(["suspicion", "retenu"] as DiagnosticType[]).map(
                        (t) => {
                          const m = typeMeta[t];
                          const active = form.type === t;
                          const Icon = m.Icon;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setForm({ ...form, type: t })}
                              style={typeSelectBtnStyle(active, m)}
                            >
                              <Icon size={18} />
                              {m.short}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Diagnostic principal */}
                  <div>
                    <label style={labelStyle}>
                      Diagnostic principal <span style={requiredStar}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex : Cholécystite aiguë lithiasique"
                      value={form.diagnosticPrincipal}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          diagnosticPrincipal: e.target.value,
                        })
                      }
                      style={principalInputStyle}
                    />
                  </div>

                  <div style={twoColGrid}>
                    <div>
                      <label style={labelStyle}>Argumentation</label>
                      <textarea
                        placeholder="Arguments cliniques, résultats biologiques, imagerie..."
                        value={form.justificationClinique}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            justificationClinique: e.target.value,
                          })
                        }
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Diagnostic différentiel</label>
                      <textarea
                        placeholder="Autres hypothèses envisagées..."
                        value={form.diagnosticsDifferentiels}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            diagnosticsDifferentiels: e.target.value,
                          })
                        }
                        style={textareaStyle}
                      />
                    </div>
                  </div>

                  <div style={twoColGrid}>
                    <div>
                      <label style={labelStyle}>Écarté car</label>
                      <textarea
                        placeholder="Raisons d'exclusion des diagnostics écartés..."
                        value={form.ecarteCar}
                        onChange={(e) =>
                          setForm({ ...form, ecarteCar: e.target.value })
                        }
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Codage CIM-10</label>
                      <Cim10Autocomplete
                        value={form.cim10}
                        onChange={(next) => setForm({ ...form, cim10: next })}
                        placeholder="Rechercher par code ou libellé (ex : J21.0)"
                      />
                    </div>
                  </div>

                  <div style={twoColGrid}>
                    <div>
                      <label style={labelStyle}>
                        Score de sévérité (si applicable)
                      </label>
                      <textarea
                        placeholder="Ex : Stade III, Grade B, score de gravité..."
                        value={form.graviteStade}
                        onChange={(e) =>
                          setForm({ ...form, graviteStade: e.target.value })
                        }
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Hypothèse étiologique / Bilan diagnostique à poursuivre
                      </label>
                      <textarea
                        placeholder="Étiologies suspectées, examens complémentaires à prévoir..."
                        value={form.etiologicalHypotheses}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            etiologicalHypotheses: e.target.value,
                          })
                        }
                        style={textareaStyle}
                      />
                    </div>
                  </div>
                </div>

                <div style={footerRow}>
                  <div style={formMedecinBox}>
                    <User size={16} />
                    <span>{form.medecinResponsable || resolvedMedecinNom || MEDECIN_INCONNU}</span>
                  </div>
                  <div style={actionsRow}>
                    <button
                      type="button"
                      onClick={handleCancel}
                      style={ghostBtn}
                    >
                      <X size={16} />
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={requestSave}
                      disabled={isSaving || !form.diagnosticPrincipal.trim() || !canCreateDiagnostic}
                      title={!canCreateDiagnostic ? "Vous n'avez pas la permission de créer un diagnostic" : undefined}
                      style={saveBtnStyle(
                        isSaving || !form.diagnosticPrincipal.trim() || !canCreateDiagnostic,
                      )}
                    >
                      {isSaving ? (
                        "Enregistrement..."
                      ) : (
                        <>
                          <Check size={18} /> Valider le diagnostic
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
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

      {showConfirm ? (
        <ConfirmModal
          form={form}
          saveError={saveError}
          isSaving={isSaving}
          setShowConfirm={setShowConfirm}
          confirmSave={confirmSave}
        />
      ) : null}

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
