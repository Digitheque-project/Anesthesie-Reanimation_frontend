"use client";
import { useState, useEffect, useRef, startTransition } from "react";

import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from "../ValidationPopup";
import DrawerPanel from "../DrawerPanel";
import { scrollPrescriptionContentToTop } from "@/features/prescription/lib/scrollUtils";
import {
  useDraftPersistence,
  loadDraft,
} from "@/features/prescription/hooks/useDraftPersistence";
import { useKeyboardNavigation } from "@/features/prescription/hooks/useKeyboardNavigation";
import { calcAge } from "../medicale/utils";
import { Urgence, urgenceClasses } from "../types";
import { Icone } from '@/components/ui/Icone';

type ImgType = "scan" | "echo" | "rx" | "geste" | "rxsp";

interface Props {
  patientType?: "hospitalise" | "consultation_externe" | "accueil";
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
    chuId?: string;
    serviceId?: string;
  };
}

interface Examen {
  id: string;
  typeExamen: ImgType;
  renseignementsCliniques?: string;
  questionRadio?: string;
  // Scanner fields
  scanType?: string;
  scanPrecisions?: string;
  scanGlasgow?: string;
  scanAgite?: string;
  scanAllergie?: string;
  scanAllergieDetail?: string;
  scanCreatinine?: string;
  scanClearance?: string;
  scanDiabete?: string;
  // Échographie fields
  echoType?: string;
  echoDoppler?: boolean;
  echoPrecisions?: string;
  // Radiographie fields
  rxType?: string;
  rxIncidences?: string[];
  rxPrecisions?: string;
  // Geste fields
  gesteType?: string;
  gestePrecisions?: string;
  // Radio spéciale fields
  rxspType?: string;
  rxspPrep?: string;
  rxspPrecisions?: string;
}

interface ImagerieDraftData {
  urgence: string;
  alertes: string;
  imgType: ImgType;
  remarques: string;
  examens: Examen[];
  formData: Record<string, any>;
  moyenDeplacement: string;
}

