"use client";
import { useState, useEffect, useRef, startTransition } from "react";
import { creerPrescriptionKine } from '@/features/prescription/lib/api';
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


export default function KineForm({ patient, prescripteur }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const [urgence, setUrgence] = useState<Urgence>("NORMAL"); const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseign] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [remarques, setRemarques] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false); const [apiError, setApiError] = useState("");
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  const isFormValid = !!renseignements.trim() && diagnostic.trim().length > 0 && objectifs.trim().length > 0;

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; renseignements: string; diagnostic: string; objectifs: string; remarques: string }>(
    `draft:kine:${patient.id}`,
    { urgence, alertes, renseignements, diagnostic, objectifs, remarques },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:kine:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; renseignements: string; diagnostic: string; objectifs: string; remarques: string }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.renseignements) setRenseign(draftData.renseignements);
          if (draftData.diagnostic) setDiagnostic(draftData.diagnostic);
          if (draftData.objectifs) setObjectifs(draftData.objectifs);
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
      const prescriptionData = { patientId: patient.id, prescripteurId: prescripteur.id, urgence, alertes, renseignements, diagnostic, objectifs, remarques, nomMedecinPrescripteur: nomMedecin, numeroONM: numeroONM, patientNom: patient.nom, patientPrenom: patient.prenom, prescripteurNom: prescripteur.nom, prescripteurPrenom: prescripteur.prenom, prescripteurService: prescripteur.service };

      addToPanier('kine', 'Prescription kinésithérapie', prescriptionData);
      clearDraft();

      setShowValidationPopup(true); setUrgence("NORMAL"); setAlertes(""); setRenseign(""); setDiagnostic(""); setObjectifs(""); setRemarques("");
    } catch { setApiError("Erreur lors de l'ajout au panier."); }
    finally { setLoading(false); }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      {/* Grille identique aux 9 autres formulaires paracliniques :
          colonne de saisie extensible + colonne de droite FIXE a 300 px.
          Avant, ce formulaire utilisait la classe `g2-form` (deux colonnes
          egales 50/50), d'ou une carte "Degre d'urgence" beaucoup plus large
          que dans Laboratoire, Imagerie, Endoscopie, etc. */}
      <div className="mb12" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card rc-field" style={{ padding: 12 }}><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} value={renseignements} onChange={e => setRenseign(e.target.value)} placeholder="Contexte clinique..." /></div>
          <div className="card" style={{ padding: 12 }}>
            <div className="mb8"><label className="lbl">Diagnostic <span className="req">*</span></label><input type="text" value={diagnostic} onChange={e => setDiagnostic(e.target.value)} placeholder="Ex : fracture col fémoral..." /></div>
            <div><label className="lbl">Objectifs thérapeutiques <span className="req">*</span></label><textarea rows={2} value={objectifs} onChange={e => setObjectifs(e.target.value)} placeholder="Ex : récupération..." /></div>
          </div>
        </div>
        {/* COLONNE DROITE — sticky, identique aux autres formulaires paracliniques
            (Laboratoire, Imagerie, EEG, ECG, Endoscopie, ORL, Anapath...) :
            meme classe .psx-side, meme carte urgence + precautions aux memes
            dimensions (card padding 8, textarea rows=1, libelle rouge en
            majuscules), pour que le bloc ait partout la meme taille. */}
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}>
                <option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="TRES_URGENT">Très urgent</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icone nom="warning" style={{ fontSize: 16, color: 'var(--red)' }} /><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Précautions &amp; Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px solid var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Contre-indications..." />
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
          <div className="card" style={{ padding: 12 }}><label className="lbl">Remarques complémentaires</label><textarea rows={2} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Informations supplémentaires..." /></div>
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
