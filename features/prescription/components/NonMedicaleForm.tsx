'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { getPrescriptionsPatient, arreterPlanningItem } from '@/features/prescription/lib/api';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import ValidationPopup from './ValidationPopup';
import DrawerPanel from './DrawerPanel';
import ArretPlanningDialog from './ArretPlanningDialog';
import { Patient, Prescripteur, urgenceClasses } from './types';
import { getFrequenceText, nowDateStr, nowHeureStr } from './medicale/utils';
import { filterExpired } from '@/features/prescription/lib/prescriptionUtils';
import { subscribeSoinsMaj } from '@/features/prescription/platform/soins-realtime';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import AutocompleteInput from './AutocompleteInput';
import ItemNotifierSelector from './ItemNotifierSelector';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { Icone } from '@/components/ui/Icone';

interface NMDraftData {
  items: NMItem[];
  instructions: string;
  urgence: 'NORMAL' | 'URGENT' | 'TRES_URGENT';
}

interface NMItem {
  id: string;
  type: string;
  typeLabel: string;
  description: string;
  dureeJours: number;
  frequenceType: string;
  frequenceValeur: number;
  dateDebut: string;
  heureDebut: string;
  instructions: string;
  notifierInfirmier?: boolean;
  serviceNotifId?: string;
}

interface PrescriptionNonMedEnCours {
  statut?: string;
  id: string;
  items: { id?: string; typeLabel: string; description: string; duree?: string; frequence?: string; dateDebut?: string; planningActif?: boolean }[];
  notifierInfirmier?: boolean;
  prescripteur?: { nom: string };
}

type NMTab = 'nouvelle' | 'encours';

const TABS: { key: NMTab; label: string; icon: string }[] = [
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

const TYPE_OPTIONS = [
  { value: 'regime', label: 'Régime alimentaire' },
  { value: 'mobilisation', label: 'Mobilisation / Positionnement' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'contention', label: 'Contention / Attelle' },
];

const TYPE_LABELS = TYPE_OPTIONS.map(o => o.label);
const TYPE_VALUE_BY_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map(o => [o.label, o.value]));

const TYPE_ICON: Record<string, string> = {
  regime: 'restaurant', mobilisation: 'accessibility_new',
  hygiene: 'soap', contention: 'back_hand',
};

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
}

const TYPES_WITHOUT_FREQUENCE_LABELS = ['Régime alimentaire', 'Contention / Attelle'];
const KNOWN_TYPE_LABELS = TYPE_OPTIONS.map(o => o.label);

function getTypeValue(label: string): string {
  return TYPE_VALUE_BY_LABEL[label] || label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');
}

