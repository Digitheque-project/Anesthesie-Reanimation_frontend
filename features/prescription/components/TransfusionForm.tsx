"use client";
import { useState, useEffect } from 'react';

import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import ValidationPopup from './ValidationPopup';

type Urgence = "NORMAL" | "URGENT" | "TRES_URGENT";
type ProduitSanguin = "sang-total" | "cgr" | "pfc" | "prp";
const urgenceClasses: Record<Urgence, string> = { NORMAL: "un", URGENT: "uu", TRES_URGENT: "utu" };

interface Produit {
  id: string;
  produit: ProduitSanguin;
  quantite: string;
  datePrevue: string;
  plaquettes: string;
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
    patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
  };
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string };
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}


export default function TransfusionForm({ patient, prescripteur }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [alertes, setAlertes] = useState('');
  const [renseignements, setRenseignements] = useState('');
  const [atcd, setAtcd] = useState(false);
  const [incident, setIncident] = useState('');
  const [groupage, setGroupage] = useState('');
  const [hb, setHb] = useState('');
  const [produits, setProduits] = useState<Produit[]>([{ id: '1', produit: 'cgr', quantite: '', datePrevue: '', plaquettes: '' }]);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const age = calcAge(patient?.dateNaissance);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const isFormValid = renseignements.trim() && groupage && produits.length > 0 && produits.every(p => p.produit && p.quantite.trim());

  useEffect(() => {
    setPatientId(patient.id);
  }, [patient.id, setPatientId]);
  
  function showToast(msg: string) { setToast(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => setToast(''), 2800); }

  function addProduit() {
    setProduits([...produits, { id: Date.now().toString(), produit: 'cgr', quantite: '', datePrevue: '', plaquettes: '' }]);
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
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
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

      setShowValidationPopup(true);
      // reset
      setUrgence("NORMAL"); setAlertes(''); setRenseignements(''); setAtcd(false); setIncident('');
      setGroupage(''); setHb(''); setProduits([{ id: '1', produit: 'cgr', quantite: '', datePrevue: '', plaquettes: '' }]);
      setNotes('');
    } catch {
      setApiError("Erreur lors de l'envoi de la prescription transfusion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* COLONNE GAUCHE */}
        <div className="card" style={{ padding: 12 }}>
          <div className="mb12"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={3} placeholder="Pathologie, contexte, motif de la transfusion..." value={renseignements} onChange={e => setRenseignements(e.target.value)} /></div>
          <div className="mb12"><label className="lbl">Groupage sanguin <span className="req">*</span></label><select value={groupage} onChange={e => setGroupage(e.target.value)}><option value="">— Sélectionner —</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}</select></div>
          <div className="mb12"><label className="lbl">Hémoglobine — Hb (g/l)</label><input type="number" min={0} step={0.1} placeholder="Ex : 7.5" value={hb} onChange={e => setHb(e.target.value)} /></div>
          
          {/* Produits sanguins */}
          <div className="mb12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="lbl">Produits sanguins <span className="req">*</span></label>
              <button onClick={addProduit} style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>+ Ajouter</button>
            </div>
            {produits.map((p, idx) => (
              <div key={p.id} style={{ background: '#f8fafc', border: '1px solid var(--bdr)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                {produits.length > 1 && (
                  <button onClick={() => removeProduit(p.id)} style={{ float: 'right', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>×</button>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', marginBottom: 6 }}>Produit #{idx + 1}</div>
                <div className="mb8"><label className="lbl">Type de produit <span className="req">*</span></label><div className="g2" style={{ gap: 7 }}>{[{ value: 'sang-total', label: 'Sang total' },{ value: 'cgr', label: 'Culot globulaire (CGR)' },{ value: 'pfc', label: 'Plasma frais-congelé (PFC)' },{ value: 'prp', label: 'Plasma riche en plaquettes (PRP)' }].map(prod => <label key={prod.value} className="rc"><input type="radio" name={`prod-${p.id}`} checked={p.produit === prod.value} onChange={() => updateProduit(p.id, 'produit', prod.value)} /><span>{prod.label}</span></label>)}</div></div>
                {p.produit === 'prp' && <div className="mb8"><label className="lbl">Nombre de plaquettes (G/l) <span className="req">*</span></label><input type="number" min={0} placeholder="Nombre de plaquettes en G/l" value={p.plaquettes} onChange={e => updateProduit(p.id, 'plaquettes', e.target.value)} /></div>}
                <div className="g2 mb8"><div><label className="lbl">Quantité <span className="req">*</span></label><input type="text" placeholder="Ex : 2 unités, 250 ml..." value={p.quantite} onChange={e => updateProduit(p.id, 'quantite', e.target.value)} /></div><div><label className="lbl">Date prévue</label><input type="date" value={p.datePrevue} onChange={e => updateProduit(p.id, 'datePrevue', e.target.value)} /></div></div>
              </div>
            ))}
          </div>
          
          <label className="lbl">Remarques / Notes</label><textarea rows={2} placeholder="Notes complémentaires pour le dépôt de sang..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* COLONNE DROITE — sticky */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 8 }}>
            <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
            <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
              <div className="urgd" /><select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="TRES_URGENT">Très urgent</option></select>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="ms" style={{ fontSize: 16, color: 'var(--red)' }}>warning</span><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Alertes</span></div>
            <textarea style={{ background: 'var(--red-lt)', border: '1.5px dashed var(--red-bdr)', borderRadius: 10, padding: '8px 12px', fontSize: 14, width: '100%', resize: 'none' }} rows={1} placeholder="Contre-indications..." value={alertes} onChange={e => setAlertes(e.target.value)} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="togr">
              <div className="togr-l"><p>Antécédent de transfusion</p><span>Le patient a-t-il déjà reçu des produits sanguins ?</span></div>
              <label className="tog"><input type="checkbox" checked={atcd} onChange={e => setAtcd(e.target.checked)}/><span className="tog-t"></span></label>
            </div>
            {atcd && <div style={{ marginTop: 10 }}><label className="lbl">Incident transfusionnel <span className="req">*</span></label><textarea rows={2} placeholder="Décrire l'incident..." value={incident} onChange={e => setIncident(e.target.value)} /></div>}
          </div>
          <button className="bp" onClick={handleSubmit} disabled={!isFormValid || loading} style={{ opacity: isFormValid && !loading ? 1 : 0.5, marginTop: 0 }}
>
  <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider"}
</button>
        </div>
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>La prescription sera transmise automatiquement au service dépôt de sang après validation</p>

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onSendAll={async () => {
          setIsSending(true);
          try { await sendAll(patient.id); setToast("Prescriptions envoyées avec succès"); } catch (e: any) { setApiError(e?.message || "Erreur lors de l'envoi"); } finally { setIsSending(false); }
        }}
        isSending={isSending}
      />

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
