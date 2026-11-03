"use client";
import { useState, useEffect, useRef, startTransition } from "react";

import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from '../ValidationPopup';
import DrawerPanel from '../DrawerPanel';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { calcAge } from '../medicale/utils';
import { Urgence, urgenceClasses } from '../types';
import { Icone } from '@/components/ui/Icone';


const TYPES_ENDO = [
  { value: 'fibroscopie', label: 'Fibroscopie digestive haute (FOGD)' },
  { value: 'coloscopie', label: 'Coloscopie' },
  { value: 'recto-sigmo', label: 'Recto-sigmoïdoscopie' },
  { value: 'ligature-varices', label: 'Ligature de varices œsophagiennes' },
  { value: 'dilatation-oeso', label: 'Dilatation oesophagienne' },
  { value: 'extraction-corps', label: 'Extraction de corps étranger' },
  { value: 'gpe', label: 'GPE (Gastrostomie percutanée endoscopique)' },
  { value: 'injection-colle', label: 'Injection de colle biologique' },
];

const TYPES_ENDO_LABELS: Record<string, string> = Object.fromEntries(TYPES_ENDO.map(t => [t.value, t.label]));

interface Props { patient: { 
    id: string; 
    nom?: string; 
    prenom?: string;
    sexe?: string;
    dateNaissance?: string;
    allergies?: string[];
    groupeSanguin?: string;
  }; prescripteur: { id?: string; nom?: string; prenom?: string; service?: string }; patientType?: 'hospitalise' | 'consultation_externe' | 'accueil'; }


interface Demande {
  id: string;
  typeExamen: string;
  renseignementsCliniques: string;
  remarques: string;
}


