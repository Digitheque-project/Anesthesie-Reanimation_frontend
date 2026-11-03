"use client";
import { useState, useEffect, useRef, startTransition } from 'react';

import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import ValidationPopup from './ValidationPopup';
import DrawerPanel from './DrawerPanel';
import { Patient, Prescripteur, Urgence, urgenceClasses } from './types';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { fetchTypesProduitTransfusion, addTypeProduitTransfusion } from '@/features/prescription/lib/api';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Icone } from '@/components/ui/Icone';

const PRODUITS_SANGUINS: { value: string; label: string }[] = [
  { value: 'sang-total', label: 'Sang total' },
  { value: 'cgr', label: 'Culot globulaire (CGR)' },
  { value: 'pfc', label: 'Plasma frais-congelé (PFC)' },
  { value: 'prp', label: 'Plasma riche en plaquettes (PRP)' },
];

const PRODUIT_LABELS: Record<string, string> = Object.fromEntries(PRODUITS_SANGUINS.map(p => [p.value, p.label]));

interface Produit {
  id: string;
  produit: string;
  quantite: string;
  datePrevue: string;
  plaquettes: string;
}

interface TransfusionDraftData {
  urgence: string;
  alertes: string;
  renseignements: string;
  atcd: boolean;
  incident: string;
  groupage: string;
  hb: string;
  produits: Produit[];
  notes: string;
}

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
}


