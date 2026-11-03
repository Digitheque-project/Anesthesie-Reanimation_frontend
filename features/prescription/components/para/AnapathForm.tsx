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

type AnaTab = "fcv" | "cyto" | "liq" | "bio" | "pos" | "poc" | "ext";

const TABS: { key: AnaTab; label: string }[] = [
  { key: "fcv",  label: "FCV / Pap test" },
  { key: "cyto", label: "Cytoponction" },
  { key: "liq",  label: "Liquide" },
  { key: "bio",  label: "Biopsie" },
  { key: "pos",  label: "POS" },
  { key: "poc",  label: "POC" },
  { key: "ext",  label: "Extemporané" },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: active ? 600 : 500, flexShrink: 0,
  // Onglets actifs en VERT (couleur d'action de l'ergonomie clinique),
  // et non en navy. Texte vert fonce pour garder un contraste AA sur
  // le vert clair, comme les sous-onglets paracliniques (.psx-subtab).
  background: active ? "var(--green, #2ECC71)" : "var(--inp)",
  color: active ? "#103d29" : "var(--txt2)", transition: "all .15s",
});

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
  prescripteur: { id?: string; nom?: string; prenom?: string; service?: string; chuId?: string; serviceId?: string };
}


 interface Demande {
    id: string;
    typeExamen: AnaTab;
    renseignementsCliniques?: string;
    // FCV fields
    fcvGPA?: string; fcvDDR?: string; fcvMeno?: string; fcvMenarche?: string; fcvRapport?: string; fcvContra?: string; fcvTtt?: string; fcvPapLieu?: string; fcvPapNb?: string; fcvPapDate?: string; fcvPapRes?: string; fcvAtcd?: string; fcvNote?: string;
    // Cyto fields
    cytoSiege?: string; cytoOrgane?: string; cytoFix?: string; cytoFixAutre?: string; cytoNotes?: string;
    // Liquide fields
    liqNat?: string; liqNatAutre?: string; liqNotes?: string;
    // Biopsie/POS/POC fields
    bioExamAnt?: string; bioResAnt?: string; bioGPA?: string; bioDDR?: string; bioMeno?: string; bioAtcd?: string; bioDatePrelev?: string; bioFixateur?: string; bioOrgane?: string; bioNature?: string; bioNatureAutre?: string; bioSuspicion?: string; bioFaitA?: string; bioFaitLe?: string; bioNote?: string;
    // Extemporané fields
    extChirurgien?: string; extIntervention?: string; extNature?: string; extOrgane?: string; extQuestion?: string; extDatePrevue?: string; extHeure?: string; extNote?: string;
  }


