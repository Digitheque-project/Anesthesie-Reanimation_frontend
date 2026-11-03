"use client";
import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { usePrescriptionPanier } from "@/features/prescription/contexts/PrescriptionPanierContext";
import ValidationPopup from './ValidationPopup';
import DrawerPanel from './DrawerPanel';
import { Patient, Prescripteur, Urgence, urgenceClasses } from './types';

import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Icone } from '@/components/ui/Icone';

interface Acte {
  id: string;
  libelle: string;
  typeChirurgie: string;
  dateIntervention: string;
  heureIntervention: string;
  dureeHeures: string;
  dureeMinutes: string;
  risqueHemo: string;
  risqueInfectieux: string;
  renseignementsCliniques: string;
  typeAnesthesie: string;
  typeAnesthesieAutre: string;
  intubation: string;
  intubationAutre: string;
  nomChirurgien: string;
  materiels: string;
  positions: string;
}

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
}

const SUGGESTIONS_KEY = "bloc_typeChirurgie_suggestions";

function createEmptyActe(): Acte {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    libelle: "",
    typeChirurgie: "",
    dateIntervention: "",
    heureIntervention: "",
    dureeHeures: "",
    dureeMinutes: "",
    risqueHemo: "",
    risqueInfectieux: "",
    renseignementsCliniques: "",
    typeAnesthesie: "",
    typeAnesthesieAutre: "",
    intubation: "",
    intubationAutre: "",
    nomChirurgien: "",
    materiels: "",
    positions: "",
  };
}

function loadSuggestions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || "[]");
  } catch { return []; }
}

function saveSuggestion(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const list = loadSuggestions();
  if (!list.includes(trimmed)) {
    list.unshift(trimmed);
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list.slice(0, 50)));
  }
}

