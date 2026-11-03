'use client';
import { useState, useEffect, useRef, startTransition } from 'react';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import ValidationPopup from '../ValidationPopup';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import LaboExamensPopup from './LaboExamensPopup';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Icone } from '@/components/ui/Icone';

interface LaboDraftData {
  urgence: string;
  alertes: string;
  renseignements: string;
  selected: string[];
  notes: string;
  aJeun: boolean;
}

interface Props {
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
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
}

export default function LaboForm({ patient, prescripteur }: Props) {
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const { user } = useAuth();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  const [urgence, setUrgence] = useState('NORMAL');
  const [alertes, setAlertes] = useState('');
  const [renseignements, setRenseignements] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [aJeun, setAJeun] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showExamensPopup, setShowExamensPopup] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  type UrgenceType = "NORMAL" | "URGENT" | "TRES_URGENT";
  const urgenceClasses: Record<UrgenceType, string> = { NORMAL: "un", URGENT: "uu", TRES_URGENT: "utu" };

  const { clearDraft } = useDraftPersistence<LaboDraftData>(
    `draft:labo:${patient.id}`,
    { urgence, alertes, renseignements, selected, notes, aJeun },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:labo:${patient.id}`;
      const draftData = loadDraft<LaboDraftData>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.renseignements) setRenseignements(draftData.renseignements);
          if (draftData.selected?.length > 0) setSelected(draftData.selected);
          if (draftData.notes) setNotes(draftData.notes);
          if (draftData.aJeun) setAJeun(draftData.aJeun);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
      }
    }
  }, [patient.id, setPatientId]);

  function toggle(val: string) { setSelected(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]); }
  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(''), 2800); }
  const isFormValid = selected.length > 0 && renseignements.trim();

  function handleExamensConfirm(newSelected: string[]) {
    setSelected(newSelected);
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        renseignements,
        analyses: selected,
        notes,
        aJeun,
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
      };

      const summary = `${selected.length} analyse(s) de laboratoire`;
      addToPanier('labo', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setSelected([]);
      setRenseignements('');
      setNotes('');
      setAJeun(false);
      setUrgence('NORMAL');
      setAlertes('');
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
        <div>
          <div className="card mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} placeholder="Motif, antécédents, suspicion diagnostique..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>

          {/* Bouton sélectionner les examens */}
          <div className="card mb12" style={{ padding: 12 }}>
            <button
              onClick={() => setShowExamensPopup(true)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 10,
                border: '2px dashed var(--navy-mid)',
                background: selected.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.15s',
              }}
            >
              <Icone nom="science" style={{ fontSize: 22, color: 'var(--navy)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                  Sélectionner les examens à faire
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {selected.length > 0
                    ? `${selected.length} examen${selected.length > 1 ? 's' : ''} sélectionné${selected.length > 1 ? 's' : ''} — cliquer pour modifier`
                    : 'Cliquez pour ouvrir la liste des examens'}
                </div>
              </div>
              <Icone nom={selected.length > 0 ? 'edit' : 'add_circle'} style={{ fontSize: 18, color: 'var(--navy)', marginLeft: 'auto' }} />
            </button>

            {/* Examens sélectionnés affichés en chips */}
            {selected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {selected.map(a => (
                  <span key={a} style={{
                    background: 'var(--card)', border: '1px solid var(--navy-mid)',
                    borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                    color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                  }} onClick={() => toggle(a)}>
                    {a}
                    <Icone nom="close" style={{ fontSize: 13 }} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes complémentaires sous les examens */}
          <div className="card" style={{ padding: 12, marginTop: 12 }}>
            <label className="lbl">Notes complémentaires</label>
            <textarea rows={3} placeholder="Ex : patient à jeun, dernier repas à 8h..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* COLONNE DROITE — sticky */}
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence as UrgenceType] ?? 'un'}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value)}>
                <option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="TRES_URGENT">Très urgent</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icone nom="warning" style={{ fontSize: 16, color: 'var(--red)' }} /><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Précautions &amp; Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px solid var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} placeholder="Allergies, contre-indications..." value={alertes} onChange={e => setAlertes(e.target.value)} />
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

          <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => setAJeun(!aJeun)}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${aJeun ? 'var(--navy)' : 'var(--bdr)'}`, background: aJeun ? 'var(--navy)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
              {aJeun && <Icone nom="check" style={{ fontSize: 16, color: '#fff' }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Patient à jeun</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Jeûne de 8-12h recommandé</div>
            </div>
          </div>

          <button className="bp" onClick={handleSubmit}
            style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? 'auto' : 'none', marginTop: 0 }}>
            <Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}
          </button>
        </div>
      </div>

      {showExamensPopup && (
        <LaboExamensPopup
          isOpen={showExamensPopup}
          onClose={() => setShowExamensPopup(false)}
          onConfirm={handleExamensConfirm}
          initialSelected={selected}
          chuId={chuId}
        />
      )}

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
