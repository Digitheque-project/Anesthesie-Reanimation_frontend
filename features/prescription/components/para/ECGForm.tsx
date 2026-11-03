"use client";
import { useState, useEffect, useRef, startTransition } from "react";

import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from '../ValidationPopup';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { calcAge } from '../medicale/utils';
import { Urgence, urgenceClasses } from '../types';
import { Icone } from '@/components/ui/Icone';


interface Props { patient: { 
    id: string; 
    nom?: string; 
    prenom?: string;
    sexe?: string;
    dateNaissance?: string;
    allergies?: string[];
    groupeSanguin?: string;
  }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string }; patientType?: 'hospitalise' | 'consultation_externe' | 'accueil'; }


export default function ECGForm({ patient, prescripteur }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseignements] = useState("");
  const [remarques, setRemarques] = useState("");
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

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const isFormValid = !!renseignements.trim();

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; renseignements: string; remarques: string }>(
    `draft:ecg:${patient.id}`,
    { urgence, alertes, renseignements, remarques },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:ecg:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; renseignements: string; remarques: string }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.renseignements) setRenseignements(draftData.renseignements);
          if (draftData.remarques) setRemarques(draftData.remarques);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
      }
    }
  }, [patient.id, setPatientId]);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(""), 2800); }

  async function handleSubmit() {
    setLoading(true); setApiError("");
    try {
      const prescriptionData = { patientId: patient.id, prescripteurId: prescripteur.id, urgence, alertes, renseignements, remarques, nomMedecinPrescripteur: nomMedecin, numeroONM: numeroONM, patientNom: patient.nom, patientPrenom: patient.prenom, prescripteurNom: prescripteur.nom, prescripteurPrenom: prescripteur.prenom, prescripteurService: prescripteur.service };

      addToPanier('ecg', 'Prescription ECG', prescriptionData);
      clearDraft();

      setShowValidationPopup(true); setUrgence("NORMAL"); setAlertes(""); setRenseignements(""); setRemarques("");
    } catch { setApiError("Erreur lors de l'envoi."); }
    finally { setLoading(false); }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card rc-field" style={{ padding: 12 }}><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} value={renseignements} onChange={e => setRenseignements(e.target.value)} placeholder="Contexte clinique, indications pour l'ECG..." /></div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Remarques</label>
            <textarea rows={3} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations spécifiques..." />
          </div>
        </div>
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>          <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="TRES_URGENT">Très urgent</option></select></div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><Icone nom="warning" style={{fontSize:16,color:"var(--red)"}} /><span className="lbl" style={{margin:0}}>Précautions &amp; Alertes</span></div><textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Précautions..." style={{background:"var(--red-lt)",border:"1.5px solid var(--red-bdr)",padding:'8px 12px'}} /></div>
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
          <button className="bp" onClick={handleSubmit} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}</button>
        </div>
      </div>
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