export default function BlocForm({ patient, prescripteur }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const [urgence, setUrgence] = useState<Urgence>("NORMAL");
  const [alertes, setAlertes] = useState("");
  const [consignes, setConsignes] = useState("");
  const [actes, setActes] = useState<Acte[]>([]);
  const [editingActeId, setEditingActeId] = useState<string | null>(null);
  const [showBlocDrawer, setShowBlocDrawer] = useState(false);
  const [currentActe, setCurrentActe] = useState<Acte>(createEmptyActe());
  const [toast, setToast] = useState("");
  const [highlightedActeId, setHighlightedActeId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const [, setDraftRestored] = useState(false);
  const [, setDraftSavedAt] = useState<Date | null>(null);
  const prevPatientIdRef = useRef<string | null>(null);

  const isFormValid = actes.length > 0 && actes.every(a => a.libelle.trim() !== "");

  const { clearDraft } = useDraftPersistence<{ urgence: string; alertes: string; consignes: string; actes: Acte[] }>(
    `draft:bloc:${patient.id}`,
    { urgence, alertes, consignes, actes },
    { skip: !patient.id }
  );

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    if (patientChanged) {
      const draftKey = `draft:bloc:${patient.id}`;
      const draftData = loadDraft<{ urgence: string; alertes: string; consignes: string; actes: Acte[] }>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try { const raw = localStorage.getItem(draftKey); if (raw) { const e = JSON.parse(raw); if (e?.savedAt) savedAt = new Date(e.savedAt); } } catch {}
        startTransition(() => {
          setDraftRestored(false); setDraftSavedAt(null);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence as Urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.consignes) setConsignes(draftData.consignes);
          if (draftData.actes?.length > 0) setActes(draftData.actes);
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

  function addActe() {
    setEditingActeId(null);
    setCurrentActe(createEmptyActe());
    setShowBlocDrawer(true);
  }

  function removeActe(id: string) {
    setActes(actes.filter(a => a.id !== id));
  }

  function editActe(id: string) {
    const acte = actes.find(a => a.id === id);
    if (acte) {
      setEditingActeId(id);
      setCurrentActe(acte);
      setShowBlocDrawer(true);
    }
  }

  function saveActe() {
    const savedId = editingActeId ?? currentActe.id;
    if (editingActeId) {
      setActes(actes.map(a => a.id === editingActeId ? currentActe : a));
    } else {
      setActes([...actes, currentActe]);
    }
    setShowBlocDrawer(false);
    setEditingActeId(null);
    setCurrentActe(createEmptyActe());

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedActeId(savedId);
    showToast(editingActeId ? 'Intervention mise à jour' : 'Acte chirurgical ajouté');
    highlightTimerRef.current = setTimeout(() => setHighlightedActeId(null), 3000);
  }

  function updateCurrentActe(field: keyof Acte, value: string) {
    setCurrentActe(prev => ({ ...prev, [field]: value }));
  }

  function updateCurrentActeBatch(updates: Partial<Record<keyof Acte, string>>) {
    setCurrentActe(prev => ({ ...prev, ...updates }));
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
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
        actes: actes.map(a => {
          saveSuggestion(a.typeChirurgie);
          return {
            libelle: a.libelle,
            typeChirurgie: a.typeChirurgie || undefined,
            dateIntervention: a.dateIntervention || undefined,
            heureIntervention: a.heureIntervention || undefined,
            dureeHeures: a.dureeHeures ? parseInt(a.dureeHeures) : undefined,
            dureeMinutes: a.dureeMinutes ? parseInt(a.dureeMinutes) : undefined,
            risqueHemorragique: a.risqueHemo || undefined,
            risqueInfectieux: a.risqueInfectieux || undefined,
            renseignementsCliniques: a.renseignementsCliniques || undefined,
            typeAnesthesie: a.typeAnesthesie || undefined,
            typeAnesthesieAutre: a.typeAnesthesieAutre || undefined,
            intubation: a.intubation || undefined,
            intubationAutre: a.intubationAutre || undefined,
            nomChirurgien: a.nomChirurgien || undefined,
            materiels: a.materiels || undefined,
            positions: a.positions || undefined,
          };
        }),
      };

      const summary = `${actes.length} acte(s) chirurgical(aux)`;
      addToPanier('bloc', summary, prescriptionData);
      clearDraft();

      setUrgence("NORMAL");
      setAlertes("");
      setConsignes("");
      setActes([]);
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
            <label className="lbl">Interventions chirurgicales <span className="req">*</span></label>
          </div>

          {/* Bouton déclencheur pour ajouter un acte */}
          <div className="mb12">
            <button
              onClick={addActe}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 10,
                border: '2px dashed var(--navy-mid)',
                background: actes.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.15s',
              }}
            >
              <Icone nom="surgical" style={{ fontSize: 22, color: 'var(--navy)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                  Ajouter une intervention chirurgicale
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {actes.length > 0
                    ? `${actes.length} acte${actes.length > 1 ? 's' : ''} ajouté${actes.length > 1 ? 's' : ''} — cliquer pour en ajouter un autre`
                    : 'Cliquez pour ouvrir le formulaire d\'ajout'}
                </div>
              </div>
              <Icone nom={actes.length > 0 ? 'add_circle' : 'add_circle'} style={{ fontSize: 18, color: 'var(--navy)', marginLeft: 'auto' }} />
            </button>
          </div>

          {/* Liste repliée des actes */}
          {actes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune intervention ajoutée</div>
          ) : (
            actes.map((a, idx) => (
              <div key={a.id} style={{
                background: 'var(--surface-alt)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 12, marginBottom: 8,
                ...(a.id === highlightedActeId ? { border: '1.5px solid #10b981', background: 'rgba(16,185,129,0.08)', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' } : {}),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)' }}>Acte #{idx + 1}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="bedit" onClick={() => editActe(a.id)}><Icone nom="edit" /></button>
                    <button className="bdel" onClick={() => removeActe(a.id)}><Icone nom="delete" /></button>
                  </div>
                </div>
                <div style={{ fontSize: 12 }}>
                  <strong>{a.libelle || 'Acte sans libellé'}</strong>
                  {a.typeChirurgie && <span style={{ color: 'var(--txt3)', marginLeft: 8 }}>· {a.typeChirurgie}</span>}
                  {a.dateIntervention && <span style={{ color: 'var(--txt3)', marginLeft: 8 }}>· {a.dateIntervention}{a.heureIntervention ? ` à ${a.heureIntervention}` : ''}</span>}
                </div>
              </div>
            ))
          )}

          <label className="lbl">Consignes particulières / Matériel spécifique</label>
          <textarea rows={3} value={consignes} onChange={e => setConsignes(e.target.value)} placeholder="Ex : nécessité d'un implant, prothèse, matériel spécifique..." />
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
              placeholder="Allergies connues, anticoagulants, implants, antécédents chirurgicaux importants..."
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
        Cette validation transmet automatiquement une demande de CPA au Professeur anesthésiste
      </p>

      {/* DrawerPanel pour le formulaire d'acte */}
      <DrawerPanel
        isOpen={showBlocDrawer}
        onClose={() => setShowBlocDrawer(false)}
        title={editingActeId ? "Modifier l'intervention" : "Ajouter une intervention chirurgicale"}
        subtitle={editingActeId ? undefined : `${actes.length} acte${actes.length > 1 ? 's' : ''} déjà ajouté${actes.length > 1 ? 's' : ''}`}
        icon="surgical"
        wide
        footer={
          <button
            onClick={saveActe}
            disabled={!currentActe.libelle.trim() || !currentActe.renseignementsCliniques.trim()}
            style={{
              width: '100%',
              background: currentActe.libelle.trim() && currentActe.renseignementsCliniques.trim() ? 'var(--navy)' : 'var(--bdr)',
              color: currentActe.libelle.trim() && currentActe.renseignementsCliniques.trim() ? '#fff' : 'var(--txt2)',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: currentActe.libelle.trim() && currentActe.renseignementsCliniques.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {editingActeId ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          {/* ── Colonne gauche : clinique ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
              Informations cliniques
            </div>

            <div className="mb12">
              <label className="lbl">Acte chirurgical <span className="req">*</span></label>
              <textarea rows={2} placeholder="Décrire précisément l'acte opératoire à réaliser..." value={currentActe.libelle} onChange={e => updateCurrentActe('libelle', e.target.value)} />
            </div>

            <div className="mb12">
              <TypeChirurgieAutocomplete value={currentActe.typeChirurgie} onChange={v => updateCurrentActe('typeChirurgie', v)} />
            </div>

            <div className="mb12 rc-field">
              <label className="lbl">Renseignements cliniques <span className="req">*</span></label>
              <textarea rows={2} placeholder="Contexte clinique spécifique à cet acte..." value={currentActe.renseignementsCliniques} onChange={e => updateCurrentActe('renseignementsCliniques', e.target.value)} />
            </div>

            <div className="mb12">
              <label className="lbl">Type d&apos;anesthésie</label>
              <div className="g3">
                {["Générale", "Locale", "Autre"].map(v => {
                  const val = v === "Générale" ? "GENERALE" : v === "Locale" ? "LOCALE" : "AUTRE";
                  return (
                    <label key={v} className="rc">
                      <input type="radio" name="bloc-anesth" checked={currentActe.typeAnesthesie === val} onChange={() => {
                        if (val !== "GENERALE") {
                          updateCurrentActeBatch({ typeAnesthesie: val, intubation: '', intubationAutre: '' });
                        } else {
                          updateCurrentActe('typeAnesthesie', val);
                        }
                      }} style={{ accentColor: "var(--navy)" }} />
                      <span>{v}</span>
                    </label>
                  );
                })}
              </div>
              {currentActe.typeAnesthesie === "AUTRE" && (
                <div style={{ marginTop: 6 }}>
                  <input type="text" placeholder="Préciser le type d'anesthésie..." value={currentActe.typeAnesthesieAutre} onChange={e => updateCurrentActe('typeAnesthesieAutre', e.target.value)} />
                </div>
              )}
            </div>

            {currentActe.typeAnesthesie === "GENERALE" && (
              <div className="mb12">
                <label className="lbl">Type d&apos;intubation</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: "Naso-trachéale", val: "NASO_TRACHEALE" },
                    { label: "Oro-trachéale", val: "ORO_TRACHEALE" },
                    { label: "Trachéotomie", val: "TRACHEOTOMIE" },
                    { label: "Autre", val: "AUTRE" },
                  ].map(opt => (
                    <label key={opt.val} className="rc" style={{ display: 'flex', gap: 4 }}>
                      <input type="radio" name="bloc-intub" checked={currentActe.intubation === opt.val} onChange={() => updateCurrentActe('intubation', opt.val)} style={{ accentColor: "var(--navy)" }} />
                      <span style={{ fontSize: 12 }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {currentActe.intubation === "AUTRE" && (
                  <div style={{ marginTop: 6 }}>
                    <input type="text" placeholder="Préciser le type d'intubation..." value={currentActe.intubationAutre} onChange={e => updateCurrentActe('intubationAutre', e.target.value)} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Colonne droite : logistique ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
              Planification & logistique
            </div>

            <div className="mb12">
              <label className="lbl">Date et heure prévues</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <input type="date" value={currentActe.dateIntervention} onChange={e => updateCurrentActe('dateIntervention', e.target.value)} />
                </div>
                <Icone nom="schedule" style={{ fontSize: 18, color: 'var(--txt3)' }} />
                <div style={{ flex: 1 }}>
                  <input type="time" value={currentActe.heureIntervention} onChange={e => updateCurrentActe('heureIntervention', e.target.value)} placeholder="Heure" />
                </div>
              </div>
            </div>

            <div className="mb12">
              <label className="lbl">Durée prévue</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input type="number" min="0" max="24" placeholder="Heures" value={currentActe.dureeHeures} onChange={e => updateCurrentActe('dureeHeures', e.target.value)} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--txt3)' }}>h</span>
                <div style={{ flex: 1 }}>
                  <input type="number" min="0" max="59" placeholder="Min" value={currentActe.dureeMinutes} onChange={e => updateCurrentActe('dureeMinutes', e.target.value)} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--txt3)' }}>min</span>
              </div>
            </div>

            <div className="mb12">
              <label className="lbl">Risque hémorragique estimé</label>
              <div className="g3">
                {["Faible", "Modéré", "Élevé"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="bloc-hemo" checked={currentActe.risqueHemo === v} onChange={() => updateCurrentActe('risqueHemo', v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb12">
              <label className="lbl">Risque infectieux estimé</label>
              <div className="g3">
                {["Faible", "Modéré", "Élevé"].map(v => (
                  <label key={v} className="rc">
                    <input type="radio" name="bloc-infect" checked={currentActe.risqueInfectieux === v} onChange={() => updateCurrentActe('risqueInfectieux', v)} style={{ accentColor: "var(--navy)" }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb12">
              <label className="lbl">Nom du chirurgien</label>
              <input type="text" placeholder="Dr. ________________" value={currentActe.nomChirurgien} onChange={e => updateCurrentActe('nomChirurgien', e.target.value)} />
            </div>

            <div className="mb12">
              <label className="lbl">Matériels nécessaires</label>
              <textarea rows={2} placeholder="Bistouri électrique, trocart, prothèse, implant..." value={currentActe.materiels} onChange={e => updateCurrentActe('materiels', e.target.value)} />
            </div>

            <div className="mb12">
              <label className="lbl">Position du patient</label>
              <textarea rows={2} placeholder="Décubitus dorsal, latéral, position lithotomie..." value={currentActe.positions} onChange={e => updateCurrentActe('positions', e.target.value)} />
            </div>
          </div>
        </div>
      </DrawerPanel>

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

/* ---------- TypeChirurgie Autocomplete ---------- */

function TypeChirurgieAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showList, setShowList] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(loadSuggestions());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = useCallback((v: string) => {
    onChange(v);
    if (v.trim()) {
      const lower = v.toLowerCase();
      setFiltered(suggestions.filter(s => s.toLowerCase().includes(lower)));
      setShowList(true);
    } else {
      setFiltered(suggestions.slice(0, 10));
      setShowList(true);
    }
  }, [suggestions, onChange]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setShowList(false);
  }, [onChange]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <label className="lbl">Type de chirurgie</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => {
          setFiltered(value.trim() ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10) : suggestions.slice(0, 10));
          setShowList(true);
        }}
        placeholder="Ex : Laparoscopie, Cœlioscopie, Classique..."
      />
      {showList && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 180, overflowY: 'auto',
          marginTop: 4,
        }}>
          {filtered.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--bdr)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-lt)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
