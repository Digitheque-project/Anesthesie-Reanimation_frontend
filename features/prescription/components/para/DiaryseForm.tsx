"use client";
import { useState, useEffect, useRef, startTransition } from "react";
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import ValidationPopup from '../ValidationPopup';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Urgence, urgenceClasses } from '../types';
import { Icone } from '@/components/ui/Icone';


interface CreneauSlot {
  machine: string;
  machineId?: string;
  heure: string;
  heureFin?: string;
  disponible: boolean;
  slotId?: string;
  shiftId?: string;
  shiftDate?: string;
  shiftPeriod?: string;
  rdvId?: number | string | null;
  status?: string;
}

interface Props {
  patient: {
    id: string;
    nom?: string;
    prenom?: string;
    sexe?: string;
    dateNaissance?: string;
    allergies?: string[];
    groupeSanguin?: string;
  };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
}

export default function DiaryseForm({ patient, prescripteur, patientType }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { user } = useAuth();
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  const serviceId = (user?.services as any[])?.[0]?.serviceId;
  const serviceName = (user?.services as any[])?.[0]?.serviceName;
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [alertes, setAlertes] = useState("");
  const [renseignements, setRenseign] = useState("");
  const [remarques, setRemarques] = useState("");
  const [diagnosticRenal, setDiagnosticRenal] = useState("");

  const [observationsTol, setObservationsTol] = useState("");
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  const isAccueilPatient = patientType === 'accueil';
  const isFormValid = !!renseignements.trim();

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; renseignements: string; remarques: string; diagnosticRenal: string; observationsTol: string }>(
    `draft:dialyse:${patient.id}`,
    { urgence, alertes, renseignements, remarques, diagnosticRenal, observationsTol },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    if (patient?.id) setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:dialyse:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; renseignements: string; remarques: string; diagnosticRenal: string; observationsTol: string }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.renseignements) setRenseign(draftData.renseignements);
          if (draftData.remarques) setRemarques(draftData.remarques);
          if (draftData.diagnosticRenal) setDiagnosticRenal(draftData.diagnosticRenal);
          if (draftData.observationsTol) setObservationsTol(draftData.observationsTol);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
      }
    }
  }, [patient?.id, setPatientId]);

  function showToast(msg: string) {
    setToast(msg);
    scrollPrescriptionContentToTop();
    setTimeout(() => setToast(""), 2800);
  }

  function buildDialyseSummary(): string {
    const parts: string[] = [];
    if (diagnosticRenal) parts.push(diagnosticRenal);
    if (renseignements) parts.push(renseignements.slice(0, 40));
    return parts.join(' · ') || 'Dialyse';
  }

  function handleSubmit() {
    const prescriptionData = {
      patientId: patient.id,
      prescripteurId: prescripteur.id,
      urgence,
      alertes,
      renseignements,
      diagnosticRenal,
      observationsTol,
      remarques,
      chuId,
      serviceIdSource: serviceId,
      serviceNameSource: serviceName,

      nomMedecinPrescripteur: nomMedecin,
      numeroONM: numeroONM,
      patientNom: patient.nom,
      patientPrenom: patient.prenom,
      prescripteurNom: prescripteur.nom,
      prescripteurPrenom: prescripteur.prenom,
      prescripteurService: prescripteur.service,
    };

    const summary = buildDialyseSummary();
    addToPanier('dialyse', summary, prescriptionData);
    clearDraft();

    setShowValidationPopup(true);
    setUrgence("NORMAL");
    setAlertes("");
    setRenseign("");
    setDiagnosticRenal("");
    setObservationsTol("");
    setRemarques("");
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Grille identique aux 9 autres formulaires paracliniques :
          colonne de saisie extensible + colonne de droite FIXE a 300 px.
          Avant, ce formulaire utilisait la classe `g2-form` (deux colonnes
          egales 50/50), d'ou une carte "Degre d'urgence" beaucoup plus large
          que dans Laboratoire, Imagerie, Endoscopie, etc. */}
      <div className="mb12" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card rc-field" style={{ padding: 12 }}>
            <label className="lbl">Motif de mise en dialyse / Renseignements cliniques <span className="req">*</span></label>
            <textarea rows={3} value={renseignements} onChange={e => setRenseign(e.target.value)} placeholder="Insuffisance rénale chronique stade 5..." />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Diagnostic rénal principal</label>
            <textarea rows={2} value={diagnosticRenal} onChange={e => setDiagnosticRenal(e.target.value)} placeholder="IRC terminale stade 5, diabète sucré, HTA maligne..." />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Observations de tolérance si déjà connues</label>
            <textarea rows={2} value={observationsTol} onChange={e => setObservationsTol(e.target.value)} placeholder="Hypotension intermittente, troubles hémodynamiques déjà observés..." />
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
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px solid var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Accès vasculaire, anticoagulants..." />
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
          <div className="card" style={{ padding: 12 }}>
            <label className="lbl">Autres remarques</label>
            <textarea rows={3} value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Durée, débit, fréquence souhaitée..." />
          </div>
          <button className="bp" onClick={handleSubmit} style={{ opacity: isFormValid ? 1 : 0.5, pointerEvents: isFormValid ? 'auto' : 'none', marginTop: 0 }}>
            <Icone nom="check_circle" />Valider
          </button>
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