export default function EndoscopieForm({ patient, prescripteur }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const [urgence, setUrgence] = useState<Urgence>('NORMAL');
  const [alertes, setAlertes] = useState("");
  const [demandes, setDemandes] = useState<Demande[]>([]);
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

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);
  const [drawerSelected, setDrawerSelected] = useState<string[]>([]);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const isFormValid = !!urgence && demandes.length > 0 && demandes.every(d => d.typeExamen && d.renseignementsCliniques.trim() !== "");

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; demandes: Demande[] }>(
    `draft:endoscopie:${patient.id}`,
    { urgence, alertes, demandes },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:endoscopie:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; demandes: Demande[] }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence) setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.demandes?.length > 0) setDemandes(draftData.demandes.map(d => ({ ...d, renseignementsCliniques: d.renseignementsCliniques || '', remarques: d.remarques || '' })));
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
      }
    }
  }, [patient.id, setPatientId]);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(""), 2800); }

  function openDrawer(targetId: string | null) {
    setDrawerTargetId(targetId);
    if (targetId) {
      const d = demandes.find(dm => dm.id === targetId);
      setDrawerSelected(d?.typeExamen ? [d.typeExamen] : []);
    } else {
      setDrawerSelected([]);
    }
    setShowDrawer(true);
  }

  function toggleDrawerItem(val: string) {
    setDrawerSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function validateDrawer() {
    const newDemandes = drawerSelected.map(val => ({
      id: Date.now().toString() + '-' + val,
      typeExamen: val,
      renseignementsCliniques: '',
      remarques: '',
    }));
    if (drawerTargetId) {
      const idx = demandes.findIndex(d => d.id === drawerTargetId);
      const updated = [...demandes];
      updated.splice(idx, 1, ...newDemandes);
      setDemandes(updated);
    } else {
      setDemandes([...demandes, ...newDemandes]);
    }
    setShowDrawer(false);
    setDrawerTargetId(null);
    setDrawerSelected([]);
  }

  function removeDemande(id: string) {
    setDemandes(demandes.filter(d => d.id !== id));
  }

  function updateDemande(id: string, field: keyof Demande, value: string) {
    setDemandes(demandes.map(d => d.id === id ? { ...d, [field]: value } : d));
  }


  async function handleSubmit() {
    setLoading(true);
    setApiError("");
    try {
      const prescriptionData = { patientId: patient.id, prescripteurId: prescripteur.id, urgence, alertes, demandes: demandes.map(d => ({ typeExamen: d.typeExamen, renseignementsCliniques: d.renseignementsCliniques, remarques: d.remarques })), nomMedecinPrescripteur: nomMedecin, numeroONM: numeroONM, patientNom: patient.nom, patientPrenom: patient.prenom, prescripteurNom: prescripteur.nom, prescripteurPrenom: prescripteur.prenom, prescripteurService: prescripteur.service };

      const summary = `${demandes.length} examen(s) endoscopique(s)`;
      addToPanier('endoscopie', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setDemandes([]); setAlertes(""); setUrgence('NORMAL');
    } catch { setApiError("Erreur lors de l'ajout au panier."); }
    finally { setLoading(false); }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="lbl">Examens endoscopiques <span className="req">*</span></label>
              {demandes.length > 0 && (
                <button onClick={() => setDemandes([])} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 600 }}>Retirer tout</button>
              )}
            </div>

            {demandes.length === 0 && (
              <button onClick={() => openDrawer(null)} style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '2px dashed var(--navy-mid)', background: 'var(--blue-ps-lt)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Icone nom="visibility" style={{ fontSize: 22, color: 'var(--navy)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Ajouter un examen endoscopique</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Sélectionner un ou plusieurs types</div>
                </div>
              </button>
            )}

            {demandes.map((d, idx) => (
              <div 
                key={d.id} 
                style={{ background: 'var(--surface-alt)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 12, marginBottom: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)' }}>Examen #{idx + 1}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="bedit" onClick={() => openDrawer(d.id)}>
                      <Icone nom="edit" />
                    </button>
                    <button className="bdel" onClick={() => removeDemande(d.id)}>
                      <Icone nom="delete" />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icone nom="medical_services" style={{ fontSize: 16, color: 'var(--navy)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{TYPES_ENDO_LABELS[d.typeExamen] || d.typeExamen}</span>
                </div>
                <div className="rc-field" style={{ marginBottom: 8 }}>
                  <label className="lbl">Renseignements cliniques <span className="req">*</span></label>
                  <textarea rows={2} value={d.renseignementsCliniques} onChange={e => updateDemande(d.id, 'renseignementsCliniques', e.target.value)} placeholder="Contexte clinique pour cet examen..." style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="lbl">Remarques</label>
                  <textarea rows={2} value={d.remarques} onChange={e => updateDemande(d.id, 'remarques', e.target.value)} placeholder="Informations spécifiques..." style={{ width: '100%' }} />
                </div>
              </div>
            ))}

            {demandes.length > 0 && (
              <button onClick={() => openDrawer(null)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px dashed var(--navy)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <Icone nom="add_circle" style={{ fontSize: 18, color: 'var(--navy)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>Ajouter un autre examen</span>
              </button>
            )}
          </div>
        </div>
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence] || 'un'}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="TRES_URGENT">Très urgent</option></select></div><div className="ah"><Icone nom="warning" /><span>Précautions &amp; Alertes</span></div><textarea className="af" rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Allergies anesthésiques..." style={{padding:'8px 12px'}} /></div>
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
          <button className="bp" onClick={handleSubmit} style={{ opacity: isFormValid && !loading ? 1 : 0.5, pointerEvents: isFormValid && !loading ? "auto" : "none", marginTop:0 }}><Icone nom="check_circle" />{loading ? "Envoi..." : "Valider la prescription"}</button>
        </div>
      </div>
      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>La prescription sera transmise au service d&apos;endoscopie après validation</p>

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

      <DrawerPanel
        isOpen={showDrawer}
        onClose={() => { setShowDrawer(false); setDrawerTargetId(null); setDrawerSelected([]); }}
        title="Types d'examens endoscopiques"
        subtitle="Sélectionnez un ou plusieurs types"
        icon="medical_services"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => { setShowDrawer(false); setDrawerTargetId(null); setDrawerSelected([]); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--card)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button onClick={validateDrawer} disabled={drawerSelected.length === 0} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: drawerSelected.length > 0 ? 'var(--navy)' : 'var(--bdr)', color: drawerSelected.length > 0 ? '#fff' : 'var(--txt3)', cursor: drawerSelected.length > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>Valider</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TYPES_ENDO.map(t => (
            <label key={t.value} className="rc" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={drawerSelected.includes(t.value)} onChange={() => toggleDrawerItem(t.value)} style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
              <span style={{ fontSize: 14 }}>{t.label}</span>
            </label>
          ))}
        </div>
      </DrawerPanel>

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    </div>
  );
}
