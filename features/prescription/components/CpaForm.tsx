"use client";
import { useState, useEffect, useRef, startTransition } from "react";
import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from './ValidationPopup';
import { Patient, Prescripteur, Urgence, urgenceClasses } from './types';
import { calcAge } from './medicale/utils';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Icone } from '@/components/ui/Icone';

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
}

export default function CpaForm({ patient, prescripteur }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const [motif, setMotif] = useState("");
  const [dateSouhaitee, setDateSouhaitee] = useState("");
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [alertes, setAlertes] = useState("");
  const [consignes, setConsignes] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const age = calcAge(patient?.dateNaissance);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  const isFormValid = motif.trim() !== "";

  const { clearDraft } = useDraftPersistence<{ motif: string; dateSouhaitee: string; urgence: string; alertes: string; consignes: string }>(
    `draft:cpa:${patient.id}`,
    { motif, dateSouhaitee, urgence, alertes, consignes },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:cpa:${patient.id}`;
      const draftData = loadDraft<{ motif: string; dateSouhaitee: string; urgence: string; alertes: string; consignes: string }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.motif) setMotif(draftData.motif);
          if (draftData.dateSouhaitee) setDateSouhaitee(draftData.dateSouhaitee);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.consignes) setConsignes(draftData.consignes);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
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
      const isAccueilService = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        sourceType: isAccueilService ? 'EXTERNE' : 'INTERNE',
        urgence,
        alertes,
        consignes,
        motif,
        dateSouhaitee: dateSouhaitee || undefined,
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
      };

      const summary = `Demande de CPA${motif ? ` — ${motif.slice(0, 60)}` : ''}`;
      addToPanier('cpa', summary, prescriptionData);
      clearDraft();

      setMotif("");
      setDateSouhaitee("");
      setUrgence("NORMAL");
      setAlertes("");
      setConsignes("");
      setShowValidationPopup(true);
    } catch {
      setApiError("Erreur lors de l'ajout au panier.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* COLONNE GAUCHE */}
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12">
            <label className="lbl">Motif de la demande de CPA <span className="req">*</span></label>
            <textarea
              rows={4}
              value={motif}
              onChange={e => { setMotif(e.target.value); if (apiError) setApiError(""); }}
              placeholder="Décrire le motif de la consultation de prise en charge anesthésique..."

            />
          </div>

          <div className="mb12">
            <label className="lbl">Date souhaitée</label>
            <input type="date" value={dateSouhaitee} onChange={e => setDateSouhaitee(e.target.value)} />
            <p className="hint">Date à laquelle la prise en charge anesthésique est souhaitée (optionnel).</p>
          </div>

          <label className="lbl">Consignes particulières</label>
          <textarea rows={3} value={consignes} onChange={e => setConsignes(e.target.value)} placeholder="Ex : patient sous anticoagulants, bilan pré-opératoire à réaliser..." />
        </div>

        {/* COLONNE DROITE — sticky */}
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}>
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="TRES_URGENT">Très urgent</option>
              </select>
            </div>
            {isAccueil && (
              <>
                <div className="mb12">
                  <label className="lbl">Nom du médecin prescripteur *</label>
                  <input type="text" value={nomMedecin} onChange={e => setNomMedecin(e.target.value)} placeholder="Dr ..." />
                </div>
                <div className="mb12">
                  <label className="lbl">N° ONM *</label>
                  <input type="text" value={numeroONM} onChange={e => setNumeroONM(e.target.value)} placeholder="ONM-..." />
                </div>
              </>
            )}
            <div className="ah"><Icone nom="warning" /><span>Précautions &amp; Alertes</span></div>
            <textarea
              className="af" rows={2}
              placeholder="Allergies connues, anticoagulants, implants, antécédents importants..."
              value={alertes} onChange={e => setAlertes(e.target.value)}
              style={alertes.trim() ? { background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px' } : { padding: '8px 12px' }}
            />
          </div>

          <button
            className="bp"
            onClick={handleSubmit}
            style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }} disabled={!isFormValid || loading}
          >
            <Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}
          </button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: "center", marginTop: 6 }}>
        Cette validation transmet automatiquement une demande de CPA au service d'Anesthésie - Réanimation
      </p>

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { scrollPrescriptionContentToTop(); }}
        onSendAll={async () => {
          setIsSending(true);
          try { const result = await sendAll(patient.id); if (result?.allSent) showToast("Prescriptions envoyées avec succès"); else if (result?.errorCount) setApiError("Erreur lors de l'envoi"); } catch { setApiError("Erreur lors de l'envoi"); } finally { setIsSending(false); }
        }}
        isSending={isSending}
      />

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    </div>
  );
}
