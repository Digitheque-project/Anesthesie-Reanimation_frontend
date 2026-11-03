"use client";
import { useState, useEffect, useRef, startTransition } from "react";

import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from './ValidationPopup';
import DrawerPanel from './DrawerPanel';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Urgence, urgenceClasses } from './types';
import { gatewayUrl } from "@/features/prescription/platform/gateway";
import { Icone } from '@/components/ui/Icone';


const TYPES_ACTES_ORL_BASE = [
  { value: 'lavage-auriculaire', label: 'Lavage auriculaire' },
  { value: 'extraction-cerumen', label: 'Extraction de bouton de cérumen' },
  { value: 'extraction-corps-etranger', label: 'Extraction de corps étranger' },
  { value: 'biopsie-orl', label: 'Biopsie' },
];

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
  typeActe: string;
  typeLabel: string;
  remarques: string;
  renseignementsCliniques: string;
}

const API_URL = gatewayUrl("/clinique");

export default function ActesOrlForm({ patient, prescripteur }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const [urgence, setUrgence] = useState<Urgence>('NORMAL');
  const [alertes, setAlertes] = useState("");
  const [demandes, setDemandes] = useState<Demande[]>([{ id: '1', typeActe: '', typeLabel: '', remarques: '', renseignementsCliniques: '' }]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const prevPatientIdRef = useRef<string | null>(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);
  const [drawerSelected, setDrawerSelected] = useState<string[]>([]);

  const [typesActesOrl, setTypesActesOrl] = useState<typeof TYPES_ACTES_ORL_BASE>(TYPES_ACTES_ORL_BASE);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ value: string; id?: string; label: string } | null>(null);

  const isFormValid = demandes.length > 0 && demandes.every(d => d.typeActe && d.renseignementsCliniques.trim() !== "");

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; demandes: Demande[] }>(
    `draft:actes-orl:${patient.id}`,
    { urgence, alertes, demandes },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:actes-orl:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; demandes: Demande[] }>(draftKey);
      if (draftData) {
        startTransition(() => {
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.demandes?.length > 0) setDemandes(draftData.demandes);
        });
      }
    }
  }, [patient.id, setPatientId]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
    if (!token) return;
    fetch(`${API_URL}/prescriptions/actes-orl/types`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; valeur: string }>) => {
        if (Array.isArray(data) && data.length > 0) {
          const dbTypes = data.map(t => ({ value: t.valeur, label: t.valeur, id: t.id }));
          const baseValues = new Set(TYPES_ACTES_ORL_BASE.map(t => t.value));
          const merged = [
            ...TYPES_ACTES_ORL_BASE.map(t => ({ ...t, id: undefined as string | undefined })),
            ...dbTypes.filter(t => !baseValues.has(t.value)),
          ];
          setTypesActesOrl(merged);
        }
      })
      .catch(() => {});
  }, []);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(""), 2800); }

  function openDrawer(targetId: string | null) {
    setDrawerTargetId(targetId);
    if (targetId) {
      const d = demandes.find(dm => dm.id === targetId);
      setDrawerSelected(d?.typeActe ? [d.typeActe] : []);
    } else {
      setDrawerSelected([]);
    }
    setShowDrawer(true);
  }

  function toggleDrawerItem(val: string) {
    setDrawerSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function validateDrawer() {
    const newDemandes = drawerSelected.map(val => {
      const found = typesActesOrl.find(t => t.value === val);
      return {
        id: Date.now().toString() + '-' + val,
        typeActe: val,
        typeLabel: found?.label || val,
        remarques: '',
        renseignementsCliniques: '',
      };
    });
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
    if (demandes.length > 1) {
      setDemandes(demandes.filter(d => d.id !== id));
    }
  }

  function updateDemande(id: string, field: keyof Demande, value: string) {
    setDemandes(demandes.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  async function handleAddCustomType() {
    const val = customTypeInput.trim();
    if (!val) return;
    const value = val.toLowerCase().replace(/\s+/g, '-');
    setTypesActesOrl(prev => [...prev, { value, label: val, id: undefined }]);
    setCustomTypeInput('');
    setShowCustomInput(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
      await fetch(`${API_URL}/prescriptions/actes-orl/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ valeur: value }),
      });
    } catch {}
  }

  async function handleDeleteType(value: string, id?: string) {
    setTypesActesOrl(prev => prev.filter(t => t.value !== value));
    if (id) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
        await fetch(`${API_URL}/prescriptions/actes-orl/types/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError("");
    try {
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        demandes: demandes.map(d => ({ typeActe: d.typeActe, remarques: d.remarques, renseignementsCliniques: d.renseignementsCliniques })),
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
      };

      const summary = `${demandes.length} acte(s) ORL`;
      addToPanier('actes-orl', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setDemandes([{ id: '1', typeActe: '', typeLabel: '', remarques: '', renseignementsCliniques: '' }]); setAlertes(""); setUrgence('NORMAL');
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
              <label className="lbl">Actes ORL <span className="req">*</span></label>
              {demandes.some(d => d.typeActe) && (
                <button onClick={() => setDemandes([{ id: '1', typeActe: '', typeLabel: '', remarques: '', renseignementsCliniques: '' }])} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 600 }}>Retirer tout</button>
              )}
            </div>
            {demandes.map((d, idx) => (
              <div 
                key={d.id} 
                style={{ background: 'var(--surface-alt)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 12, marginBottom: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)' }}>Acte #{idx + 1}</div>
                  {demandes.length > 1 && (
                    <button className="bdel" onClick={() => removeDemande(d.id)}><Icone nom="delete" /></button>
                  )}
                </div>
                {d.typeActe ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{d.typeLabel || d.typeActe}</span>
                    <button onClick={() => updateDemande(d.id, 'typeActe', '')} style={{ padding: 4, background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', borderRadius: 6, lineHeight: 1 }}><Icone nom="close" style={{ fontSize: 16 }} /></button>
                  </div>
                ) : (
                  <button onClick={() => openDrawer(d.id)} style={{ background: 'var(--navy-lt)', border: '1.5px dashed var(--navy)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--navy)', fontWeight: 600, width: '100%', marginBottom: 8 }}>
                    <Icone nom="add_circle" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />Choisir l&apos;acte
                  </button>
                )}
                <div className="rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} value={d.renseignementsCliniques} onChange={e => updateDemande(d.id, 'renseignementsCliniques', e.target.value)} placeholder="Motif, détails cliniques de l'acte ORL..." /></div>
                <div><label className="lbl">Remarques</label><textarea rows={2} value={d.remarques} onChange={e => updateDemande(d.id, 'remarques', e.target.value)} placeholder="Informations spécifiques..." /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}><label className="lbl">Degré d&apos;urgence <span className="req">*</span></label><div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom:8 }}><div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="TRES_URGENT">Très urgent</option></select></div><div className="ah"><Icone nom="warning" /><span>Précautions &amp; Alertes</span></div><textarea className="af" rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Allergies..." style={{padding:'8px 12px'}} /></div>
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
      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>La prescription sera transmise au service d&apos;ORL après validation</p>

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
        title="Types d'actes ORL"
        subtitle="Sélectionnez un ou plusieurs types"
        icon="hearing"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => { setShowDrawer(false); setDrawerTargetId(null); setDrawerSelected([]); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--card)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button onClick={validateDrawer} disabled={drawerSelected.length === 0} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: drawerSelected.length > 0 ? 'var(--navy)' : 'var(--bdr)', color: drawerSelected.length > 0 ? '#fff' : 'var(--txt3)', cursor: drawerSelected.length > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>Valider</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {typesActesOrl.map(t => (
            <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="rc" style={{ cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" checked={drawerSelected.includes(t.value)} onChange={() => toggleDrawerItem(t.value)} style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
                <span style={{ fontSize: 14 }}>{t.label}</span>
              </label>
              <button
                className="bdel"
                onClick={() => setDeleteConfirm({ value: t.value, id: (t as unknown as { id?: string }).id, label: t.label })}
                title="Supprimer ce type"
              >
                <Icone nom="delete" />
              </button>
            </div>
          ))}
          {showCustomInput ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input type="text" value={customTypeInput} onChange={e => setCustomTypeInput(e.target.value)}
                placeholder="Nouvel acte..."
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--bdr)', fontSize: 12 }}
                autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAddCustomType(); if (e.key === 'Escape') { setShowCustomInput(false); setCustomTypeInput(""); } }}
              />
              <button onClick={handleAddCustomType} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
              <button onClick={() => { setShowCustomInput(false); setCustomTypeInput(""); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--card)', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
            </div>
          ) : (
            <button onClick={() => setShowCustomInput(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 8, border: '1.5px dashed var(--teal)',
                background: 'none', color: 'var(--teal)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4,
              }}
            >
              <Icone nom="add" style={{ fontSize: 16 }} />
              Ajouter un acte personnalisé
            </button>
          )}
        </div>
      </DrawerPanel>

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: 24, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Icone nom="warning" style={{ fontSize: 24, color: 'var(--red)' }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)' }}>Confirmer la suppression</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20, lineHeight: 1.5 }}>
              Voulez-vous vraiment supprimer le type <strong style={{ color: 'var(--txt)' }}>&laquo;&nbsp;{deleteConfirm.label}&nbsp;&raquo;</strong> de la base de données ?
              <br /><span style={{ fontSize: 11, color: 'var(--txt3)' }}>Cette action est irréversible.</span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--card)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={() => { handleDeleteType(deleteConfirm.value, deleteConfirm.id); setDeleteConfirm(null); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    </div>
  );
}
