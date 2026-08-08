'use client';

import { useState, useEffect } from 'react';
import { creerPrescriptionSurveillance, getPrescriptionsPatient, updateStatutPrescription } from '@/features/prescription/lib/api';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import ValidationPopup from './ValidationPopup';

interface SvItem {
  id: string; parametre: string; parametreLabel: string; customNom: string; customDesc: string;
  customUnite: string; customTarget: string; taille: string; sngTypes: string[]; sngRemarques: string;
  drainLocalisation: string; drainTypes: string[]; frequenceType: string; frequenceValeur: number; dureeJours: number; seuil: string;
}

interface SurveillanceEnCours {
  statut?: string;
  id: string;
  parametres: { parametre: string; frequence: string; duree?: string; seuil?: string }[];
  notifierInfirmier?: boolean;
  prescripteur?: { nom: string };
}

type SvTab = 'nouvelle' | 'encours';

const TABS: { key: SvTab; label: string; icon: string }[] = [
  { key: 'nouvelle', label: 'Nouvelle prescription', icon: 'add' },
  { key: 'encours', label: 'En cours', icon: 'pending_actions' },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: active ? 600 : 500, flexShrink: 0,
  background: active ? 'var(--navy)' : 'var(--inp)',
  color: active ? '#fff' : 'var(--txt2)', transition: 'all .15s',
});

const PARAMS = [
  { group: 'Hémodynamique', options: [
    { value: 'ta', label: 'Tension artérielle (TA)', desc: 'Mesurer TA systolique et diastolique. Alerter si > 160/90 ou < 90/60.' },
    { value: 'fc', label: 'Fréquence cardiaque (FC)', desc: 'Compter le pouls sur 1 minute. Alerter si > 120 ou < 50 bpm.' },
    { value: 'spo2', label: 'Saturation en oxygène (SpO₂)', desc: 'Mesurer avec oxymètre de pouls. Alerter si < 94%.' },
    { value: 'fr', label: 'Fréquence respiratoire (FR)', desc: 'Compter les cycles respiratoires. Alerter si > 25 ou < 10/min.' },
  ]},
  { group: 'Neurologique', options: [
    { value: 'glasgow', label: 'Score de Glasgow', desc: 'Évaluer ouverture yeux, réponse verbale, réponse motrice. Alerter si < 13.' },
    { value: 'eva', label: 'Douleur (EVA 0–10)', desc: 'Évaluation visuelle analogique. Alerter si EVA > 6.' },
  ]},
  { group: 'Métabolique / Biologique', options: [
    { value: 'temp', label: 'Température', desc: 'Mesure axillaire ou tympanique. Alerter si > 38.5°C ou < 36°C.' },
    { value: 'glyc', label: 'Glycémie capillaire', desc: 'Dextro au bout du doigt. Alerter si < 0.6 g/l ou > 2.5 g/l.' },
  ]},
  { group: 'Diurèse / Hydrique', options: [
    { value: 'diur', label: 'Diurèse', desc: 'Mesurer la quantité d\'urines émises. Alerter si < 0.5 ml/kg/h.' },
    { value: 'bilan', label: 'Bilan entrée/sortie', desc: 'Comptabiliser tous les apports (IV, oraux) et les pertes (urines, drain...).' },
    { value: 'poids', label: 'Poids', desc: 'Peser le patient dans les mêmes conditions.' },
    { value: 'perim', label: 'Périmètre abdominal', desc: 'Mesurer à ombilic. Utile pour surveillance ascite ou grossesse.' },
  ]},
  { group: 'Dispositifs médicaux', options: [
    { value: 'sng', label: 'SNG', desc: 'Surveiller la sonde naso-gastrique : résidu, perméabilité, position.' },
    { value: 'drain', label: 'Drain', desc: 'Surveiller le drain : volume, aspect, perméabilité, point d\'insertion.' },
  ]},
  { group: 'Autre', options: [
    { value: 'custom', label: 'Paramètre personnalisé', desc: '' },
  ]},
];

const PARAM_LABEL: Record<string, string> = {}; const PARAM_DESC: Record<string, string> = {}; 
PARAMS.forEach(g => g.options.forEach(o => { PARAM_LABEL[o.value] = o.label; PARAM_DESC[o.value] = o.desc; }));
const SNG_TYPES = ['Résidu gastrique', 'Volume aspiré', 'Aspect', 'Perméabilité', 'Position'];
const DRAIN_TYPES = ['Volume drainé', 'Aspect', 'Perméabilité', 'Point insertion'];


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

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