export default function TransfusionForm({ patient, prescripteur }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceId = (user?.services as any[])?.[0]?.serviceId;
  const [urgence, setUrgence] = useState<Urgence>('NORMAL');
  const [alertes, setAlertes] = useState('');
  const [renseignements, setRenseignements] = useState('');
  const [atcd, setAtcd] = useState(false);
  const [incident, setIncident] = useState('');
  const [groupage, setGroupage] = useState('');
  const [hb, setHb] = useState('');
  const [produits, setProduits] = useState<Produit[]>([{ id: '1', produit: '', quantite: '', datePrevue: '', plaquettes: '' }]);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);
  const [drawerSelected, setDrawerSelected] = useState<string[]>([]);
  const [customTypes, setCustomTypes] = useState<{ id: string; valeur: string }[]>([]);
  const [autreValue, setAutreValue] = useState('');

  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [, setDraftRestored] = useState(false);
  const [, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  const isFormValid = renseignements.trim() && groupage && produits.length > 0 && produits.every(p => p.produit && p.quantite.trim());

  const { clearDraft } = useDraftPersistence<TransfusionDraftData>(
    `draft:transfusion:${patient.id}`,
    { urgence, alertes, renseignements, atcd, incident, groupage, hb, produits, notes },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:transfusion:${patient.id}`;
      const draftData = loadDraft<TransfusionDraftData>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence) setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.renseignements) setRenseignements(draftData.renseignements);
          if (draftData.atcd) setAtcd(draftData.atcd);
          if (draftData.incident) setIncident(draftData.incident);
          if (draftData.groupage) setGroupage(draftData.groupage);
          if (draftData.hb) setHb(draftData.hb);
          if (draftData.produits?.length > 0) setProduits(draftData.produits);
          if (draftData.notes) setNotes(draftData.notes);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
      }
    }
  }, [patient.id, setPatientId]);
  
  useEffect(() => {
    if (showDrawer) {
      fetchTypesProduitTransfusion(chuId, serviceId).then((res: unknown) => {
        if (Array.isArray(res)) setCustomTypes(res);
      }).catch(() => {});
      setAutreValue('');
    }
  }, [showDrawer, chuId, serviceId]);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(''), 2800); }

  function openDrawer(targetId: string | null) {
    setDrawerTargetId(targetId);
    if (targetId) {
      const p = produits.find(pr => pr.id === targetId);
      setDrawerSelected(p?.produit ? [p.produit] : []);
    } else {
      setDrawerSelected([]);
    }
    setShowDrawer(true);
  }

  function toggleDrawerItem(val: string) {
    setDrawerSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function validateDrawer() {
    const newProduits = drawerSelected.map(val => ({
      id: Date.now().toString() + '-' + val,
      produit: val,
      quantite: '',
      datePrevue: '',
      plaquettes: '',
    }));
    if (drawerTargetId) {
      const idx = produits.findIndex(p => p.id === drawerTargetId);
      const updated = [...produits];
      updated.splice(idx, 1, ...newProduits);
      setProduits(updated);
    } else {
      setProduits([...produits, ...newProduits]);
    }
    setShowDrawer(false);
    setDrawerTargetId(null);
    setDrawerSelected([]);
  }

  function removeProduit(id: string) {
    if (produits.length > 1) {
      setProduits(produits.filter(p => p.id !== id));
    }
  }

  function updateProduit(id: string, field: keyof Produit, value: string) {
    setProduits(produits.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError('');
    try {
      const isAccueilService = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        sourceType: isAccueilService ? 'EXTERNE' : 'INTERNE',
        urgence,
        alertes,
        renseignements,
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        atcdTransfusion: atcd,
        incident,
        groupage,
        hb: hb ? parseFloat(hb) : undefined,
        produits: produits.map(p => ({
          produit: p.produit,
          quantite: p.quantite,
          datePrevue: p.datePrevue || undefined,
          plaquettes: p.produit === 'prp' ? p.plaquettes : undefined,
        })),
        notes,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
      };

      const summary = `${produits.length} produit(s) sanguin(s)`;
      addToPanier('transfusion', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setAlertes(''); setRenseignements(''); setAtcd(false); setIncident('');
      setGroupage(''); setHb(''); setProduits([{ id: '1', produit: '', quantite: '', datePrevue: '', plaquettes: '' }]);
      setNotes('');
    } catch {
      setApiError("Erreur lors de l'envoi de la prescription transfusion.");
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
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} placeholder="Pathologie, contexte, motif de la transfusion..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Groupage sanguin <span className="req">*</span></label><select value={groupage} onChange={e => setGroupage(e.target.value)}><option value="">— Sélectionner —</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}</select></div>
          <div className="mb12"><label className="lbl">Hémoglobine — Hb (g/l)</label><input type="number" min={0} step={0.1} placeholder="Ex : 7.5" value={hb} onChange={e => setHb(e.target.value)} /></div>
          
          <div className="mb12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="lbl">Produits sanguins <span className="req">*</span></label>
              {produits.some(p => p.produit) && (
                <button onClick={() => setProduits([{ id: '1', produit: '', quantite: '', datePrevue: '', plaquettes: '' }])} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 600 }}>Retirer tout</button>
              )}
            </div>
            {produits.map((p, idx) => (
              <div 
                key={p.id} 
                style={{ background: 'var(--inp)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 12, marginBottom: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)' }}>Produit #{idx + 1}</div>
                  {produits.length > 1 && (
                    <button className="bdel" onClick={() => removeProduit(p.id)}><Icone nom="delete" /></button>
                  )}
                </div>
                {p.produit ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{PRODUIT_LABELS[p.produit] || p.produit}</span>
                    <button onClick={() => updateProduit(p.id, 'produit', '')} style={{ padding: 4, background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', borderRadius: 6, lineHeight: 1 }}><Icone nom="close" style={{ fontSize: 16 }} /></button>
                  </div>
                ) : (
                  <button onClick={() => openDrawer(p.id)} style={{ background: 'var(--navy-lt)', border: '1.5px dashed var(--navy)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--navy)', fontWeight: 600, width: '100%', marginBottom: 8 }}>
                    <Icone nom="add_circle" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />Choisir le type
                  </button>
                )}
                {p.produit === 'prp' && <div className="mb8"><label className="lbl">Nombre de plaquettes (G/l) <span className="req">*</span></label><input type="number" min={0} placeholder="Nombre de plaquettes en G/l" value={p.plaquettes} onChange={e => updateProduit(p.id, 'plaquettes', e.target.value)} /></div>}
                <div className="g2"><div><label className="lbl">Nombre de poches <span className="req">*</span></label><input type="text" placeholder="Ex : 2 poches, 250 ml..." value={p.quantite} onChange={e => updateProduit(p.id, 'quantite', e.target.value)} /></div><div><label className="lbl">Date prévue</label><input type="date" value={p.datePrevue} onChange={e => updateProduit(p.id, 'datePrevue', e.target.value)} /></div></div>
              </div>
            ))}
          </div>
          
          <label className="lbl">Remarques / Notes</label><textarea rows={2} placeholder="Notes complémentaires pour le dépôt de sang..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence</label>
            <div className={`urgr ${urgenceClasses[urgence] || 'un'}`} style={{ marginBottom: 8 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icone nom="warning" style={{ fontSize: 16, color: 'var(--red)' }} /><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px solid var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} placeholder="Contre-indications..." value={alertes} onChange={e => setAlertes(e.target.value)} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="togr">
              <div className="togr-l"><p>Antécédent de transfusion</p><span>Le patient a-t-il déjà reçu des produits sanguins ?</span></div>
              <label className="tog"><input type="checkbox" checked={atcd} onChange={e => setAtcd(e.target.checked)}/><span className="tog-t"></span></label>
            </div>
            {atcd && <div style={{ marginTop: 10 }}><label className="lbl">Incident transfusionnel</label><textarea rows={2} placeholder="Décrire l'incident éventuel..." value={incident} onChange={e => setIncident(e.target.value)} /></div>}
          </div>
          <button className="bp" onClick={handleSubmit} disabled={!isFormValid || loading} style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }}>
            <Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}
          </button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>La prescription sera transmise automatiquement au service dépôt de sang après validation</p>

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
        title="Types de produits sanguins"
        subtitle="Sélectionnez un ou plusieurs types"
        icon="bloodtype"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => { setShowDrawer(false); setDrawerTargetId(null); setDrawerSelected([]); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--card)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            <button onClick={validateDrawer} disabled={drawerSelected.length === 0} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: drawerSelected.length > 0 ? 'var(--navy)' : 'var(--bdr)', color: drawerSelected.length > 0 ? '#fff' : 'var(--txt3)', cursor: drawerSelected.length > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>Valider</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRODUITS_SANGUINS.map(p => (
            <label key={p.value} className="rc" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={drawerSelected.includes(p.value)} onChange={() => toggleDrawerItem(p.value)} style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
              <span style={{ fontSize: 14 }}>{p.label}</span>
            </label>
          ))}
          {customTypes.map(ct => (
            <label key={ct.id} className="rc" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={drawerSelected.includes(ct.valeur)} onChange={() => toggleDrawerItem(ct.valeur)} style={{ accentColor: 'var(--navy)', width: 16, height: 16 }} />
              <span style={{ fontSize: 14 }}>{ct.valeur}</span>
            </label>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--bdr)', marginTop: 12, paddingTop: 12, display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Ajouter un type personnalisé..."
            value={autreValue}
            onChange={e => setAutreValue(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Enter' && autreValue.trim()) {
                e.preventDefault();
                try {
                  const created = await addTypeProduitTransfusion(autreValue.trim(), prescripteur?.id, chuId, serviceId);
                  setCustomTypes(prev => [...prev, created]);
                  toggleDrawerItem(created.valeur);
                  setAutreValue('');
                } catch {}
              }
            }}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--bdr)', fontSize: 13 }}
          />
          <button
            onClick={async () => {
              if (autreValue.trim()) {
                try {
                  const created = await addTypeProduitTransfusion(autreValue.trim(), prescripteur?.id, chuId, serviceId);
                  setCustomTypes(prev => [...prev, created]);
                  toggleDrawerItem(created.valeur);
                  setAutreValue('');
                } catch {}
              }
            }}
            disabled={!autreValue.trim()}
            style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: autreValue.trim() ? 'var(--navy)' : 'var(--bdr)', color: autreValue.trim() ? '#fff' : 'var(--txt3)', cursor: autreValue.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}
          >+</button>
        </div>
      </DrawerPanel>

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    </div>
  );
}
