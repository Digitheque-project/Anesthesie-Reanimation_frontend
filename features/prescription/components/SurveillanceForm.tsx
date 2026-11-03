'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { getPrescriptionsPatient, getTypesParametreSurveillance, addTypeParametreSurveillance, arreterPlanningItem } from '@/features/prescription/lib/api';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import ValidationPopup from './ValidationPopup';
import DrawerPanel from './DrawerPanel';
import ArretPlanningDialog from './ArretPlanningDialog';
import { Patient, Prescripteur, urgenceClasses } from './types';
import { getFrequenceText } from './medicale/utils';
import { filterExpired } from '@/features/prescription/lib/prescriptionUtils';
import { subscribeSoinsMaj } from '@/features/prescription/platform/soins-realtime';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import ItemNotifierSelector from './ItemNotifierSelector';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Icone } from '@/components/ui/Icone';

interface SvDraftData {
  items: SvItem[];
  notes: string;
  alertes: string;
  urgence: 'NORMAL' | 'URGENT' | 'TRES_URGENT';
}

interface SvItem {
  id: string; parametre: string; parametreLabel: string; customNom: string; customDesc: string;
  customUnite: string; customTarget: string; taille: string; sngTypes: string[]; sngRemarques: string;
  drainLocalisation: string; drainTypes: string[]; frequenceType: string; frequenceValeur: number; dureeJours: number; seuil: string;
  notifierInfirmier?: boolean; serviceNotifId?: string;
}

interface SurveillanceEnCours {
  statut?: string;
  id: string;
  parametres: { id?: string; parametre: string; frequence: string; duree?: string; seuil?: string; notifierInfirmier?: boolean; planningActif?: boolean }[];
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
  fontSize: 13, fontWeight: active ? 600 : 500, flexShrink: 0,
  // Onglets actifs en VERT (couleur d'action de l'ergonomie clinique),
  // et non en navy. Texte vert fonce pour garder un contraste AA sur
  // le vert clair, comme les sous-onglets paracliniques (.psx-subtab).
  background: active ? 'var(--green, #2ECC71)' : 'var(--inp)',
  color: active ? '#103d29' : 'var(--txt2)', transition: 'all .15s',
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
  patient: Patient;
  prescripteur: Prescripteur;
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
}

