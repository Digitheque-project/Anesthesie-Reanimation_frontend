"use client";
import { useState, useEffect, useRef, startTransition } from "react";

import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from '../ValidationPopup';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { Urgence, urgenceClasses } from '../types';
import { Icone } from '@/components/ui/Icone';


interface Props {
  patient: {
    id: string;
    nom?: string;
    prenom?: string;
    sexe?: string;
    dateNaissance?: string;
    allergies?: string[];
    service?: string;
  };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
}

export default function ConsultationOrlForm({ patient, prescripteur }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const [urgence, setUrgence] = useState<Urgence>('NORMAL');
  const [alertes, setAlertes] = useState("");
  const [motifConsultation, setMotifConsultation] = useState("");
  const [serviceOrigine, setServiceOrigine] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  const isFormValid = motifConsultation.trim() !== "" && (!isAccueil || (nomMedecin.trim() !== "" && numeroONM.trim() !== ""));

  const { clearDraft } = useDraftPersistence<{
    urgence: string;
    alertes: string;
    motifConsultation: string;
    serviceOrigine: string;
  }>(
    `draft:orl-consultation:${patient.id}`,
    { urgence, alertes, motifConsultation, serviceOrigine },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:orl-consultation:${patient.id}`;
      const draftData = loadDraft<{
        urgence: string;
        alertes: string;
        motifConsultation: string;
        serviceOrigine: string;
      }>(draftKey);
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
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.motifConsultation) setMotifConsultation(draftData.motifConsultation);
          if (draftData.serviceOrigine) setServiceOrigine(draftData.serviceOrigine);
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

  function showToast(msg: string) {
    setToast(msg);
    scrollPrescriptionContentToTop();
    setTimeout(() => setToast(""), 2800);
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError("");
    try {
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        typePrescription: "CONSULTATION",
        urgence,
        alertes,
        motifConsultation,
        serviceOrigine: serviceOrigine || prescripteur.service || "",
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        nomAgentAccueil: isAccueil ? prescripteur.nom : undefined,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
      };

      const summary = `Consultation ORL — ${motifConsultation.substring(0, 40)}${motifConsultation.length > 40 ? '...' : ''}`;
      addToPanier('orl', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setMotifConsultation("");
      setServiceOrigine("");
      setAlertes("");
      setUrgence('NORMAL');
    } catch {
      setApiError("Erreur lors de l'ajout au panier.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {apiError && (
        <div style={{
          background: "var(--red-lt)", border: "1px solid var(--red-bdr)",
          borderRadius: 8, padding: "10px 12px", fontSize: 12,
          color: "var(--red)", marginBottom: 12,
        }}>{apiError}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Motif de la demande <span className="req">*</span></label>
            <textarea
              rows={3}
              value={motifConsultation}
              onChange={e => setMotifConsultation(e.target.value)}
              placeholder="Ex: Otalgie persistante, surdité brutale, corps étranger suspecté..."
            />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Service d&apos;origine</label>
            <input
              type="text"
              value={serviceOrigine}
              onChange={e => setServiceOrigine(e.target.value)}
              placeholder={prescripteur.service || "Ex: Chirurgie, UC, Médecine générale..."}
            />
            <p className="hint" style={{ marginTop: 4 }}>
              Si non renseigné, le service source du prescripteur sera utilisé
            </p>
          </div>
        </div>
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select
                className="urgs"
                value={urgence}
                onChange={e => setUrgence(e.target.value as Urgence)}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="TRES_URGENT">Très urgent</option>
              </select>
            </div>
            <div className="ah">
              <Icone nom="warning" />
              <span>Précautions &amp; Alertes</span>
            </div>
            <textarea
              className="af"
              rows={1}
              value={alertes}
              onChange={e => setAlertes(e.target.value)}
              placeholder="Allergies..."
              style={{ padding: '8px 12px' }}
            />
          </div>
          {isAccueil && (
            <>
              <div className="mb12">
                <label className="lbl">Nom du médecin demandeur *</label>
                <input
                  type="text"
                  value={nomMedecin}
                  onChange={e => setNomMedecin(e.target.value)}
                  placeholder="Dr ..."
                />
              </div>
              <div className="mb12">
                <label className="lbl">N° ONM *</label>
                <input
                  type="text"
                  value={numeroONM}
                  onChange={e => setNumeroONM(e.target.value)}
                  placeholder="ONM-..."
                />
              </div>
            </>
          )}
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
            {loading ? "Envoi..." : "Envoyer la demande"}
          </button>
        </div>
      </div>
      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>
        La demande de consultation sera transmise au service d&apos;ORL
      </p>

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { scrollPrescriptionContentToTop(); }}
        onSendAll={async () => {
          setIsSending(true);
          try {
            const result = await sendAll(patient.id);
            if (result?.allSent) showToast("Prescriptions envoyées avec succès");
            else if (result?.errorCount) setApiError("Erreur lors de l'envoi");
          } catch {
            setApiError("Erreur lors de l'envoi");
          } finally {
            setIsSending(false);
          }
        }}
        isSending={isSending}
      />

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    </div>
  );
}