export default function ImagerieForm({ patient, prescripteur }: Props) {
  const isAccueil =
    prescripteur?.service?.toLowerCase().includes("accueil") ?? false;
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [alertes, setAlertes] = useState("");
  const [moyenDeplacement, setMoyenDeplacement] = useState("");
  const [imgType, setImgType] = useState<ImgType>("scan");
  const [remarques, setRemarques] = useState("");
  const [chuId, setChuId] = useState(prescripteur.chuId || "");
  const [serviceId, setServiceId] = useState(prescripteur.serviceId || "");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [nomMedecin, setNomMedecin] = useState("");
  const [numeroONM, setNumeroONM] = useState("");
  const [examens, setExamens] = useState<Examen[]>([]);
  const [editingExamenId, setEditingExamenId] = useState<string | null>(null);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [showImagerieDrawer, setShowImagerieDrawer] = useState(false);
  const prevPatientIdRef = useRef<string | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel =
    patient?.sexe === "M"
      ? "Masculin"
      : patient?.sexe === "F"
        ? "Féminin"
        : patient?.sexe;

  // Current form state - simplified to use single state object
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { clearDraft } = useDraftPersistence<ImagerieDraftData>(
    `draft:imagerie:${patient.id}`,
    {
      urgence,
      alertes,
      imgType,
      remarques,
      examens,
      formData,
      moyenDeplacement,
    },
    { skip: !patient.id },
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:imagerie:${patient.id}`;
      const draftData = loadDraft<ImagerieDraftData>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const e = JSON.parse(raw);
            if (e?.savedAt) savedAt = new Date(e.savedAt);
          }
        } catch {}
        startTransition(() => {
          setDraftRestored(false);
          setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== "NORMAL")
            setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.imgType) setImgType(draftData.imgType);
          if (draftData.remarques) setRemarques(draftData.remarques);
          if (draftData.examens?.length > 0) setExamens(draftData.examens);
          if (draftData.formData && Object.keys(draftData.formData).length > 0)
            setFormData(draftData.formData);
          if (draftData.moyenDeplacement)
            setMoyenDeplacement(draftData.moyenDeplacement);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => {
          setDraftRestored(false);
          setDraftSavedAt(null);
        });
      }
    }
  }, [patient.id, setPatientId]);

  // Helper to get/set form data
  const getFormValue = (key: string) => formData[key] || "";
  const setFormValue = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  function addExamen() {
    const newExamen: Examen = {
      id: Date.now().toString(),
      typeExamen: imgType,
      ...formData,
    };
    setExamens([...examens, newExamen]);
    setFormData({}); // Clear form
    setShowImagerieDrawer(false);
    showToast("Examen ajouté");
  }

  function removeExamen(id: string) {
    setExamens(examens.filter((e) => e.id !== id));
  }

  function editExamen(id: string) {
    const examen = examens.find((e) => e.id === id);
    if (examen) {
      setFormData(examen as Record<string, any>);
      setImgType(examen.typeExamen);
      setEditingExamenId(id);
      setShowImagerieDrawer(true);
    }
  }

  function updateExamen() {
    if (editingExamenId) {
      setExamens(
        examens.map((e) =>
          e.id === editingExamenId
            ? { ...e, ...formData, typeExamen: imgType }
            : e,
        ),
      );
      setEditingExamenId(null);
      setFormData({});
      setShowImagerieDrawer(false);
      showToast("Examen mis à jour");
    }
  }

  function toggleIncidence(val: string) {
    const current = getFormValue("rxIncidences") || [];
    const updated = current.includes(val)
      ? current.filter((v: string) => v !== val)
      : [...current, val];
    setFormValue("rxIncidences", updated);
  }

  const isPatientInstable =
    imgType === "scan" &&
    getFormValue("scanGlasgow") === "Oui — stabiliser avant d��placement";

  const isFormValid = (() => {
    if (!getFormValue("renseignementsCliniques")?.trim()) return false;
    if (isPatientInstable) return false;
    if (imgType === "scan")
      return (
        !!getFormValue("scanType") &&
        !!getFormValue("scanGlasgow") &&
        !!getFormValue("scanAgite") &&
        !!getFormValue("scanAllergie")
      );
    if (imgType === "echo") return !!getFormValue("echoType");
    if (imgType === "rx")
      return (
        !!getFormValue("rxType") &&
        (getFormValue("rxIncidences") || []).length > 0
      );
    if (imgType === "geste") return !!getFormValue("gesteType")?.trim();
    if (imgType === "rxsp") return !!getFormValue("rxspType");
    return false;
  })();

  const canSubmit = examens.length > 0;

  function showToast(msg: string) {
    setToast(msg);
    scrollPrescriptionContentToTop();
    setTimeout(() => setToast(""), 2800);
  }

  function buildImagerieSummary(): string {
    const now = new Date().toLocaleString("fr-FR");
    const labels: Record<ImgType, string> = {
      scan: "Scanner",
      echo: "Échographie",
      rx: "Radiographie",
      geste: "Geste interventionnel",
      rxsp: "Radio spéciale",
    };
    let html = `<div class="card"><div class="patient">Date : ${now}</div>`;
    examens.forEach((examen, idx) => {
      const renso = examen.renseignementsCliniques || "";
      const qr = examen.questionRadio || "";
      const typeName =
        (examen as any).scanType ||
        (examen as any).echoType ||
        (examen as any).rxType ||
        (examen as any).gesteType ||
        (examen as any).rxspType ||
        "";
      html += `<div class="medicament"><span class="nom">Examen ${idx + 1} (${labels[examen.typeExamen]}):</span> <span class="detail">${typeName}</span></div>`;
      if (renso)
        html += `<div class="medicament"><span class="nom">  Renseignements :</span> <span class="detail">${renso}</span></div>`;
      if (qr)
        html += `<div class="medicament"><span class="nom">  Question :</span> <span class="detail">${qr}</span></div>`;
    });
    if (remarques) html += `<div class="notice">📌 ${remarques}</div>`;
    if (alertes) html += `<div class="notice">⚠️ ${alertes}</div>`;
    html += `</div>`;
    return html;
  }

  function buildExamenPayload(examen: Examen): Record<string, unknown> {
    const base: Record<string, unknown> = { typeExamen: examen.typeExamen };
    Object.keys(examen).forEach((key) => {
      if (key !== "id" && key !== "typeExamen" && examen[key as keyof Examen]) {
        base[key] = examen[key as keyof Examen];
      }
    });
    return base;
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError("");

    const payload = {
      patientId: patient.id,
      prescripteurId: prescripteur.id,
      urgence,
      alertes,
      notes: remarques,
      chuId,
      serviceId,
      moyenDeplacement,
      examens: examens.map(buildExamenPayload),
      nomMedecinPrescripteur: nomMedecin,
      numeroONM: numeroONM,
      patientNom: patient.nom,
      patientPrenom: patient.prenom,
      prescripteurNom: prescripteur.nom,
      prescripteurPrenom: prescripteur.prenom,
      prescripteurService: prescripteur.service,
    };

    try {
      const summary = `${examens.length} examen(s) d'imagerie`;
      addToPanier("imagerie", summary, payload);
      clearDraft();

      setShowValidationPopup(true);
      // reset
      setAlertes("");
      setRemarques("");
      setUrgence("NORMAL");
      setImgType("scan");
      setExamens([]);
      setFormData({});
      setMoyenDeplacement("");
    } catch (err: any) {
      setApiError("Erreur lors de l'ajout au panier.");
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    // Onglets actifs en VERT (couleur d'action de l'ergonomie clinique),
    // et non en navy. Texte vert fonce pour garder un contraste AA sur
    // le vert clair, comme les sous-onglets paracliniques (.psx-subtab).
    background: active ? "var(--green, #2ECC71)" : "var(--inp)",
    color: active ? "#103d29" : "var(--txt2)",
    transition: "all .15s",
    flexShrink: 0,
  });

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && (
        <div
          style={{
            background: "var(--red-lt)",
            border: "1px solid var(--red-bdr)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--red)",
            marginBottom: 12,
          }}
        >
          {apiError}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          {/* Moyen de déplacement */}
          <div className="card mb12" style={{ padding: 12 }}>
            <label className="lbl">Moyen de déplacement</label>
            <div className="g3">
              {[
                { icon: "directions_walk", label: "Autonome", value: "marche" },
                {
                  icon: "local_hospital",
                  label: "Ambulance",
                  value: "ambulance",
                },
                { icon: "bed", label: "Brancard", value: "brancard" },
                {
                  icon: "airline_seat_recline_extra",
                  label: "Fauteuil",
                  value: "fauteuil",
                },
              ].map(({ icon, label, value }) => (
                <label key={value} className="rc" style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="imag-trans"
                    checked={moyenDeplacement === value}
                    onChange={() => setMoyenDeplacement(value)}
                    style={{ accentColor: "var(--navy)" }}
                  />
                  <Icone nom={icon} style={{ fontSize: 18, color: moyenDeplacement === value ? "var(--navy)" : "var(--txt3)", }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bouton déclencheur pour ajouter un examen */}
          <div className="card mb12" style={{ padding: 12 }}>
            <button
              onClick={() => {
                setEditingExamenId(null);
                setFormData({});
                setShowImagerieDrawer(true);
              }}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                border: "2px dashed var(--navy-mid)",
                background: examens.length > 0 ? "var(--blue-ps-lt)" : "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "all 0.15s",
              }}
            >
              <Icone nom="radiology" style={{ fontSize: 22, color: "var(--navy)" }} />
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--navy)",
                  }}
                >
                  Ajouter un examen d'imagerie
                </div>
                <div style={{ fontSize: 11, color: "var(--txt3)" }}>
                  {examens.length > 0
                    ? `${examens.length} examen${examens.length > 1 ? "s" : ""} ajouté${examens.length > 1 ? "s" : ""} — cliquer pour en ajouter un autre`
                    : "Cliquez pour ouvrir le formulaire d'ajout"}
                </div>
              </div>
              <Icone nom={examens.length > 0 ? "add_circle" : "add_circle"} style={{ fontSize: 18, color: "var(--navy)", marginLeft: "auto", }} />
            </button>
          </div>

          {/* Examens ajoutés list */}
          {examens.length > 0 && (
            <div
              className="card mb12"
              style={{
                padding: 12,
                background: "var(--navy-lt)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>
                Examens ajoutés ({examens.length})
              </div>
              {examens.map((examen) => {
                const labels: Record<ImgType, string> = {
                  scan: "Scanner",
                  echo: "Échographie",
                  rx: "Radiographie",
                  geste: "Geste interventionnel",
                  rxsp: "Radio spéciale",
                };
                const typeLabel = labels[examen.typeExamen];
                const detail =
                  examen.scanType ||
                  examen.echoType ||
                  examen.rxType ||
                  examen.gesteType ||
                  examen.rxspType ||
                  "";
                return (
                  <div
                    key={examen.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 8,
                      background: "var(--card)",
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 12 }}>
                      <strong>{typeLabel}:</strong> {detail}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="bedit"
                        onClick={() => editExamen(examen.id)}
                      >
                        <Icone nom="edit" />
                      </button>
                      <button
                        className="bdel"
                        onClick={() => removeExamen(examen.id)}
                      >
                        <Icone nom="delete" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLONNE DROITE — sticky */}
        <div
          className="psx-side"
          style={{
            position: "sticky",
            top: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">
              Degré d'urgence <span className="req">*</span>
            </label>
            <div
              className={`urgr ${urgenceClasses[urgence]}`}
              style={{ marginBottom: 8 }}
            >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Icone nom="warning" style={{ fontSize: 16, color: "var(--red)" }} />
              <span className="lbl" style={{ margin: 0 }}>
                Précautions &amp; Alertes
              </span>
            </div>
            <textarea
              rows={1}
              value={alertes}
              onChange={(e) => setAlertes(e.target.value)}
              placeholder="Allergie produit de contraste, claustrophobie, pace-maker, grossesse..."
              style={{
                background: "var(--red-lt)",
                border: "1.5px solid var(--red-bdr)",
                padding: "8px 12px",
              }}
            />
          </div>

          {isAccueil && (
            <>
              <div className="mb12">
                <label className="lbl">Nom du médecin prescripteur *</label>
                <input
                  type="text"
                  value={nomMedecin}
                  onChange={(e) => setNomMedecin(e.target.value)}
                  placeholder="Dr ..."
                />
              </div>
              <div className="mb12">
                <label className="lbl">N° ONM *</label>
                <input
                  type="text"
                  value={numeroONM}
                  onChange={(e) => setNumeroONM(e.target.value)}
                  placeholder="ONM-..."
                />
              </div>
            </>
          )}
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Remarques complémentaires</label>
            <textarea
              rows={2}
              value={remarques}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Informations utiles pour le radiologue..."
            />
          </div>
          <button
            className="bp"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            style={{ opacity: canSubmit && !loading ? 1 : 0.5, marginTop: 0 }}
          >
            <Icone nom="check_circle" />
            {loading ? "Envoi..." : "Valider"}
          </button>
        </div>
      </div>

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => {
          scrollPrescriptionContentToTop();
        }}
        onSendAll={async () => {
          setIsSending(true);
          try {
            const result = await sendAll(patient.id);
            if (result?.allSent)
              showToast("Prescriptions envoyées avec succès");
            else if (result?.errorCount) setApiError("Erreur lors de l'envoi");
          } catch {
            setApiError("Erreur lors de l'envoi");
          } finally {
            setIsSending(false);
          }
        }}
        isSending={isSending}
      />

      {/* DrawerPanel pour le formulaire d'ajout d'examen */}
      <DrawerPanel
        isOpen={showImagerieDrawer}
        onClose={() => setShowImagerieDrawer(false)}
        title={
          editingExamenId ? "Modifier l'examen" : "Ajouter un examen d'imagerie"
        }
        subtitle={
          editingExamenId
            ? undefined
            : `${examens.length} examen${examens.length > 1 ? "s" : ""} déjà ajouté${examens.length > 1 ? "s" : ""}`
        }
        icon="radiology"
        wide
        footer={
          <button
            onClick={editingExamenId ? updateExamen : addExamen}
            disabled={!isFormValid}
            style={{
              width: "100%",
              background: isFormValid ? "var(--navy)" : "var(--bdr)",
              color: isFormValid ? "#fff" : "var(--txt2)",
              border: "none",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: isFormValid ? "pointer" : "not-allowed",
            }}
          >
            {editingExamenId ? "Mettre à jour l'examen" : "Ajouter l'examen"}
          </button>
        }
      >
        {/* Type d'examen selection */}
        <div style={{ marginBottom: 16 }}>
          <label className="lbl">
            Type d'examen <span className="req">*</span>
          </label>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}
          >
            {(["scan", "echo", "rx", "geste", "rxsp"] as ImgType[]).map(
              (key) => {
                const icons: Record<ImgType, string> = {
                  scan: "document_scanner",
                  echo: "radar",
                  rx: "radiology",
                  geste: "colorize",
                  rxsp: "biotech",
                };
                const labels: Record<ImgType, string> = {
                  scan: "Scanner",
                  echo: "Échographie",
                  rx: "Radiographie",
                  geste: "Geste interventionnel",
                  rxsp: "Radio spéciale",
                };
                return (
                  <button
                    key={key}
                    onClick={() => setImgType(key)}
                    style={tabStyle(imgType === key)}
                  >
                    <Icone nom={icons[key]} style={{ fontSize: 16 }} />
                    {labels[key]}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 20px",
          }}
        >
          {/* ── Colonne gauche : type d'examen ── */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--navy)",
                marginBottom: 10,
                borderLeft: "3px solid var(--navy)",
                paddingLeft: 8,
              }}
            >
              Paramètres de l'examen
            </div>

            {/* === SCANNER === */}
            {imgType === "scan" && (
              <div>
                <label className="lbl">
                  Type de scanner <span className="req">*</span>
                </label>
                <select
                  className="mb12"
                  value={getFormValue("scanType")}
                  onChange={(e) => setFormValue("scanType", e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {[
                    "Scanner Cérébrale",
                    "Scanner Rachis cervical",
                    "Scanner Rachis dorsal / thoracique",
                    "Scanner Rachis lombaire",
                    "Scanner Thoracique (poumon)",
                    "Scanner Abdominal",
                    "Scanner Pelvien",
                    "Scanner Abdomino-pelvien",
                    "Scanner Parties molles",
                    "Scanner Coude",
                    "Scanner Bassin",
                    "Scanner Rachis cervico-thoraco-lombo-sacré",
                    "Scanner Rachis cervico-thoracique",
                    "Scanner Rachis dorso-lombaire",
                    "Scanner Genou",
                    "Scanner Épaule",
                    "Scanner PERS",
                    "Scanner urgence weekend",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <label className="lbl">Précisions / Zone à explorer</label>
                <textarea
                  rows={2}
                  className="mb12"
                  value={getFormValue("scanPrecisions")}
                  onChange={(e) =>
                    setFormValue("scanPrecisions", e.target.value)
                  }
                  placeholder="Précisions supplémentaires..."
                />
              </div>
            )}

            {/* === ÉCHOGRAPHIE === */}
            {imgType === "echo" && (
              <div>
                <label className="lbl">
                  Type d'échographie <span className="req">*</span>
                </label>
                <select
                  className="mb12"
                  value={getFormValue("echoType")}
                  onChange={(e) => setFormValue("echoType", e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {[
                    "Échographie Obstétricale",
                    "Échographie Transfontanellaire",
                    "Échographie Cytoponction écho-guidée",
                    "Échographie Musculo-squelettique",
                    "Échographie Testiculaire",
                    "Échographie Mammaire",
                    "Échographie Parties molles",
                    "Échographie Abdominale",
                    "Échographie Pelvienne",
                    "Échographie Abdomino-pelvienne",
                    "Échographie Morphologique fœtale / Score de Manning",
                    "Échographie Thyroïdienne",
                    "Échographie Prostatique / Testiculaire",
                    "Échographie Épaule / Ostéo-articulaire",
                    "Échographie Trans-thoracique pleural",
                    "Échographie Trans-thoracique avec repérage",
                    "Échographie Thyroïdienne avec cytoponction",
                    "Échographie Des cuisses",
                    "Échographie Cervicale",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 10,
                    padding: 10,
                    background: "var(--inp)",
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={getFormValue("echoDoppler") || false}
                    onChange={(e) =>
                      setFormValue("echoDoppler", e.target.checked)
                    }
                    style={{
                      accentColor: "var(--navy)",
                      width: 16,
                      height: 16,
                    }}
                  />
                  Écho-Doppler associé
                </label>
                <label className="lbl">Précisions</label>
                <textarea
                  rows={2}
                  value={getFormValue("echoPrecisions")}
                  onChange={(e) =>
                    setFormValue("echoPrecisions", e.target.value)
                  }
                  placeholder="Précisions supplémentaires..."
                />
              </div>
            )}

            {/* === RADIOGRAPHIE === */}
            {imgType === "rx" && (
              <div>
                <label className="lbl">
                  Type de radiographie <span className="req">*</span>
                </label>
                <select
                  className="mb12"
                  value={getFormValue("rxType")}
                  onChange={(e) => setFormValue("rxType", e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {[
                    "Radiographie Crâne",
                    "Radiographie Panoramique dentaire",
                    "Radiographie Thorax",
                    "Radiographie Rachis cervical",
                    "Radiographie Rachis dorsal",
                    "Radiographie Rachis lombaire",
                    "Radiographie Épaule",
                    "Radiographie Bras",
                    "Radiographie Coude",
                    "Radiographie Avant-bras",
                    "Radiographie Poignet",
                    "Radiographie Main",
                    "Radiographie Abdomen sans préparation (ASP)",
                    "Radiographie Bassin",
                    "Radiographie Hanche",
                    "Radiographie Fémur",
                    "Radiographie Genou",
                    "Radiographie Jambe",
                    "Radiographie Cheville",
                    "Radiographie Pied",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <label className="lbl">
                  Incidences <span className="req">*</span>
                </label>
                <div className="g3 mb12">
                  {["FACE", "PROFIL", "OBLIQUE", "AUTRE"].map((inc) => (
                    <label key={inc} className="rc">
                      <input
                        type="checkbox"
                        checked={(getFormValue("rxIncidences") || []).includes(
                          inc,
                        )}
                        onChange={() => toggleIncidence(inc)}
                        style={{ accentColor: "var(--navy)" }}
                      />
                      <span>{inc}</span>
                    </label>
                  ))}
                </div>
                {(getFormValue("rxIncidences") || []).includes("AUTRE") && (
                  <div className="mb12">
                    <input
                      type="text"
                      value={getFormValue("rxIncidencesAutre")}
                      onChange={(e) =>
                        setFormValue("rxIncidencesAutre", e.target.value)
                      }
                      placeholder="Préciser l'incidence..."
                    />
                  </div>
                )}
                <label className="lbl">Côté / Précisions complémentaires</label>
                <textarea
                  rows={2}
                  value={getFormValue("rxPrecisions")}
                  onChange={(e) => setFormValue("rxPrecisions", e.target.value)}
                  placeholder="Côté droit/gauche, comparatif bilatéral, incidences particulières..."
                />
              </div>
            )}

            {/* === GESTE INTERVENTIONNEL === */}
            {imgType === "geste" && (
              <div>
                <label className="lbl">
                  Type de geste <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="mb12"
                  value={getFormValue("gesteType")}
                  onChange={(e) => setFormValue("gesteType", e.target.value)}
                  placeholder="Ex : ponction d'ascite, biopsie hépatique écho-guidée..."
                />
                <label className="lbl">Précisions complémentaires</label>
                <textarea
                  rows={3}
                  value={getFormValue("gestePrecisions")}
                  onChange={(e) =>
                    setFormValue("gestePrecisions", e.target.value)
                  }
                  placeholder="Site, côté, technique souhaitée, précautions particulières..."
                />
              </div>
            )}

            {/* === RADIO SPÉCIALE === */}
            {imgType === "rxsp" && (
              <div>
                <label className="lbl">
                  Type d'examen <span className="req">*</span>
                </label>
                <select
                  className="mb12"
                  value={getFormValue("rxspType")}
                  onChange={(e) => setFormValue("rxspType", e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {[
                    "Radio spéciale UIV (Urographie intra-veineuse)",
                    "Radio spéciale TOGD (Transit œso-gastro-duodénal)",
                    "Radio spéciale Lavement baryté (côlon)",
                    "Radio spéciale Hystérographie",
                    "Radio spéciale Fistulographie",
                    "Radio spéciale Artériographie",
                    "Radio spéciale Phlébographie",
                    "Radio spéciale Lymphographie",
                    "Radio spéciale Sialographie",
                    "Radio spéciale Dacryocystographie",
                    "Radio spéciale Myélographie",
                    "Radio spéciale Cystographie",
                    "Radio spéciale Uréthrographie",
                    "Radio spéciale Autre",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <label className="lbl">Préparation requise</label>
                <textarea
                  rows={2}
                  className="mb12"
                  value={getFormValue("rxspPrep")}
                  onChange={(e) => setFormValue("rxspPrep", e.target.value)}
                  placeholder="Préparation digestive, hydratation, arrêt médicaments..."
                />
                <label className="lbl">
                  Précisions / Question pour le radiologue
                </label>
                <textarea
                  rows={2}
                  value={getFormValue("rxspPrecisions")}
                  onChange={(e) =>
                    setFormValue("rxspPrecisions", e.target.value)
                  }
                  placeholder="Indication précise, aspect recherché..."
                />
              </div>
            )}
          </div>

          {/* ── Colonne droite : clinique & checklist ── */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--navy, #006A8C)",
                marginBottom: 10,
                borderLeft: "3px solid var(--navy, #006A8C)",
                paddingLeft: 8,
              }}
            >
              Renseignements & sécurité
            </div>

            <div className="mb12 rc-field">
              <label className="lbl">
                Renseignements cliniques / Diagnostic{" "}
                <span className="req">*</span>
              </label>
              <textarea
                rows={2}
                value={getFormValue("renseignementsCliniques")}
                onChange={(e) =>
                  setFormValue("renseignementsCliniques", e.target.value)
                }
                placeholder="Symptômes, suspicion diagnostique, contexte clinique pour cet examen..."
              />
            </div>
            <div className="mb12">
              <label className="lbl">Question(s) pour le radiologue</label>
              <textarea
                rows={2}
                value={getFormValue("questionRadio")}
                onChange={(e) => setFormValue("questionRadio", e.target.value)}
                placeholder="Questions spécifiques pour le radiologue..."
              />
            </div>

            {/* Checklist scanner */}
            {imgType === "scan" && (
              <div
                style={{
                  background: "var(--navy-lt, #EBF5FB)",
                  border: "1.5px solid var(--navy-mid, #b8d4e3)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <Icone nom="checklist" style={{ color: "var(--navy, #006A8C)", fontSize: 16 }} />
                  <strong
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: ".8px",
                      color: "var(--navy, #006A8C)",
                    }}
                  >
                    Checklist obligatoire — scanner
                  </strong>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 12,
                    color: "var(--txt)",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Hémodynamique instable ou Glasgow &lt; 8 ?
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {["Oui — stabiliser avant déplacement", "Non"].map(
                      (opt) => (
                        <label
                          key={opt}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="sc-glasgow"
                            value={opt}
                            checked={getFormValue("scanGlasgow") === opt}
                            onChange={() => setFormValue("scanGlasgow", opt)}
                            style={{ accentColor: "var(--navy)" }}
                          />
                          {opt}
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 12,
                    color: "var(--txt)",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Patient agité ?
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {["Oui — sédation préalable requise", "Non"].map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="sc-agite"
                          value={opt}
                          checked={getFormValue("scanAgite") === opt}
                          onChange={() => setFormValue("scanAgite", opt)}
                          style={{ accentColor: "var(--navy)" }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 12,
                    color: "var(--txt)",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Allergie (surtout produit de contraste) ?
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {["Oui", "Non"].map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="sc-allergie"
                          value={opt}
                          checked={getFormValue("scanAllergie") === opt}
                          onChange={() => setFormValue("scanAllergie", opt)}
                          style={{ accentColor: "var(--navy)" }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {getFormValue("scanAllergie") === "Oui" && (
                    <div style={{ marginTop: 6 }}>
                      <input
                        type="text"
                        value={getFormValue("scanAllergieDetail")}
                        onChange={(e) =>
                          setFormValue("scanAllergieDetail", e.target.value)
                        }
                        placeholder="Préciser l'allergie..."
                      />
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--amber-dk)",
                          marginTop: 4,
                        }}
                      >
                        ⚠ ATCD choc anaphylactique ou œdème de Quincke →
                        médication antihistaminique obligatoire
                      </p>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 12,
                    color: "var(--txt)",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    Créatininémie (&lt; 3 mois)
                  </div>
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--txt3)",
                      marginBottom: 6,
                      fontStyle: "italic",
                    }}
                  >
                    Si avec injection : la décision finale reste au radiologue
                  </p>
                  <div className="g2">
                    <input
                      type="text"
                      value={getFormValue("scanCreatinine")}
                      onChange={(e) =>
                        setFormValue("scanCreatinine", e.target.value)
                      }
                      placeholder="Valeur créatinine"
                    />
                    <input
                      type="text"
                      value={getFormValue("scanClearance")}
                      onChange={(e) =>
                        setFormValue("scanClearance", e.target.value)
                      }
                      placeholder="Clearance (ml/min)"
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--amber-dk)",
                      marginTop: 4,
                    }}
                  >
                    Clearance &lt; 30 ml/mn → injection contre-indiquée · 30–60
                    ml/mn → réhydratation préalable
                  </p>
                </div>
                <div style={{ fontSize: 12, color: "var(--txt)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Le patient prend-il de la metformine ?
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {["Oui", "Non", "Inconnu"].map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="sc-diabete"
                          value={opt}
                          checked={getFormValue("scanDiabete") === opt}
                          onChange={() => setFormValue("scanDiabete", opt)}
                          style={{ accentColor: "var(--navy)" }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {getFormValue("scanDiabete") === "Oui" && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "var(--amber-lt)",
                        border: "1px solid var(--amber-bdr)",
                        fontSize: 11,
                        color: "var(--amber-dk)",
                        lineHeight: 1.5,
                      }}
                    >
                      ⚠️ Le patient prend de la metformine. Vérifier la fonction
                      rénale (créatinine/DFG) et appliquer le protocole de
                      l&apos;établissement concernant la metformine avant et
                      après une éventuelle injection de produit de contraste.
                    </div>
                  )}
                </div>
              </div>
            )}

            {imgType === "scan" && isPatientInstable && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--red-lt)",
                  border: "1.5px solid var(--red-bdr)",
                  fontSize: 12,
                  color: "var(--red)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icone nom="warning" style={{ fontSize: 18 }} />
                <div>
                  <strong>
                    Le patient doit être stabilisé avant de procéder à cet
                    examen.
                  </strong>
                  <div style={{ marginTop: 2, fontSize: 11 }}>
                    Hémodynamique instable ou Glasgow &lt; 8 : contre-indication
                    au déplacement en imagerie.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerPanel>

      {toast && (
        <div className="tst on">
          <Icone nom="check_circle" />
          {toast}
        </div>
      )}
    </div>
  );
}