export default function NonMedicaleForm({ patient, prescripteur, patientType }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceId = (user?.services as any[])?.[0]?.serviceId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceName = (user?.services as any[])?.[0]?.serviceName;
  const [activeTab, setActiveTab] = useState<NMTab>('nouvelle');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [frequenceType, setFrequenceType] = useState('');
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dateDebut, setDateDebut] = useState(nowDateStr);
  const [heureDebut, setHeureDebut] = useState(nowHeureStr);
  const [instructions, setInstructions] = useState('');
  const [urgence, setUrgence] = useState<'NORMAL'|'URGENT'|'TRES_URGENT'>('NORMAL');
  const [items, setItems] = useState<NMItem[]>([]);
  const [notifierInfirmier, setNotifierInfirmier] = useState(false);
  const [serviceNotifId, setServiceNotifId] = useState('');
  const [jno, setJno] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionNonMedEnCours[]>([]);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [, setDraftRestored] = useState(false);
  const [, setDraftSavedAt] = useState<Date | null>(null);
  const [showNMDrawer, setShowNMDrawer] = useState(false);
  const [arretCible, setArretCible] = useState<{ kind: 'itemNonMedical'; id: string; label: string } | null>(null);
  const [arretBusy, setArretBusy] = useState(false);
  const prevPatientIdRef = useRef<string | null>(null);
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;

  const { clearDraft } = useDraftPersistence<NMDraftData>(
    `draft:non-medicale:${patient.id}`,
    { items, instructions, urgence },
    { skip: !patient.id }
  );

  const isKnownType = KNOWN_TYPE_LABELS.includes(type);
  const isFrequenceRequired = isKnownType && !TYPES_WITHOUT_FREQUENCE_LABELS.includes(type) && patientType !== 'accueil';
  const isDureeRequired = isFrequenceRequired && !jno;
  const showFrequence = !TYPES_WITHOUT_FREQUENCE_LABELS.includes(type);

  const canValidate = items.length > 0;
  const isAddValid = type && description.trim() && (!showFrequence || patientType === 'accueil' || ((jno || dureeJours > 0) && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)));


  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);

    if (patientChanged) {
      const draftKey = `draft:non-medicale:${patient.id}`;
      const draftData = loadDraft<NMDraftData>(draftKey);
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
          if (draftData.instructions) setInstructions(draftData.instructions);
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

    async function fetchPrescriptions() {
      try {
        const data = await getPrescriptionsPatient('non-medicale', patient.id);
        setPrescriptionsEnCours(filterExpired(data, 'items'));
      } catch {}
    }
    fetchPrescriptions();
  }, [patient.id, setPatientId]);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(''), 2800); }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = 'Le type est requis';
    if (!description.trim()) newErrors.description = 'La description est requise';
    if (isDureeRequired && dureeJours <= 0) newErrors.dureeJours = 'La durée en jours est requise';
    if (isFrequenceRequired && !frequenceType) newErrors.frequenceType = 'Le type de fréquence est requis';
    if (isFrequenceRequired && (frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && frequenceValeur <= 0) {
      newErrors.frequenceValeur = 'La valeur de fréquence est requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    const typeValue = getTypeValue(type);
    setItems(prev => [...prev, {
      id: Date.now().toString(), type: typeValue, typeLabel: type,
      description: description.trim(), dureeJours: jno ? 0 : dureeJours, frequenceType, frequenceValeur,
      dateDebut, heureDebut, instructions: instructions.trim(),
      notifierInfirmier,
      serviceNotifId: notifierInfirmier ? (serviceNotifId || serviceId) : '',
    }]);
    setType(''); setDescription(''); setDureeJours(0); setFrequenceType(''); setFrequenceValeur(0);
    setDateDebut(nowDateStr); setHeureDebut(nowHeureStr); setInstructions(''); setErrors({});
    setJno(false);
    setNotifierInfirmier(false);
    setServiceNotifId('');
    setShowNMDrawer(false);
  }

  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function refreshPrescriptions() {
    try {
      const data = await getPrescriptionsPatient('non-medicale', patient.id);
      setPrescriptionsEnCours(filterExpired(data, 'items'));
    } catch {}
  }

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
        items: (p.items || []).filter(i => i.id !== arretCible.id),
      })).filter(p => (p.items?.length ?? 0) > 0));
      setArretCible(null);
      showToast('Prescription arrêtée');
    } catch {
      setArretCible(null);
      showToast("Erreur lors de l'arrêt");
    } finally {
      setArretBusy(false);
    }
  }


  async function handleValidate() {
    setLoading(true);
    setApiError('');
    try {
      const isAccueilService = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        sourceType: isAccueilService ? 'EXTERNE' : 'INTERNE',
        urgence,
        notifierInfirmier: items.some(i => i.notifierInfirmier),
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
        items: items.map(item => ({
          type: item.type, typeLabel: item.typeLabel, description: item.description, dureeJours: item.dureeJours, frequenceType: item.frequenceType, frequenceValeur: item.frequenceValeur, dateDebut: item.dateDebut ? new Date(item.dateDebut) : undefined, heureDebut: item.heureDebut || undefined, instructions: item.instructions,
          notifierInfirmier: item.notifierInfirmier,
          serviceNotifId: item.notifierInfirmier ? item.serviceNotifId : undefined,
        })),
      };

      const summary = `${items.length} soin(s) non médicamenteux`;
      addToPanier('non-medicale', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setItems([]);
      setInstructions('');
      setUrgence('NORMAL');
      await refreshPrescriptions();
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
            {/* Bouton déclencheur pour ajouter une prescription */}
            <div className="card mb12" style={{ padding: 12 }}>
              <button
                onClick={() => { setType(''); setDescription(''); setDureeJours(0); setFrequenceType(''); setFrequenceValeur(0); setDateDebut(nowDateStr); setHeureDebut(nowHeureStr); setInstructions(''); setJno(false); setNotifierInfirmier(false); setServiceNotifId(''); setErrors({}); setShowNMDrawer(true); }}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 10,
                  border: '2px dashed var(--navy-mid)',
                  background: items.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}
              >
                <Icone nom="self_care" style={{ fontSize: 22, color: 'var(--navy)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                    Ajouter une prescription non médicamenteuse
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {items.length > 0
                      ? `${items.length} prescription${items.length > 1 ? 's' : ''} ajoutée${items.length > 1 ? 's' : ''} — cliquer pour en ajouter une autre`
                      : 'Cliquez pour ouvrir le formulaire d\'ajout'}
                  </div>
                </div>
                <Icone nom={items.length > 0 ? 'add_circle' : 'add_circle'} style={{ fontSize: 18, color: 'var(--navy)', marginLeft: 'auto' }} />
              </button>
            </div>
            <div className="sh mb12">Prescriptions non médicamenteuses ajoutées</div>
            <div className="mb12">
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune prescription ajoutée</div>
              ) : items.map(item => (
                <div key={item.id} className="rxi">
                  <div className="rxi-ic"><Icone nom={TYPE_ICON[item.type] ?? 'self_care'} /></div>
                  <div className="rxi-m">
                    <h4>{item.typeLabel}</h4><p>{item.description}</p>
                    {item.dureeJours && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.dureeJours} jours{item.frequenceType ? ` · ${getFrequenceText(item.frequenceType, item.frequenceValeur)}` : ''}</p>}
                    {(item.dateDebut || item.heureDebut) && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{item.dateDebut && `Début : ${item.dateDebut}`}{item.heureDebut && ` à ${item.heureDebut}`}</p>}
                    {item.instructions && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{item.instructions}</p>}
                  </div>
                  <button className="bdel" onClick={() => handleDelete(item.id)}><Icone nom="delete" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE — sticky */}
          <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <label className="lbl">Instructions pour l&apos;équipe soignante</label>
              <textarea rows={4} placeholder="Précisions pour l'équipe..." value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>

            {!canValidate && (
              <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
                Ajoutez au moins un soin.
              </div>
            )}
            <button className="bp" onClick={handleValidate}
              style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none" }}>
              <Icone nom="check_circle" />{loading ? "Envoi..." : "Valider"}
            </button>
          </div>
        </div>
      )}

      {/* DrawerPanel pour le formulaire d'ajout */}
      <DrawerPanel
        isOpen={showNMDrawer}
        onClose={() => setShowNMDrawer(false)}
        title="Ajouter une prescription non médicamenteuse"
        subtitle={`${items.length} prescription${items.length > 1 ? 's' : ''} déjà ajoutée${items.length > 1 ? 's' : ''}`}
        icon="self_care"
        footer={
          <button
            className="badd"
            onClick={handleAdd}
            style={{ opacity: isAddValid ? 1 : 0.5, width: '100%' }}
          >
            <Icone nom="add" style={{ fontSize: 16 }} /> Ajouter
          </button>
        }
      >
        <div className="mb12">
          <AutocompleteInput
            label="Type de prescription"
            value={type}
            onChange={v => { setType(v); if (errors.type) setErrors({...errors, type: ''}); }}
            suggestions={TYPE_LABELS}
            storageKey="rx_non_medicale_types"
            placeholder="Rechercher ou saisir un type..."
            required
            error={errors.type}
          />
        </div>
        <div className="mb12">
          <label className="lbl">Description précise <span className="req">*</span></label>
          <input type="text" placeholder="Ex : Régime sans sel strict..." value={description} onChange={e => { setDescription(e.target.value); if (errors.description) setErrors({...errors, description: ''}); }} style={errors.description ? { borderColor: 'var(--red)' } : {}} />
          {errors.description && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.description}</div>}
        </div>
        <div className="mb12">
          <label className="lbl">Degré d&apos;urgence</label>
          <div className={`urgr ${urgenceClasses[urgence]}`} style={{ marginBottom: 8 }}>
            <div className="urgd" />
            <select className="urgs" value={urgence} onChange={e => setUrgence(e.target.value as 'NORMAL'|'URGENT'|'TRES_URGENT')}>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="TRES_URGENT">Très urgent</option>
            </select>
          </div>
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
        {showFrequence && (
          <div className="mb12">
            {/*
              Grille de frequence : `auto-fit` avec 150px minimum par champ, au lieu
              de trois `flex:1` qui comprimaient le select jusqu'a tronquer
              "Toutes les X heures". La case "Jusqu'a nouvelle ordre" passe sur sa
              propre ligne sous la grille pour ne plus decaler le champ "Duree".
            */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label className="lbl">Type de fréquence {isFrequenceRequired && <span className="req">*</span>}</label>
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
                <label className="lbl">Durée (jours) {isDureeRequired && <span className="req">*</span>}</label>
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
        )}
        <div className="g2 mb12">
          <div><label className="lbl">Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} /></div>
          <div><label className="lbl">Heure de début</label><input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} /></div>
        </div>
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
            <div className="active-rx-header"><Icone nom="pending_actions" /><span>Prescriptions en cours</span></div>
            {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {p.items?.map((item, idx) => (
                  <div key={`${p.id}-${idx}`} className="active-rx-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{item.typeLabel}</strong>
                      <span> — {item.description}{item.duree ? ` (${item.duree})` : ''}{item.frequence ? ` · ${item.frequence}` : ''}{p.prescripteur?.nom ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
                      {p.notifierInfirmier && <span style={{ display: 'block', fontSize: 10, color: 'var(--navy)', marginTop: 2 }}>Infirmier notifié</span>}
                    </div>
                    {item.planningActif !== false && item.id && (
                      <button
                        onClick={() => setArretCible({ kind: 'itemNonMedical', id: item.id as string, label: item.typeLabel })}
                        className="btn-stop-prescription"
                        title="Arrêter ce soin"
                        style={{
                          background: 'none', border: '1.5px solid var(--red-lt, #fecaca)', color: 'var(--red)',
                          fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '4px 8px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                        }}>
                        <Icone nom="stop" style={{ fontSize: 14 }} />
                        Arrêter
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )) : (
              <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune prescription en cours</span></div>
            )}
          </div>
        </div>
      )}

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