export default function AnapathForm({ patient, prescripteur }: Props) {
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const [urgence, setUrgence]     = useState<Urgence>("NORMAL");
  const [alertes, setAlertes]     = useState("");
  const [tab, setTab]             = useState<AnaTab>("fcv");
  const [chuId, setChuId] = useState(prescripteur.chuId || "");
  const [serviceId, setServiceId] = useState(prescripteur.serviceId || "");
  const [toast, setToast]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [apiError, setApiError]   = useState("");
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [editingDemandeId, setEditingDemandeId] = useState<string | null>(null);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [showAnapathDrawer, setShowAnapathDrawer] = useState(false);
  const prevPatientIdRef = useRef<string | null>(null);

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  // Current form state - simplified to use single state object per tab
  const todayStr = new Date().toISOString().split('T')[0];
  function defaultFormData(): Record<string, string> {
    return { bioDatePrelev: todayStr, bioFaitLe: todayStr, extDatePrevue: todayStr, fcvMenarche: age != null ? String(age) : "" };
  }

  const [formData, setFormData] = useState<Record<string, string>>(defaultFormData);

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; demandes: Demande[]; formData: Record<string, string> }>(
    `draft:anapath:${patient.id}`,
    { urgence, alertes, demandes, formData },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:anapath:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; demandes: Demande[]; formData: Record<string, string> }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.demandes?.length > 0) setDemandes(draftData.demandes);
          if (draftData.formData && Object.keys(draftData.formData).length > 0) setFormData(draftData.formData);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => { setDraftRestored(false); setDraftSavedAt(null); });
      }
    }
  }, [patient.id, setPatientId]);

  // Helper to get/set form data
  const getFormValue = (key: string) => formData[key] || "";
  const setFormValue = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  function addDemande() {
    const newDemande: Demande = {
      id: Date.now().toString(),
      typeExamen: tab,
      ...formData,
    };
    setDemandes([...demandes, newDemande]);
    setFormData(defaultFormData());
    setShowAnapathDrawer(false);
    showToast("Demande ajoutée");
  }

  function removeDemande(id: string) {
    setDemandes(demandes.filter(d => d.id !== id));
  }

  function editDemande(id: string) {
    const demande = demandes.find(d => d.id === id);
    if (demande) {
      setFormData(demande as Record<string, any>);
      setTab(demande.typeExamen);
      setEditingDemandeId(id);
      setShowAnapathDrawer(true);
    }
  }

  function updateDemande() {
    if (editingDemandeId) {
      setDemandes(demandes.map(d => d.id === editingDemandeId ? { ...d, ...formData, typeExamen: tab } : d));
      setEditingDemandeId(null);
      setShowAnapathDrawer(false);
      setFormData(defaultFormData());
      showToast("Demande mise à jour");
    }
  }

 const isFormValid = (() => {
  if (!getFormValue("renseignementsCliniques")?.trim()) return false;
  if (tab === "fcv")  return true;
  if (tab === "cyto") return !!getFormValue("cytoSiege")?.trim() && !!getFormValue("cytoOrgane")?.trim();
  if (tab === "liq")  return !!getFormValue("liqNat");
  if (tab === "bio" || tab === "pos" || tab === "poc") return !!getFormValue("bioOrgane")?.trim() && !!getFormValue("bioNature");
  if (tab === "ext")  return !!getFormValue("extChirurgien")?.trim() && !!getFormValue("extIntervention")?.trim() && !!getFormValue("extOrgane")?.trim() && !!getFormValue("extQuestion")?.trim() && !!getFormValue("extHeure")?.trim() && !!getFormValue("extDatePrevue")?.trim() && !!getFormValue("extNature")?.trim();
  return false;
})();

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(""), 2800); }

  function buildDemandePayload(): Record<string, unknown> {
    const base = { ...formData };
    if (tab === "fcv") return { ...base, typeExamen: "fcv" };
    if (tab === "cyto") return { ...base, typeExamen: "cyto" };
    if (tab === "liq") return { ...base, typeExamen: "liq" };
    if (tab === "bio") return { ...base, typeExamen: "bio" };
    if (tab === "pos") return { ...base, typeExamen: "pos" };
    if (tab === "poc") return { ...base, typeExamen: "poc" };
    if (tab === "ext") return { ...base, typeExamen: "ext" };
    return base;
  }

  async function handleSubmit() {
    setLoading(true); setApiError("");
    try {
      const payload = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        chuId,
        serviceId,
        demandes: demandes.map(d => buildDemandePayloadFromDemande(d)),
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
      };

      const summary = `${demandes.length} demande(s) anapath`;
      addToPanier('anapath', summary, payload);
      clearDraft();

      setShowValidationPopup(true);
      setAlertes(""); setUrgence("NORMAL"); setDemandes([]); setFormData(defaultFormData());
    } catch { setApiError("Erreur lors de l'ajout au panier."); }
    finally { setLoading(false); }
  }

  function buildDemandePayloadFromDemande(d: Demande): Record<string, unknown> {
    // Les champs specifiques partent dans `data.details` (bag JSON libre
    // declare dans le DTO back -> conserve malgre whitelist: true).
    const details: Record<string, unknown> = {};
    Object.keys(d).forEach(key => {
      if (key !== 'id' && key !== 'typeExamen' && key !== 'renseignementsCliniques' && d[key as keyof Demande]) {
        details[key] = d[key as keyof Demande];
      }
    });
    return {
      typeExamen: d.typeExamen,
      renseignementsCliniques: d.renseignementsCliniques,
      data: {
        renseignementsCliniques: d.renseignementsCliniques,
        details,
      },
    };
  }



  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && <div style={{background:"var(--red-lt)",border:"1px solid var(--red-bdr)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)",marginBottom:12}}>{apiError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
      {/* COLONNE GAUCHE */}
      <div>
        {/* Bouton déclencheur pour ajouter une demande */}
        <div className="card mb12" style={{ padding: 12 }}>
          <button
            onClick={() => { setEditingDemandeId(null); setFormData(defaultFormData()); setShowAnapathDrawer(true); }}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 10,
              border: '2px dashed var(--navy-mid)',
              background: demandes.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.15s',
            }}
          >
            <Icone nom="biotech" style={{ fontSize: 22, color: 'var(--navy)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                Ajouter une demande d'analyse
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                {demandes.length > 0
                  ? `${demandes.length} demande${demandes.length > 1 ? 's' : ''} ajoutée${demandes.length > 1 ? 's' : ''} — cliquer pour en ajouter une autre`
                  : 'Cliquez pour ouvrir le formulaire d\'ajout'}
              </div>
            </div>
            <Icone nom={demandes.length > 0 ? 'add_circle' : 'add_circle'} style={{ fontSize: 18, color: 'var(--navy)', marginLeft: 'auto' }} />
          </button>
        </div>

        {/* Demandes ajoutées list */}
        <div className="card mb12" style={{ padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Demandes ajoutées ({demandes.length})</span>
          </div>
          {demandes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--txt2)', fontStyle: 'italic' }}>Aucune demande ajoutée</div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {demandes.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                    {TABS.find(t => t.key === d.typeExamen)?.label || d.typeExamen}
                    {d.renseignementsCliniques && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--txt3)', marginLeft: 6 }}>
                        — {d.renseignementsCliniques.slice(0, 40)}{d.renseignementsCliniques.length > 40 ? '…' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button className="bedit" onClick={() => editDemande(d.id)}>
                      <Icone nom="edit" />
                    </button>
                    <button className="bdel" onClick={() => removeDemande(d.id)}>
                      <Icone nom="delete" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLONNE DROITE — sticky */}
      <div className="psx-side" style={{ position: 'sticky', top: 16 }}>
        <div className="card mb12" style={{ padding: 10 }}>
          <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
          <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 10 }}>
            <div className="urgd" />
            <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as Urgence)}>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="TRES_URGENT">Très urgent</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Icone nom="warning" style={{ fontSize: 15, color: "var(--red)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--red)' }}>Précautions &amp; Alertes</span>
          </div>
          <textarea rows={2} value={alertes} onChange={e => setAlertes(e.target.value)}
            placeholder="Risque infectieux, précautions particulières..."
            style={{ background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px', boxSizing: 'border-box', width: '100%' }} />
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

        <button className="bp" onClick={handleSubmit}
          style={{ opacity: demandes.length > 0 && !loading ? 1 : 0.5, pointerEvents: demandes.length > 0 && !loading ? "auto" : "none", width: '100%' }}>
          <Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}
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

      {/* DrawerPanel pour le formulaire d'ajout de demande */}
      <DrawerPanel
        isOpen={showAnapathDrawer}
        onClose={() => setShowAnapathDrawer(false)}
        title={editingDemandeId ? "Modifier la demande" : "Ajouter une demande d'analyse"}
        subtitle={editingDemandeId ? undefined : `${demandes.length} demande${demandes.length > 1 ? 's' : ''} déjà ajoutée${demandes.length > 1 ? 's' : ''}`}
        icon="biotech"
        wide
        footer={
          <button
            onClick={editingDemandeId ? updateDemande : addDemande}
            disabled={!isFormValid}
            style={{
              width: '100%',
              background: isFormValid ? 'var(--navy)' : 'var(--bdr)',
              color: isFormValid ? '#fff' : 'var(--txt2)',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: isFormValid ? 'pointer' : 'not-allowed',
            }}
          >
            {editingDemandeId ? 'Mettre à jour' : '+ Ajouter'}
          </button>
        }
      >
        {/* Type d'examen selection */}
        <div style={{ marginBottom: 16 }}>
          <label className="lbl">Type d&apos;examen <span className="req">*</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {TABS.map(t => (
              <button key={t.key} style={chipStyle(tab === t.key)} onClick={() => {
                setTab(t.key);
                if (t.key === "ext") {
                  setUrgence("TRES_URGENT");
                  const n = new Date();
                  setFormValue("extHeure", `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
                }
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* FCV Form — 2 columns */}
        {tab === "fcv" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
                Antécédents
              </div>
              <div className="g2 mb12">
                <div><label className="lbl">G P A</label><input type="text" value={getFormValue("fcvGPA")} onChange={e => setFormValue("fcvGPA", e.target.value)} placeholder="Ex : G3 P2 A1" /></div>
                <div><label className="lbl">DDR</label><input type="date" max={todayStr} value={getFormValue("fcvDDR")} onChange={e => setFormValue("fcvDDR", e.target.value)} /></div>
                <div>
                  <label className="lbl">Ménopause</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {["OUI", "NON"].map(v => (
                      <label key={v} className="rc" style={{ flex: 1 }}>
                        <input type="radio" name="fcv-meno" checked={getFormValue("fcvMeno") === v} onChange={() => setFormValue("fcvMeno", v)} style={{ accentColor: "var(--navy)" }} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div><label className="lbl">Âge de la ménarche</label><input type="text" value={getFormValue("fcvMenarche")} onChange={e => setFormValue("fcvMenarche", e.target.value)} placeholder="Âge (ans)" /></div>
                <div><label className="lbl">Âge du 1er rapport sexuel</label><input type="text" value={getFormValue("fcvRapport")} onChange={e => setFormValue("fcvRapport", e.target.value)} placeholder="Âge (ans)" /></div>
                <div><label className="lbl">Contraception</label><input type="text" value={getFormValue("fcvContra")} onChange={e => setFormValue("fcvContra", e.target.value)} placeholder="Méthode, durée..." /></div>
                <div><label className="lbl">Traitement en cours</label><input type="text" value={getFormValue("fcvTtt")} onChange={e => setFormValue("fcvTtt", e.target.value)} placeholder="Médicaments, posologies..." /></div>
              </div>
              <div className="mb12">
                <label className="lbl">Examens Pap test antérieurs</label>
                <div className="g2 mb8">
                  <input type="text" value={getFormValue("fcvPapLieu")} onChange={e => setFormValue("fcvPapLieu", e.target.value)} placeholder="Lieu" />
                  <input type="text" value={getFormValue("fcvPapNb")} onChange={e => setFormValue("fcvPapNb", e.target.value)} placeholder="Nombre de fois" />
                  <input type="date" max={todayStr} value={getFormValue("fcvPapDate")} onChange={e => setFormValue("fcvPapDate", e.target.value)} />
                  <input type="text" value={getFormValue("fcvPapRes")} onChange={e => setFormValue("fcvPapRes", e.target.value)} placeholder="Résultat" />
                </div>
              </div>
              <div className="mb12"><label className="lbl">Autres antécédents personnels et familiaux</label><textarea rows={2} value={getFormValue("fcvAtcd")} onChange={e => setFormValue("fcvAtcd", e.target.value)} placeholder="Précisez..." /></div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy, #006A8C)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
                Notes & clinique
              </div>
              <div className="mb12"><label className="lbl">Note complémentaire</label><textarea rows={3} value={getFormValue("fcvNote")} onChange={e => setFormValue("fcvNote", e.target.value)} placeholder="Signes cliniques, motif de la demande..." /></div>
              <div className="mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} value={getFormValue("renseignementsCliniques")} onChange={e => setFormValue("renseignementsCliniques", e.target.value)} placeholder="Contexte clinique, suspicion diagnostique..." /></div>
            </div>
          </div>
        )}

        {/* Cyto Form — 2 columns */}
        {tab === "cyto" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
                Prélèvement
              </div>
              <div className="mb12"><label className="lbl">Siège de la ponction <span className="req">*</span></label><input type="text" value={getFormValue("cytoSiege")} onChange={e => setFormValue("cytoSiege", e.target.value)} placeholder="Ex : sein gauche, creux axillaire..." /></div>
              <div className="mb12"><label className="lbl">Organe <span className="req">*</span></label><input type="text" value={getFormValue("cytoOrgane")} onChange={e => setFormValue("cytoOrgane", e.target.value)} placeholder="Ex : thyroïde, ganglion, kyste..." /></div>
              <div className="mb12">
                <label className="lbl">Fixateur</label>
                <div className="g2">
                  {["Cytofixe", "Autre"].map(v => (
                    <label key={v} className="rc">
                      <input type="radio" name="cyto-fix" checked={getFormValue("cytoFix") === v} onChange={() => setFormValue("cytoFix", v)} style={{ accentColor: "var(--navy)" }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {getFormValue("cytoFix") === "Autre" && (
                <div className="mb12"><label className="lbl">Préciser le fixateur</label><input type="text" value={getFormValue("cytoFixAutre")} onChange={e => setFormValue("cytoFixAutre", e.target.value)} placeholder="Nom du fixateur utilisé..." /></div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy, #006A8C)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
                Notes & clinique
              </div>
              <div className="mb12"><label className="lbl">Note complémentaire</label><textarea rows={2} value={getFormValue("cytoNotes")} onChange={e => setFormValue("cytoNotes", e.target.value)} placeholder="Informations supplémentaires pour le pathologiste..." /></div>
              <div className="mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} value={getFormValue("renseignementsCliniques")} onChange={e => setFormValue("renseignementsCliniques", e.target.value)} placeholder="Contexte clinique, suspicion diagnostique..." /></div>
            </div>
          </div>
        )}

        {/* Liquide Form — 2 columns */}
        {tab === "liq" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
                Nature du liquide
              </div>
              <div className="mb12">
                <label className="lbl">Nature du liquide <span className="req">*</span></label>
                <div className="g2">
                  {["Ascite", "Pleural", "Urinaire", "Crachat", "LCR", "Autre"].map(v => (
                    <label key={v} className="rc">
                      <input type="radio" name="liq-nat" checked={getFormValue("liqNat") === v} onChange={() => setFormValue("liqNat", v)} style={{ accentColor: "var(--navy)" }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {getFormValue("liqNat") === "Autre" && (
                <div className="mb12"><label className="lbl">Préciser la nature du liquide <span className="req">*</span></label><input type="text" value={getFormValue("liqNatAutre")} onChange={e => setFormValue("liqNatAutre", e.target.value)} placeholder="Nature du liquide..." /></div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy, #006A8C)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
                Notes & clinique
              </div>
              <div className="mb12"><label className="lbl">Note complémentaire</label><textarea rows={3} value={getFormValue("liqNotes")} onChange={e => setFormValue("liqNotes", e.target.value)} placeholder="Symptômes, antécédents, résultats d'imagerie, volume prélevé, aspect macroscopique..." /></div>
              <div className="mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} value={getFormValue("renseignementsCliniques")} onChange={e => setFormValue("renseignementsCliniques", e.target.value)} placeholder="Contexte clinique, suspicion diagnostique..." /></div>
            </div>
          </div>
        )}

        {/* Biopsie/POS/POC Form — 2 columns */}
        {(tab === "bio" || tab === "pos" || tab === "poc") && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
                Antécédents
              </div>
              <div className="g2 mb12">
                <div><label className="lbl">Examen(s) antérieur(s)</label><input type="text" value={getFormValue("bioExamAnt")} onChange={e => setFormValue("bioExamAnt", e.target.value)} placeholder="Type d&apos;examen" /></div>
                <div><label className="lbl">Résultat(s)</label><input type="text" value={getFormValue("bioResAnt")} onChange={e => setFormValue("bioResAnt", e.target.value)} placeholder="Résultat" /></div>
                <div><label className="lbl">G P A (si applicable)</label><input type="text" value={getFormValue("bioGPA")} onChange={e => setFormValue("bioGPA", e.target.value)} placeholder="Ex : G3 P2 A1" /></div>
                <div><label className="lbl">DDR (si applicable)</label><input type="date" max={todayStr} value={getFormValue("bioDDR")} onChange={e => setFormValue("bioDDR", e.target.value)} /></div>
              </div>
              <div className="mb12">
                <label className="lbl">Ménopause</label>
                <div className="g2">
                  {["OUI", "NON"].map(v => (
                    <label key={v} className="rc">
                      <input type="radio" name="bio-meno" checked={getFormValue("bioMeno") === v} onChange={() => setFormValue("bioMeno", v)} style={{ accentColor: "var(--navy)" }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb12"><label className="lbl">Autres antécédents personnels / familiaux</label><textarea rows={2} value={getFormValue("bioAtcd")} onChange={e => setFormValue("bioAtcd", e.target.value)} placeholder="Précisez..." /></div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy, #006A8C)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
                Prélèvement
              </div>
              <div className="g2 mb12">
                <div><label className="lbl">Date du prélèvement</label><input type="date" max={todayStr} value={getFormValue("bioDatePrelev")} onChange={e => setFormValue("bioDatePrelev", e.target.value)} /></div>
                <div>
                  <label className="lbl">Fixateur</label>
                  <select value={getFormValue("bioFixateur")} onChange={e => setFormValue("bioFixateur", e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {["Formol 10%", "Liquide de Bouin", "Alcool", "Autre"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb12"><label className="lbl">Organe(s) / Site anatomique <span className="req">*</span></label><input type="text" value={getFormValue("bioOrgane")} onChange={e => setFormValue("bioOrgane", e.target.value)} placeholder="Ex : colon sigmoïde, sein droit, col utérin..." /></div>
              <div className="mb12">
                <label className="lbl">Nature du prélèvement <span className="req">*</span></label>
                <div className="g2">
                  {["Biopsie", "Exérèse", "Curage ganglionnaire", "Autre"].map(v => (
                    <label key={v} className="rc">
                      <input type="radio" name="bio-nat" checked={getFormValue("bioNature") === v} onChange={() => setFormValue("bioNature", v)} style={{ accentColor: "var(--navy)" }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {getFormValue("bioNature") === "Autre" && (
                <div className="mb12"><label className="lbl">Préciser la nature <span className="req">*</span></label><input type="text" value={getFormValue("bioNatureAutre")} onChange={e => setFormValue("bioNatureAutre", e.target.value)} placeholder="Préciser..." /></div>
              )}
              <div className="mb12"><label className="lbl">Suspicion diagnostique</label><textarea rows={2} value={getFormValue("bioSuspicion")} onChange={e => setFormValue("bioSuspicion", e.target.value)} placeholder="Hypothèse(s) diagnostique(s)..." /></div>
              <div className="g2 mb12">
                <div><label className="lbl">Fait à</label><input type="text" value={getFormValue("bioFaitA")} onChange={e => setFormValue("bioFaitA", e.target.value)} placeholder="Ville / Établissement" /></div>
                <div><label className="lbl">Le</label><input type="date" max={todayStr} value={getFormValue("bioFaitLe")} onChange={e => setFormValue("bioFaitLe", e.target.value)} /></div>
              </div>
              <div className="mb12"><label className="lbl">Note complémentaire</label><textarea rows={2} value={getFormValue("bioNote")} onChange={e => setFormValue("bioNote", e.target.value)} placeholder="Informations supplémentaires pour le pathologiste..." /></div>
              <div className="mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} value={getFormValue("renseignementsCliniques")} onChange={e => setFormValue("renseignementsCliniques", e.target.value)} placeholder="Contexte clinique, suspicion diagnostique..." /></div>
            </div>
          </div>
        )}

        {/* Extemporané Form — 2 columns */}
        {tab === "ext" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
                Intervention en cours
              </div>
              <div className="mb12"><label className="lbl">Chirurgien en salle <span className="req">*</span></label><input type="text" value={getFormValue("extChirurgien")} onChange={e => setFormValue("extChirurgien", e.target.value)} placeholder="Dr. _______________" /></div>
              <div className="mb12"><label className="lbl">Type d&apos;intervention chirurgicale en cours <span className="req">*</span></label><input type="text" value={getFormValue("extIntervention")} onChange={e => setFormValue("extIntervention", e.target.value)} placeholder="Ex : Thyroïdectomie, résection tumorale côlon, mastectomie..." /></div>
              <div className="mb12"><label className="lbl">Nature du prélèvement <span className="req">*</span></label><input type="text" value={getFormValue("extNature")} onChange={e => setFormValue("extNature", e.target.value)} placeholder="Ex : tissu frais, cytologique, etc." /></div>
              <div className="mb12"><label className="lbl">Organe / Site anatomique prélevé <span className="req">*</span></label><input type="text" value={getFormValue("extOrgane")} onChange={e => setFormValue("extOrgane", e.target.value)} placeholder="Ex : sein gauche, thyroïde, ganglion sentinelle, marge de résection colique..." /></div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--red)', marginBottom: 10, borderLeft: '3px solid var(--red)', paddingLeft: 8 }}>
                Question & planification
              </div>
              <div className="mb12"><label className="lbl">Question clinique posée au pathologiste <span className="req">*</span></label><textarea rows={3} value={getFormValue("extQuestion")} onChange={e => setFormValue("extQuestion", e.target.value)} placeholder="Ex : Marge de résection saine ? Lésion bénigne ou maligne ? Ganglion envahi ? Continuer ou arrêter la résection ?" /><p className="hint">Le pathologiste limite sa réponse à ce qui guide le chirurgien en cours d'intervention (bénin/malin, marge saine/envahie).</p></div>
              <div className="g2 mb12">
                <div>
                  <label className="lbl">Date prévue <span className="req">*</span></label>
                  <input type="date" max={todayStr} value={getFormValue("extDatePrevue")} onChange={e => setFormValue("extDatePrevue", e.target.value)} />
                </div>
                <div>
                  <label className="lbl">Heure de prélèvement <span className="req">*</span></label>
                  <input type="text" value={getFormValue("extHeure")} onChange={e => setFormValue("extHeure", e.target.value)} placeholder="HH:MM"
                    onFocus={e => { if (!e.target.value) { const n = new Date(); setFormValue("extHeure", `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`); }}} />
                </div>
              </div>
              <div className="mb12">
                <label className="lbl">Délai maximal attendu</label>
                <input type="text" readOnly value="30 minutes"
                  style={{ background: "var(--red-lt)", color: "var(--red)", fontWeight: 700, borderColor: "var(--red-bdr)" }} />
              </div>
              <div className="mb12"><label className="lbl">Note complémentaire</label><textarea rows={2} value={getFormValue("extNote")} onChange={e => setFormValue("extNote", e.target.value)} placeholder="Informations supplémentaires pour le pathologiste..." /></div>
              <div className="mb12 rc-field"><label className="lbl">Renseignements cliniques <span className="req">*</span></label><textarea rows={2} value={getFormValue("renseignementsCliniques")} onChange={e => setFormValue("renseignementsCliniques", e.target.value)} placeholder="Contexte clinique, suspicion diagnostique..." /></div>
            </div>
          </div>
        )}
      </DrawerPanel>

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}
    
  </div>
  );
}