export default function SurveillanceForm({ patient, prescripteur, patientType }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceId = (user?.services as any[])?.[0]?.serviceId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceName = (user?.services as any[])?.[0]?.serviceName;
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
  const [items, setItems] = useState<SvItem[]>([]); const [notifierInfirmier, setNotifierInfirmier] = useState(false);
  const [serviceNotifId, setServiceNotifId] = useState('');
  const [jno, setJno] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<SurveillanceEnCours[]>([]);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [, setDraftRestored] = useState(false);
  const [, setDraftSavedAt] = useState<Date | null>(null);
  const [showSvDrawer, setShowSvDrawer] = useState(false);
  const [customParams, setCustomParams] = useState<{ valeur: string }[]>([]);
  const [arretCible, setArretCible] = useState<{ kind: 'parametreSurveillance'; id: string; label: string } | null>(null);
  const [arretBusy, setArretBusy] = useState(false);
  const prevPatientIdRef = useRef<string | null>(null);
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const isFrequenceRequired = patientType !== 'accueil';
  const isDureeRequired = isFrequenceRequired && !jno;

  const { clearDraft } = useDraftPersistence<SvDraftData>(
    `draft:surveillance:${patient.id}`,
    { items, notes, alertes, urgence },
    { skip: !patient.id }
  );

  const canValidate = items.length > 0;
  const isAddValid = parametre && (!isFrequenceRequired || (frequenceType && (jno || dureeJours > 0) && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)));

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);

    if (patientChanged) {
      const draftKey = `draft:surveillance:${patient.id}`;
      const draftData = loadDraft<SvDraftData>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const envelope = JSON.parse(raw);
            if (envelope?.savedAt) savedAt = new Date(envelope.savedAt);
          }
        } catch {}
        startTransition(() => {
          setDraftRestored(false);
          setDraftSavedAt(null);
          if (draftData.items?.length > 0) setItems(draftData.items);
          if (draftData.notes) setNotes(draftData.notes);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => {
          setDraftRestored(false);
          setDraftSavedAt(null);
        });
      }
    }

    async function fetchSurveillances() {
      try {
        const data = await getPrescriptionsPatient('surveillance', patient.id);
        setPrescriptionsEnCours(filterExpired(data, 'parametres'));
      } catch {}
    }
    fetchSurveillances();

    async function fetchCustomParams() {
      try {
        const data = await getTypesParametreSurveillance();
        setCustomParams(data);
      } catch {}
    }
    fetchCustomParams();
  }, [patient.id, setPatientId]);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(''), 2800); }
  function toggleCheck(list: string[], setList: (v: string[]) => void, val: string) { setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]); }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!parametre) newErrors.parametre = 'Le paramètre est requis';
    if (isFrequenceRequired && !frequenceType) newErrors.frequenceType = 'Le type de fréquence est requis';
    if (isDureeRequired && dureeJours <= 0) newErrors.dureeJours = 'La durée en jours est requise';
    if (isFrequenceRequired && (frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && frequenceValeur <= 0) {
      newErrors.frequenceValeur = 'La valeur de fréquence est requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    const isCustomBackend = parametre.startsWith('custom_');
    const customName = isCustomBackend ? parametre.replace('custom_', '') : (parametre === 'custom' ? customNom : '');
    setItems(prev => [...prev, {
      id: Date.now().toString(), parametre: isCustomBackend ? 'custom' : parametre, parametreLabel: parametre === 'custom' ? customNom || 'Paramètre personnalisé' : isCustomBackend ? customName : PARAM_LABEL[parametre] ?? parametre,
      customNom: isCustomBackend ? customName : customNom, customDesc, customUnite, customTarget, taille, sngTypes, sngRemarques,
      drainLocalisation, drainTypes, frequenceType, frequenceValeur, dureeJours: jno ? 0 : dureeJours, seuil,
      notifierInfirmier,
      serviceNotifId: notifierInfirmier ? (serviceNotifId || serviceId) : ''
    }]);
    if (parametre === 'custom' && customNom) {
      addTypeParametreSurveillance(customNom, prescripteur?.id, prescripteur?.chuId, prescripteur?.serviceId).then(() => {
        getTypesParametreSurveillance().then(setCustomParams).catch(() => {});
      }).catch(() => {});
    }
    setParametre(''); setCustomNom(''); setCustomDesc(''); setCustomUnite(''); setCustomTarget(''); setTaille('');
    setSngTypes([]); setSngRemarques(''); setDrainLocalisation(''); setDrainTypes([]);
    setFrequenceType(''); setFrequenceValeur(0); setDureeJours(0); setSeuil(''); setErrors({});
    setJno(false);
    setNotifierInfirmier(false);
    setServiceNotifId('');
    setShowSvDrawer(false);
  }
  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  useEffect(() => subscribeSoinsMaj(detail => {
    if (!detail.patientId || detail.patientId === patient.id) void refreshPrescriptions();
  }), [patient.id]);

  async function handleConfirmArret(motif: string) {
    if (!arretCible) return;
    setArretBusy(true);
    try {
      await arreterPlanningItem(arretCible.kind, arretCible.id, prescripteur?.id, motif || undefined);
      setPrescriptionsEnCours(prev => prev.map(p => ({
        ...p,
        parametres: (p.parametres || []).filter(i => i.id !== arretCible.id),
      })).filter(p => (p.parametres?.length ?? 0) > 0));
      setArretCible(null);
      showToast('Surveillance arrêtée');
    } catch {
      setArretCible(null);
      showToast("Erreur lors de l'arrêt");
    } finally {
      setArretBusy(false);
    }
  }

  async function refreshPrescriptions() {
    try {
      const data = await getPrescriptionsPatient('surveillance', patient.id);
      setPrescriptionsEnCours(filterExpired(data, 'parametres'));
    } catch {}
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
        notes,
        notifierInfirmier: items.some(i => i.notifierInfirmier),
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
          seuil: item.seuil,
          notifierInfirmier: item.notifierInfirmier,
          serviceNotifId: item.notifierInfirmier ? item.serviceNotifId : undefined,
        })),
      };

      const summary = `${items.length} paramètre(s) de surveillance`;
      addToPanier('surveillance', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setItems([]);
      setNotes('');
      setNotifierInfirmier(false);
      setServiceNotifId('');
      setJno(false);
      setUrgence('NORMAL');
      setAlertes('');
      await refreshPrescriptions();
    } catch {
      setApiError("Erreur lors de l'ajout au panier.");
    } finally {
      setLoading(false);
    }
  }

  const desc = parametre.startsWith('custom_') ? '' : PARAM_DESC[parametre] ?? '';

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{apiError}</div>}

      {/* BARRE D'ONGLETS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} style={chipStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            <Icone nom={t.icon} style={{ fontSize: 16 }} />
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
            {/* Bouton déclencheur pour ajouter une surveillance */}
            <div className="card mb12" style={{ padding: 12 }}>
              <button
                onClick={() => { setParametre(''); setCustomNom(''); setCustomDesc(''); setCustomUnite(''); setCustomTarget(''); setTaille(''); setSngTypes([]); setSngRemarques(''); setDrainLocalisation(''); setDrainTypes([]); setFrequenceType(''); setFrequenceValeur(0); setDureeJours(0); setSeuil(''); setErrors({}); setJno(false); setNotifierInfirmier(false); setServiceNotifId(''); setShowSvDrawer(true); }}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 10,
                  border: '2px dashed var(--navy-mid)',
                  background: items.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}
              >
                <Icone nom="monitor_heart" style={{ fontSize: 22, color: 'var(--navy)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                    Ajouter un paramètre de surveillance
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {items.length > 0
                      ? `${items.length} paramètre${items.length > 1 ? 's' : ''} ajouté${items.length > 1 ? 's' : ''} — cliquer pour en ajouter un autre`
                      : 'Cliquez pour ouvrir le formulaire d\'ajout'}
                  </div>
                </div>
                <Icone nom={items.length > 0 ? 'add_circle' : 'add_circle'} style={{ fontSize: 18, color: 'var(--navy)', marginLeft: 'auto' }} />
              </button>
            </div>
            <div className="sh">Surveillances ajoutées</div>
            <div className="mb12">
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune surveillance ajoutée</div>
              ) : items.map(item => (
                <div key={item.id} className="rxi"><div className="rxi-ic"><Icone nom="monitor_heart" /></div><div className="rxi-m"><h4>{item.parametreLabel}</h4><p>{getFrequenceText(item.frequenceType, item.frequenceValeur)}{item.dureeJours && ` · ${item.dureeJours} jours`}</p>{item.seuil && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.seuil}</p>}</div><button className="bdel" onClick={() => handleDelete(item.id)}><Icone nom="delete" /></button></div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE — sticky */}
          <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

            {!canValidate && (
              <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
                Ajoutez au moins une surveillance.
              </div>
            )}

            <button className="bp" onClick={handleSubmit}
              style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none", marginTop: 0 }}>
              <Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}
            </button>
          </div>
        </div>
      )}

      {/* DrawerPanel pour le formulaire d'ajout */}
      <DrawerPanel
        isOpen={showSvDrawer}
        onClose={() => setShowSvDrawer(false)}
        title="Ajouter un paramètre de surveillance"
        subtitle={`${items.length} paramètre${items.length > 1 ? 's' : ''} déjà ajouté${items.length > 1 ? 's' : ''}`}
        icon="monitor_heart"
        wide
        footer={
          <button
            className="badd"
            onClick={handleAdd}
            style={{ opacity: isAddValid ? 1 : 0.5, width: '100%' }}
          >
            <Icone nom="add" style={{ fontSize: 16 }} /> Ajouter la surveillance
          </button>
        }
      >
        <div className="card mb12" style={{ padding: 8 }}>
          <label className="lbl">Degré d&apos;urgence <span className="req">*</span></label>
          <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
            <div className="urgd" />
            <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as 'NORMAL'|'URGENT'|'TRES_URGENT')}>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="TRES_URGENT">Très urgent</option>
            </select>
          </div>
        </div>
        <div className="mb12">
          <label className="lbl">Paramètre à surveiller <span className="req">*</span></label>
          <select value={parametre} onChange={e => { setParametre(e.target.value); if (errors.parametre) setErrors({...errors, parametre: ''}); }} style={errors.parametre ? { borderColor: 'var(--red)' } : {}}>
            <option value="">Sélectionner un paramètre</option>
            {PARAMS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                {g.group === 'Autre' && customParams.map(cp => (
                  <option key={`custom-${cp.valeur}`} value={`custom_${cp.valeur}`}>{cp.valeur}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.parametre && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.parametre}</div>}
        </div>
        {desc && <div style={{ background: 'var(--navy-lt)', border: '1px solid var(--navy)', borderRadius: 8, padding: 11, marginBottom: 12, fontSize: 12, color: 'var(--navy)' }}>{desc}</div>}
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
        <div className="mb12">
          {/*
            Grille de frequence : `auto-fit` avec 150px minimum par champ, au lieu
            de trois `flex:1` qui comprimaient le select jusqu'a tronquer
            "Toutes les X heures". La case "Jusqu'a nouvelle ordre" passe sur sa
            propre ligne sous la grille pour ne plus decaler le champ "Duree".
          */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
          <div>
            <label className="lbl">Type de fréquence {isFrequenceRequired ? <span className="req">*</span> : null}</label>
            <select value={frequenceType} onChange={e => { setFrequenceType(e.target.value); if (errors.frequenceType) setErrors({...errors, frequenceType: ''}); }} style={errors.frequenceType ? { borderColor: 'var(--red)' } : {}}>
              <option value="">Sélectionner</option>
              <option value="HEURES">Toutes les X heures</option>
              <option value="MINUTES">Toutes les X minutes</option>
              <option value="PAR_JOUR">X fois par jour</option>
              <option value="SOS">Si besoin</option>
              <option value="CONTINU">En continu</option>
            </select>
            {errors.frequenceType && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequenceType}</div>}
          </div>
          {(frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && (
            <div>
              <label className="lbl">Valeur <span className="req">*</span></label>
              <input type="number" min={1} value={frequenceValeur || ''} onChange={e => { setFrequenceValeur(parseInt(e.target.value) || 0); if (errors.frequenceValeur) setErrors({...errors, frequenceValeur: ''}); }} placeholder={frequenceType === 'HEURES' ? 'Ex : 8h' : frequenceType === 'MINUTES' ? 'Ex : 30' : 'Ex : 3x'} style={errors.frequenceValeur ? { borderColor: 'var(--red)' } : {}} />
              {errors.frequenceValeur && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequenceValeur}</div>}
            </div>
          )}
          {!jno && (
            <div>
              <label className="lbl">Durée (jours) {isDureeRequired ? <span className="req">*</span> : null}</label>
              <input type="number" min={1} value={dureeJours || ''} onChange={e => { setDureeJours(parseInt(e.target.value) || 0); if (errors.dureeJours) setErrors({...errors, dureeJours: ''}); }} placeholder="Ex : 7" style={errors.dureeJours ? { borderColor: 'var(--red)' } : {}} />
              {errors.dureeJours && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.dureeJours}</div>}
            </div>
          )}
          </div>
          {['HEURES', 'MINUTES', 'PAR_JOUR'].includes(frequenceType) && (
            <label className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 8, marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={jno} onChange={e => { setJno(e.target.checked); if (errors.dureeJours) setErrors({...errors, dureeJours: ''}); }} /> Jusqu&apos;à nouvelle ordre
            </label>
          )}
        </div>
        <div className="mb12"><label className="lbl">Valeurs cibles / Seuils d&apos;alerte</label><input type="text" value={seuil} onChange={e => setSeuil(e.target.value)} placeholder="Ex : TA > 160/90 → alerter médecin..." /></div>
        <ItemNotifierSelector
          notifier={notifierInfirmier}
          setNotifier={setNotifierInfirmier}
          serviceNotifId={serviceNotifId}
          setServiceNotifId={setServiceNotifId}
          defaultServiceId={serviceId}
          serviceName={serviceName}
          chuId={chuId}
        />
      </DrawerPanel>

      {/* === ONGLET PRESCRIPTIONS EN COURS === */}
      {activeTab === 'encours' && (
        <div style={{ maxWidth: 700 }}>
          <div className="active-rx">
            <div className="active-rx-header"><Icone nom="pending_actions" /><span>Surveillances en cours</span></div>
            {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {p.parametres?.map((param, idx) => (
                  <div key={`${p.id}-${idx}`} className="active-rx-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{PARAM_LABEL[param.parametre] || param.parametre}</strong>
                      <span> — {param.frequence}{param.duree ? ` · ${param.duree}` : ''}{param.seuil ? ` (seuil: ${param.seuil})` : ''}{p.prescripteur?.nom ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
                      {param.notifierInfirmier && <span style={{ display: 'block', fontSize: 10, color: 'var(--navy)', marginTop: 2 }}>Infirmier notifié</span>}
                    </div>
                    {/* Le bouton "Arreter" etait imbrique DANS le bloc de texte
                        (flex: 1), il s'affichait donc sous le libelle. Il est
                        maintenant frere de ce bloc, pousse a droite de la carte
                        par marginLeft: auto et centre verticalement. */}
                    {param.planningActif !== false && (
                      <button
                        onClick={() => setArretCible({ kind: 'parametreSurveillance', id: param.id || '', label: PARAM_LABEL[param.parametre] || param.parametre || '' })}
                        className="btn-stop-prescription"
                        title="Arrêter cette surveillance"
                        style={{
                          background: 'none', border: '1.5px solid var(--red-lt, #fecaca)', color: 'var(--red)',
                          fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '4px 8px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          marginLeft: 'auto', alignSelf: 'center',
                        }}>
                        <Icone nom="stop" style={{ fontSize: 14 }} />
                        Arrêter
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )) : (
              <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune surveillance en cours</span></div>
            )}
          </div>
        </div>
      )}

      {/* MODALES */}

      <ArretPlanningDialog
        key={arretCible?.id || 'arret'}
        cible={arretCible}
        busy={arretBusy}
        onClose={() => { if (!arretBusy) setArretCible(null); }}
        onConfirm={handleConfirmArret}
      />

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { setActiveTab('nouvelle'); scrollPrescriptionContentToTop(); }}
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