interface ValidatedPrescription {
  items: SvItem[];
  notifier: boolean;
  notes: string;
  patient: Props["patient"] & { age: number | null; sexeLabel?: string };
  prescripteur: Props["prescripteur"];
  date: string;
}

export default function SurveillanceForm({ patient, prescripteur, patientType }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const [activeTab, setActiveTab] = useState<SvTab>('nouvelle');
  const [urgence, setUrgence] = useState<'NORMAL'|'URGENT'|'TRES_URGENT'>('NORMAL');
  const [alertes, setAlertes] = useState('');
  const [parametre, setParametre] = useState(''); const [customNom, setCustomNom] = useState(''); const [customDesc, setCustomDesc] = useState('');
  const [customUnite, setCustomUnite] = useState(''); const [customTarget, setCustomTarget] = useState(''); const [taille, setTaille] = useState('');
  const [sngTypes, setSngTypes] = useState<string[]>([]); const [sngRemarques, setSngRemarques] = useState('');
  const [drainLocalisation, setDrainLocalisation] = useState(''); const [drainTypes, setDrainTypes] = useState<string[]>([]);
  const [frequenceType, setFrequenceType] = useState(''); const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [seuil, setSeuil] = useState('');
  const [items, setItems] = useState<SvItem[]>([]); const [notifOn, setNotifOn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false); const [toast, setToast] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<SurveillanceEnCours[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validatedPrescription, setValidatedPrescription] = useState<ValidatedPrescription | null>(null);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const isFrequenceRequired = patientType !== 'accueil';
  const isDureeRequired = isFrequenceRequired;

  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;

  const canValidate = items.length > 0;
  const isAddValid = parametre && (!isFrequenceRequired || (frequenceType && dureeJours > 0 && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)));
  const urgenceClasses: Record<string, string> = { NORMAL: "un", URGENT: "uu", TRES_URGENT: "utu" };

  useEffect(() => {
    setPatientId(patient.id);
    async function fetchSurveillances() {
      try {
        const data = await getPrescriptionsPatient('surveillance', patient.id);
        setPrescriptionsEnCours(data.filter((p: SurveillanceEnCours) => p.statut === 'ACTIVE'));
      } catch {}
    }
    fetchSurveillances();
  }, [patient.id, setPatientId]);

  function showToast(msg: string) { setToast(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => setToast(''), 2800); }
  function toggleCheck(list: string[], setList: (v: string[]) => void, val: string) { setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]); }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!parametre) newErrors.parametre = 'Le paramètre est requis';
    if (isFrequenceRequired && !frequenceType) newErrors.frequenceType = 'Le type de fréquence est requis';
    if (isDureeRequired && dureeJours <= 0) newErrors.dureeJours = 'La durée en jours est requise';
    if (isFrequenceRequired && (frequenceType === 'HEURES' || frequenceType === 'PAR_JOUR') && frequenceValeur <= 0) {
      newErrors.frequenceValeur = 'La valeur de fréquence est requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    setItems(prev => [...prev, {
      id: Date.now().toString(), parametre, parametreLabel: parametre === 'custom' ? customNom || 'Paramètre personnalisé' : PARAM_LABEL[parametre] ?? parametre,
      customNom, customDesc, customUnite, customTarget, taille, sngTypes, sngRemarques,
      drainLocalisation, drainTypes, frequenceType, frequenceValeur, dureeJours, seuil
    }]);
    setParametre(''); setCustomNom(''); setCustomDesc(''); setCustomUnite(''); setCustomTarget(''); setTaille('');
    setSngTypes([]); setSngRemarques(''); setDrainLocalisation(''); setDrainTypes([]);
    setFrequenceType(''); setFrequenceValeur(0); setDureeJours(0); setSeuil(''); setErrors({});
  }
  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function refreshPrescriptions() {
    try {
      const data = await getPrescriptionsPatient('surveillance', patient.id);
      setPrescriptionsEnCours(data.filter((p: SurveillanceEnCours) => p.statut === 'ACTIVE'));
    } catch {}
  }

  async function terminerPrescription(id: string) {
    try {
      await updateStatutPrescription('surveillance', id, 'TERMINEE');
      await refreshPrescriptions();
    } catch { console.error('Erreur terminaison'); }
  }

  function getFrequenceText(type: string, valeur: number): string {
    switch (type) {
      case 'HEURES': return `Toutes les ${valeur}h`;
      case 'PAR_JOUR': return `${valeur}× par jour`;
      case 'SOS': return 'Si besoin (SOS)';
      case 'CONTINU': return 'En continu';
      default: return type;
    }
  }


  async function handleSubmit() {
    setShowModal(false);
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        notes,
        notifierInfirmier: notifOn,
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
        parametres: items.map(item => ({
          parametre: item.parametre,
          frequenceType: item.frequenceType,
          frequenceValeur: item.frequenceValeur,
          dureeJours: item.dureeJours,
          seuil: item.seuil
        })),
      };

      const summary = `${items.length} paramètre(s) de surveillance`;
      addToPanier('surveillance', summary, prescriptionData);

      setValidatedPrescription({
        items: [...items],
        notifier: notifOn,
        notes,
        patient: {
          ...patient,
          age,
          sexeLabel,
        },
        prescripteur,
        date: new Date().toLocaleString('fr-FR'),
      });
      setShowValidationModal(true);
      setShowValidationPopup(true);
      setItems([]);
      setNotes('');
      setNotifOn(false);
      setUrgence('NORMAL');
      setAlertes('');
      await refreshPrescriptions();
    } catch {
      setApiError("Erreur lors de l'ajout au panier.");
    } finally {
      setLoading(false);
    }
  }

  const desc = PARAM_DESC[parametre] ?? '';

  return (
    <div>
      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}

      {/* BARRE D'ONGLETS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} style={chipStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            <span className="ms" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
            {t.key === 'encours' && prescriptionsEnCours.length > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {prescriptionsEnCours.length}
              </span>
            )}
            {t.key === 'nouvelle' && items.length > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === ONGLET NOUVELLE PRESCRIPTION === */}
      {activeTab === 'nouvelle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          {/* COLONNE GAUCHE */}
          <div>
            <div className="card mb12" style={{ padding: 12 }}>
              <div className="mb12">
                <label className="lbl">Paramètre à surveiller <span className="req">*</span></label>
                <select value={parametre} onChange={e => { setParametre(e.target.value); if (errors.parametre) setErrors({...errors, parametre: ''}); }} style={errors.parametre ? { borderColor: 'var(--red)' } : {}}>
                  <option value="">Sélectionner un paramètre</option>
                  {PARAMS.map(g => <optgroup key={g.group} label={g.group}>{g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>)}
                </select>
                {errors.parametre && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.parametre}</div>}
              </div>
              {desc && <div style={{ background: 'var(--navy-lt)', border: '1px solid var(--navy)', borderRadius: 9, padding: 11, marginBottom: 12, fontSize: 12, color: 'var(--navy)' }}>{desc}</div>}
              {parametre === 'custom' && (
                <div>
                  <div className="mb12"><label className="lbl">Nom du paramètre <span className="req">*</span></label><input type="text" value={customNom} onChange={e => setCustomNom(e.target.value)} placeholder="Nom du paramètre à surveiller..." /></div>
                  <div className="mb12"><label className="lbl">Description</label><input type="text" value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Décrire ce qui doit être surveillé..." /></div>
                  <div className="g2 mb12"><div><label className="lbl">Unité de mesure</label><input type="text" value={customUnite} onChange={e => setCustomUnite(e.target.value)} placeholder="Ex : ml, cm, mmHg..." /></div><div><label className="lbl">Valeurs normales</label><input type="text" value={customTarget} onChange={e => setCustomTarget(e.target.value)} placeholder="Plage de valeurs normales..." /></div></div>
                </div>
              )}
              {parametre === 'sng' && (
                <div className="mb12"><label className="lbl">Type de surveillance SNG</label><div className="g2 mb8">{SNG_TYPES.map(t => <label key={t} className="rc"><input type="checkbox" checked={sngTypes.includes(t)} onChange={() => toggleCheck(sngTypes, setSngTypes, t)} style={{ accentColor: 'var(--navy)' }} /><span>{t}</span></label>)}</div>
                  <label className="lbl">Remarques</label><input type="text" value={sngRemarques} onChange={e => setSngRemarques(e.target.value)} placeholder="Ex : sonde CH 14..." /></div>
              )}
              {parametre === 'drain' && (
                <div className="mb12"><label className="lbl">Localisation du drain</label><input type="text" value={drainLocalisation} onChange={e => setDrainLocalisation(e.target.value)} placeholder="Ex : drain de Redon fosse iliaque droite..." className="mb12" />
                  <label className="lbl">Type de surveillance drain</label><div className="g2">{DRAIN_TYPES.map(t => <label key={t} className="rc"><input type="checkbox" checked={drainTypes.includes(t)} onChange={() => toggleCheck(drainTypes, setDrainTypes, t)} style={{ accentColor: 'var(--navy)' }} /><span>{t}</span></label>)}</div>
                </div>
              )}
              <div className="mb12" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="lbl">Type de fréquence {isFrequenceRequired ? <span className="req">*</span> : <span className="opt">(optionnel)</span>}</label>
                  <select value={frequenceType} onChange={e => { setFrequenceType(e.target.value); if (errors.frequenceType) setErrors({...errors, frequenceType: ''}); }} style={errors.frequenceType ? { borderColor: 'var(--red)' } : {}}>
                    <option value="">Sélectionner</option>
                    <option value="HEURES">Toutes les X heures</option>
                    <option value="PAR_JOUR">X fois par jour</option>
                    <option value="SOS">Si besoin (SOS)</option>
                    <option value="CONTINU">En continu</option>
                  </select>
                  {errors.frequenceType && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequenceType}</div>}
                </div>
                {(frequenceType === 'HEURES' || frequenceType === 'PAR_JOUR') && (
                  <div style={{ flex: 1 }}>
                    <label className="lbl">Valeur <span className="req">*</span></label>
                    <input type="number" min={1} value={frequenceValeur || ''} onChange={e => { setFrequenceValeur(parseInt(e.target.value) || 0); if (errors.frequenceValeur) setErrors({...errors, frequenceValeur: ''}); }} placeholder={frequenceType === 'HEURES' ? 'Ex : 8h' : 'Ex : 3x'} style={errors.frequenceValeur ? { borderColor: 'var(--red)' } : {}} />
                    {errors.frequenceValeur && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequenceValeur}</div>}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label className="lbl">Durée (jours) {isDureeRequired ? <span className="req">*</span> : <span className="opt">(optionnel)</span>}</label>
                  <input type="number" min={1} value={dureeJours || ''} onChange={e => { setDureeJours(parseInt(e.target.value) || 0); if (errors.dureeJours) setErrors({...errors, dureeJours: ''}); }} placeholder="Ex : 7" style={errors.dureeJours ? { borderColor: 'var(--red)' } : {}} />
                  {errors.dureeJours && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.dureeJours}</div>}
                </div>
              </div>
              <div className="mb12"><label className="lbl">Valeurs cibles / Seuils d&apos;alerte</label><input type="text" value={seuil} onChange={e => setSeuil(e.target.value)} placeholder="Ex : TA > 160/90 → alerter médecin..." /></div>
              <button className="badd" onClick={handleAdd} style={{ opacity: isAddValid ? 1 : 0.5 }}><span className="ms" style={{ fontSize: 17 }}>add</span> Ajouter la surveillance</button>
            </div>

            <div className="sh">Surveillances ajoutées</div>
            <div className="mb12">
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune surveillance ajoutée</div>
              ) : items.map(item => (
                <div key={item.id} className="rxi"><div className="rxi-ic"><span className="ms">monitor_heart</span></div><div className="rxi-m"><h4>{item.parametreLabel}</h4><p>{getFrequenceText(item.frequenceType, item.frequenceValeur)}{item.dureeJours && ` · ${item.dureeJours} jours`}</p>{item.seuil && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.seuil}</p>}</div><button className="bdel" onClick={() => handleDelete(item.id)}><span className="ms">delete</span></button></div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE — sticky */}
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 8 }}>
              <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
              <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
                <div className="urgd" />
                <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as 'NORMAL'|'URGENT'|'TRES_URGENT')}>
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                  <option value="TRES_URGENT">Très urgent</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span className="ms" style={{ fontSize: 16, color: "var(--red)" }}>warning</span>
                <span className="lbl" style={{ margin: 0 }}>Précautions &amp; Alertes</span>
              </div>
              <textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)}
                placeholder="Allergies, contre-indications..."
                style={{ background: "var(--red-lt)", border: "1.5px solid var(--red-bdr)", padding: '8px 12px' }} />
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
              <label className="lbl">Notes complémentaires</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions supplémentaires pour l'équipe..." />
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div className="togr">
                <div className="togr-l"><p>Notifier les infirmiers</p><span>Notifier uniquement les infirmiers du service concerné</span></div>
                <label className="tog"><input type="checkbox" checked={notifOn} onChange={e => setNotifOn(e.target.checked)}/><span className="tog-t"></span></label>
              </div>
              {notifOn && <div className="hint"><span className="ms" style={{ fontSize: 13, verticalAlign: 'middle', color: 'var(--navy)' }}>notifications_active</span> Notification envoyée aux infirmiers de garde du service.</div>}
            </div>

            {!canValidate && (
              <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
                Ajoutez au moins une surveillance.
              </div>
            )}
            <button className="bp" onClick={() => setShowModal(true)}
              style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none", marginTop: 0 }}>
              <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider"}
            </button>
          </div>
        </div>
      )}

      {/* === ONGLET PRESCRIPTIONS EN COURS === */}
      {activeTab === 'encours' && (
        <div style={{ maxWidth: 700 }}>
          <div className="active-rx">
            <div className="active-rx-header"><span className="ms">pending_actions</span><span>Surveillances en cours</span></div>
            {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {p.parametres?.map((param, idx) => (
                  <div key={`${p.id}-${idx}`} className="active-rx-item">
                    <strong>{PARAM_LABEL[param.parametre] || param.parametre}</strong>
                    <span> — {param.frequence}{param.duree ? ` · ${param.duree}` : ''}{param.seuil ? ` (seuil: ${param.seuil})` : ''}{p.prescripteur?.nom ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
                    {p.notifierInfirmier && <span style={{ display: 'block', fontSize: 10, color: 'var(--navy)', marginTop: 2 }}>Infirmier notifié</span>}
                  </div>
                ))}
                <button
                  onClick={() => terminerPrescription(p.id)}
                  title="Terminer cette prescription"
                  style={{
                    position: 'absolute', right: 4, top: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--txt3)', fontSize: 16, lineHeight: 1,
                  }}
                >
                  <span className="ms">check_circle</span>
                </button>
              </div>
            )) : (
              <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune surveillance en cours</span></div>
            )}
          </div>
        </div>
      )}

      {/* MODALES */}
      {showModal && <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}><div className="mbox"><h3>Valider — Surveillance</h3><p>La prescription sera validée et transmise.</p><div className="mbtns"><button className="bca" onClick={() => setShowModal(false)}>Annuler</button><button className="bok" onClick={handleSubmit}>Confirmer</button></div></div></div>}

      {showValidationModal && validatedPrescription && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="mbox" style={{ maxWidth: 600, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="ms" style={{ fontSize: 24 }}>check_circle</span>
              <div>
                <h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Prescription de surveillance validée</h3>
                <p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--navy-lt)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ fontSize: 22, color: '#fff' }}>person</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Patient</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{validatedPrescription.patient.prenom} {validatedPrescription.patient.nom}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--txt2)' }}>
                  {validatedPrescription.patient.sexe && <span><strong>Sexe:</strong> {validatedPrescription.patient.sexe === 'M' ? 'Masculin' : validatedPrescription.patient.sexe === 'F' ? 'Féminin' : validatedPrescription.patient.sexe}</span>}
                  {validatedPrescription.patient.age && <span><strong>Âge:</strong> {validatedPrescription.patient.age} ans</span>}
                  {validatedPrescription.patient.groupeSanguin && <span><strong>Groupe sanguin:</strong> {validatedPrescription.patient.groupeSanguin}</span>}
                </div>
                {validatedPrescription.patient.allergies && validatedPrescription.patient.allergies.length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ms" style={{ fontSize: 14 }}>warning</span>
                    <strong>Allergies:</strong> {validatedPrescription.patient.allergies.join(', ')}
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="ms" style={{ fontSize: 22, color: '#fff' }}>medical_services</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Prescripteur</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>Dr {validatedPrescription.prescripteur.prenom} {validatedPrescription.prescripteur.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.prescripteur.service || 'Service non spécifié'}</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 12 }}>Paramètres de surveillance</div>
                {validatedPrescription.items.map((item: SvItem, idx: number) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--navy)' }}>monitor_heart</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{PARAM_LABEL[item.parametre] || item.parametreLabel}</div>
                      <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>
                        Fréquence: <strong>{getFrequenceText(item.frequenceType, item.frequenceValeur)}</strong> · Durée: <strong>{item.dureeJours} jours</strong>
                      </div>
                      {item.seuil && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>Seuil d&apos;alerte: {item.seuil}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {validatedPrescription.notes && (
                <div style={{ background: 'var(--navy-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--navy)', marginBottom: 6 }}>Notes complémentaires</div>
                  <div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.notes}</div>
                </div>
              )}

              {validatedPrescription.notifier && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="ms" style={{ fontSize: 20, color: '#16a34a' }}>check_circle</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Infirmiers notifiés</div>
                    <div style={{ fontSize: 11, color: '#15803d' }}>Notification envoyée au service clinique</div>
                  </div>
                </div>
              )}

              <div className="mbtns" style={{ marginTop: 20 }}>
                <button className="bok" onClick={() => setShowValidationModal(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { setActiveTab('nouvelle'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onSendAll={async () => {
          setIsSending(true);
          try { await sendAll(patient.id); } catch {} finally { setIsSending(false); }
        }}
        isSending={isSending}
      />

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
