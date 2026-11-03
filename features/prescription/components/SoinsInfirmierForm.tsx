'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import ValidationPopup from './ValidationPopup';
import ArretPlanningDialog from './ArretPlanningDialog';
import { Patient, Prescripteur, Urgence, urgenceClasses } from './types';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { nowDateStr, nowHeureStr, getDureeText } from './medicale/utils';
import { fetchServicesByChu, getPrescriptionsPatient, arreterPlanningItem } from '@/features/prescription/lib/api';
import { filterExpired } from '@/features/prescription/lib/prescriptionUtils';
import { subscribeSoinsMaj } from '@/features/prescription/platform/soins-realtime';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { gatewayUrl } from "@/features/prescription/platform/gateway";
import { Icone } from '@/components/ui/Icone';

const API_URL = gatewayUrl("/clinique");

interface SIFDraftData {
  items: SIItem[];
  urgence: Urgence;
  alertes: string;
  serviceNotifId: string;
}

interface SIItem {
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
}

interface PrescriptionSIEncours {
  id: string;
  statut?: string;
  items?: { id?: string; type?: string; typeLabel?: string; description?: string; duree?: string; dureeJours?: number; frequence?: string; frequenceType?: string; frequenceValeur?: number; dateDebut?: string; heureDebut?: string; instructions?: string; planningActif?: boolean }[];
  prescripteur?: { nom?: string; prenoms?: string };
  nomMedecinPrescripteur?: string;
  createdAt: string;
  urgence?: string;
  alertes?: string;
}

type SITab = 'nouvelle' | 'encours';

const TABS: { key: SITab; label: string; icon: string }[] = [
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
  { value: 'pansement', label: 'Pansement' },
  { value: 'injection', label: 'Injection' },
  { value: 'perfusion', label: 'Perfusion' },
  { value: 'prise-de-sang', label: 'Prise de sang' },
  { value: 'reeducation', label: 'Rééducation' },
  { value: 'perfusion-veineuse', label: 'Perfusion veineuse' },
  { value: 'sonde', label: 'Pose de sonde' },
  { value: 'position', label: 'Change de position' },
  { value: 'toilette', label: 'Toilette médicalisée' },
];

const TYPE_ICON: Record<string, string> = {
  pansement: 'healing', injection: 'vaccines', perfusion: 'science',
  'prise-de-sang': 'bloodtype', reeducation: 'fitness_center',
  'perfusion-veineuse': 'water_drop', sonde: 'medical_services', position: 'swap_vert',
  toilette: 'shower',
};

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
}

const TYPES_WITHOUT_FREQUENCE = ['position'];

export default function SoinsInfirmierForm({ patient, prescripteur }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceId = (user?.services as any[])?.[0]?.serviceId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceName = (user?.services as any[])?.[0]?.serviceName;
  const [activeTab, setActiveTab] = useState<SITab>('nouvelle');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [dureeJours, setDureeJours] = useState<number>(1);
  const [jno, setJno] = useState(false);
  const [frequenceType, setFrequenceType] = useState('');
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dateDebut, setDateDebut] = useState(nowDateStr);
  const [heureDebut, setHeureDebut] = useState(nowHeureStr);
  const [instructions, setInstructions] = useState('');
  const [urgence, setUrgence] = useState<Urgence>('NORMAL');
  const [alertes, setAlertes] = useState("");
  const [items, setItems] = useState<SIItem[]>([]);
  const [serviceNotifId, setServiceNotifId] = useState(serviceId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [, setDraftRestored] = useState(false);
  const [, setDraftSavedAt] = useState<Date | null>(null);
  const [, setShowSIDrawer] = useState(false);
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionSIEncours[]>([]);
  const [arretCible, setArretCible] = useState<{ kind: 'itemSoinInfirmier'; id: string; label: string } | null>(null);
  const [arretBusy, setArretBusy] = useState(false);
  const [searchEncours, setSearchEncours] = useState('');
  const prevPatientIdRef = useRef<string | null>(null);
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;

  const [typesSoin, setTypesSoin] = useState<(typeof TYPE_OPTIONS[0] & { id?: string })[]>(TYPE_OPTIONS);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ value: string; id?: string; label: string } | null>(null);
  const [servicesList, setServicesList] = useState<{ serviceId: string; name: string }[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (!chuId) return;
    setLoadingServices(true);
    fetchServicesByChu(chuId, 'CLINIQUE')
      .then((res: unknown) => { if (Array.isArray(res)) setServicesList(res); })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, [chuId]);

  const displayTypes = typeSearch
    ? typesSoin.filter(o => o.label.toLowerCase().includes(typeSearch.toLowerCase()))
    : typesSoin;

  const { clearDraft } = useDraftPersistence<SIFDraftData>(
    `draft:soins-infirmier:${patient.id}`,
    { items, urgence, alertes, serviceNotifId },
    { skip: !patient.id }
  );

  const showFrequence = !TYPES_WITHOUT_FREQUENCE.includes(type);

  const notifError = !serviceNotifId ? 'Sélectionnez un service à notifier' : '';
  const canValidate = items.length > 0 && !notifError;
  const isAddValid = !!type;

  const notifOptions = (() => {
    const base = [...servicesList];
    const push = (id: string | undefined, name?: string) => {
      if (id && !base.some(s => s.serviceId === id)) {
        base.unshift({ serviceId: id, name: name || 'Votre service' });
      }
    };
    push(serviceNotifId, serviceName);
    push(serviceId, serviceName);
    return base;
  })();

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);

    if (patientChanged) {
      const draftKey = `draft:soins-infirmier:${patient.id}`;
      const draftData = loadDraft<SIFDraftData>(draftKey);
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
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence);
          if (draftData.alertes) setAlertes(draftData.alertes);
          if (draftData.serviceNotifId) setServiceNotifId(draftData.serviceNotifId);
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
  }, [patient.id, setPatientId]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
    if (!token) return;
    fetch(`${API_URL}/prescriptions/soins-infirmier/types`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; valeur: string }>) => {
        if (Array.isArray(data) && data.length > 0) {
          const dbTypes = data.map(t => ({ value: t.valeur, label: t.valeur, id: t.id }));
          const baseValues = new Set(TYPE_OPTIONS.map(t => t.value));
          const merged = [...TYPE_OPTIONS, ...dbTypes.filter(t => !baseValues.has(t.value))];
          setTypesSoin(merged);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-type-search]')) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchPrescriptionsEnCours() {
    try {
      const data = await getPrescriptionsPatient('soins-infirmier', patient.id);
      setPrescriptionsEnCours(filterExpired(data, 'items'));
    } catch {}
  }

  useEffect(() => { fetchPrescriptionsEnCours(); }, [patient.id]);

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(''), 2800); }

  useEffect(() => subscribeSoinsMaj(detail => {
    if (!detail.patientId || detail.patientId === patient.id) void fetchPrescriptionsEnCours();
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
      showToast('Soin arrêté');
    } catch {
      setArretCible(null);
      showToast("Erreur lors de l'arrêt");
    } finally {
      setArretBusy(false);
    }
  }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = 'Le type est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    const typeLabel = typesSoin.find(o => o.value === type)?.label ?? type;
    setItems(prev => [...prev, {
      id: Date.now().toString(), type, typeLabel,
      description: description.trim(), dureeJours: jno ? 0 : dureeJours, frequenceType, frequenceValeur,
      dateDebut, heureDebut, instructions: instructions.trim(),
    }]);
    setType(''); setDescription(''); setDureeJours(0); setFrequenceType(''); setFrequenceValeur(0);
    setDateDebut(''); setHeureDebut(''); setInstructions(''); setErrors({});
    setJno(false);
    setShowSIDrawer(false);
    scrollPrescriptionContentToTop();
  }

  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function handleAddCustomType() {
    const val = customTypeInput.trim();
    if (!val) return;
    const value = val.toLowerCase().replace(/\s+/g, '-');
    setTypesSoin(prev => [...prev, { value, label: val }]);
    setCustomTypeInput('');
    setShowCustomInput(false);
    setTypeSearch('');
    setShowSuggestions(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
      await fetch(`${API_URL}/prescriptions/soins-infirmier/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ valeur: value }),
      });
    } catch {}
  }

  async function handleDeleteType(value: string, id?: string) {
    setTypesSoin(prev => prev.filter(t => t.value !== value));
    if (id) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
        await fetch(`${API_URL}/prescriptions/soins-infirmier/types/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
  }

  function handleRemoveType(value: string, id?: string) {
    const label = typesSoin.find(t => t.value === value)?.label || value;
    setDeleteConfirm({ value, id, label });
  }

  async function handleValidate() {
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        alertes,
        notifierInfirmier: true,
        serviceNotifId,
        serviceIdDest: serviceNotifId,
        nomMedecinPrescripteur: nomMedecin,
        numeroONM: numeroONM,
        patientNom: patient.nom,
        patientPrenom: patient.prenom,
        prescripteurNom: prescripteur.nom,
        prescripteurPrenom: prescripteur.prenom,
        prescripteurService: prescripteur.service,
        items: items.map(item => ({
          type: item.type, typeLabel: item.typeLabel, description: item.description, dureeJours: item.dureeJours, frequenceType: item.frequenceType, frequenceValeur: item.frequenceValeur, dateDebut: item.dateDebut ? new Date(item.dateDebut) : undefined, heureDebut: item.heureDebut || undefined, instructions: item.instructions
        })),
      };

      const summary = `${items.length} acte(s) soins infirmier`;
      addToPanier('soins-infirmier', summary, prescriptionData);
      clearDraft();

      setShowValidationPopup(true);
      setItems([]);
      setAlertes('');
      setInstructions('');
      setUrgence('NORMAL');
      setServiceNotifId(serviceId ?? '');
      await fetchPrescriptionsEnCours();
      setActiveTab('encours');
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} style={chipStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            <Icone nom={t.icon} style={{ fontSize: 16 }} />
            {t.label}
            {t.key === 'nouvelle' && items.length > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {items.length}
              </span>
            )}
            {t.key === 'encours' && prescriptionsEnCours.length > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {prescriptionsEnCours.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'nouvelle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div>
            {/* ── Service à notifier ── */}
            <div style={{ marginBottom: 12, padding: '12px 16px', background: 'var(--green-lt)', border: '1px solid var(--green-bdr)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icone nom="notifications_active" style={{ fontSize: 18, color: 'var(--green-success, #16a34a)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-success, #16a34a)' }}>Notifier le service infirmier <span className="req">*</span></span>
              </div>
              {loadingServices ? (
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>Chargement des services...</div>
              ) : (
                <select
                  value={serviceNotifId}
                  onChange={e => setServiceNotifId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${notifError ? 'var(--red-bdr)' : 'var(--bdr)'}`, fontSize: 12, background: 'var(--card)' }}
                >
                  {notifOptions.map(s => (
                    <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
                  ))}
                </select>
              )}
              {notifError && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{notifError}</div>}
            </div>

            {items.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
                    Actes à prescrire ({items.length})
                  </span>
                  <button onClick={() => setItems([])} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    Tout retirer
                  </button>
                </div>
                {items.map((item) => (
                  <div key={item.id} style={{
                    background: 'var(--surface-alt)', border: '1px solid var(--bdr)',
                    borderRadius: 10, padding: 12, marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icone nom={TYPE_ICON[item.type] || 'medical_services'} style={{ fontSize: 20, color: 'var(--navy)' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>
                            {item.typeLabel || item.type}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--txt2)' }}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(item.id)} style={{
                        background: 'var(--red-lt)', border: 'none', borderRadius: 6,
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--red)', fontSize: 14,
                      }}>
                        <Icone nom="close" />
                      </button>
                    </div>
                    {(item.dureeJours > 0 || item.frequenceType) && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--txt2)' }}>
                        {getDureeText(item) && <span>{getDureeText(item)}</span>}
                        {item.frequenceType && <span>Fréquence: {item.frequenceType === 'HEURES' ? `Toutes les ${item.frequenceValeur}h` : item.frequenceType === 'MINUTES' ? `Toutes les ${item.frequenceValeur} minutes` : item.frequenceType === 'PAR_JOUR' ? `${item.frequenceValeur}×/jour` : item.frequenceType === 'SOS' ? 'Si besoin' : 'En continu'}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icone nom="add_circle" style={{ fontSize: 18, color: 'var(--navy)' }} />
                Ajouter un acte
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <label className="lbl">Type d&apos;acte <span className="req">*</span></label>
                  
                  {!type ? (
                    <div data-type-search style={{ position: 'relative', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--bdr)', background: 'var(--card)' }}>
                        <Icone nom="search" style={{ fontSize: 16, color: 'var(--txt3)' }} />
                        <input
                          type="text"
                          value={typeSearch}
                          onChange={e => { setTypeSearch(e.target.value); setShowSuggestions(true); }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Rechercher ou choisir un soin..."
                          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--txt)' }}
                        />
                      </div>
                      {showSuggestions && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                          {displayTypes.length > 0 ? (
                            displayTypes.map(o => {
                              const isCustom = !TYPE_OPTIONS.some(t => t.value === o.value);
                              return (
                                <div key={o.value}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--surface-alt)' }}
                                  onMouseDown={e => { e.preventDefault(); setType(o.value); setTypeSearch(''); setShowSuggestions(false); setErrors(er => ({ ...er, type: '' })); }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Icone nom={TYPE_ICON[o.value] || 'medical_services'} style={{ fontSize: 16, color: 'var(--txt3)' }} />
                                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt)' }}>{o.label}</span>
                                    {isCustom && <span style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--teal-lt)', padding: '1px 6px', borderRadius: 4 }}>perso</span>}
                                  </div>
                                  <button className="bdel" onClick={e => { e.stopPropagation(); handleRemoveType(o.value, o.id); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{ padding: 4, fontSize: 14 }}
                                    title="Supprimer ce type">
                                    <Icone nom="delete" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ padding: 12, textAlign: 'center' }}>
                              <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 6 }}>Aucun soin trouvé</div>
                              <button onClick={async () => {
                                  const val = typeSearch.trim();
                                  if (!val) return;
                                  const value = val.toLowerCase().replace(/\s+/g, '-');
                                  setTypesSoin(prev => [...prev, { value, label: val }]);
                                  setType(value);
                                  setTypeSearch('');
                                  setShowSuggestions(false);
                                  try {
                                    const token = typeof window !== 'undefined' ? localStorage.getItem('prescription_jwt') : null;
                                    await fetch(`${API_URL}/prescriptions/soins-infirmier/types`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                      body: JSON.stringify({ valeur: value }),
                                    });
                                  } catch {}
                                }}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px dashed var(--teal)', background: 'none', color: 'var(--teal)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                + Ajouter &ldquo;{typeSearch}&rdquo;
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4 }}>
                      {typesSoin.filter(o => o.value === type).map(o => {
                        const isCustom = !TYPE_OPTIONS.some(t => t.value === o.value);
                        return (
                          <div key={o.value} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '6px 12px', borderRadius: isCustom ? '8px 0 0 8px' : 8,
                              borderTop: '2px solid var(--navy)', borderBottom: '2px solid var(--navy)',
                              borderLeft: '2px solid var(--navy)',
                              borderRight: isCustom ? 'none' : '2px solid var(--navy)',
                              background: 'var(--navy-lt)', color: 'var(--navy)',
                              fontSize: 12, fontWeight: 700,
                            }}>
                              <Icone nom={TYPE_ICON[o.value] || 'medical_services'} style={{ fontSize: 16 }} />
                              {o.label}
                            </div>
                            {isCustom && (
                              <button onClick={() => setDeleteConfirm({ value: o.value, id: o.id, label: o.label })}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '0 8px', borderRadius: 0,
                                  borderTop: '2px solid var(--navy)', borderBottom: '2px solid var(--navy)',
                                  borderLeft: 'none', borderRight: 'none',
                                  background: 'var(--red-lt)', color: 'var(--red)',
                                  fontSize: 14, cursor: 'pointer',
                                }}
                                title="Supprimer ce type de la base">
                                <Icone nom="delete" />
                              </button>
                            )}
                            <button onClick={() => { setType(''); setTypeSearch(''); }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0 8px', borderRadius: '0 8px 8px 0',
                                borderTop: '2px solid var(--navy)', borderBottom: '2px solid var(--navy)',
                                borderLeft: 'none', borderRight: '2px solid var(--navy)',
                                background: 'var(--surface-alt)', color: 'var(--txt3)',
                                fontSize: 14, cursor: 'pointer',
                              }}
                              title="Changer de type">
                              <Icone nom="edit" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showCustomInput && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input type="text" value={customTypeInput} onChange={e => setCustomTypeInput(e.target.value)}
                        placeholder="Nouveau type de soin..."
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--bdr)', fontSize: 12 }}
                        autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAddCustomType(); if (e.key === 'Escape') { setShowCustomInput(false); setCustomTypeInput(""); } }}
                      />
                      <button onClick={handleAddCustomType} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
                      <button onClick={() => { setShowCustomInput(false); setCustomTypeInput(""); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--card)', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
                    </div>
                  )}
                  {errors.type && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{errors.type}</div>}
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="lbl">Description</label>
                  <textarea rows={2} value={description} onChange={e => { setDescription(e.target.value); setErrors(er => ({ ...er, description: '' })); }}
                    placeholder="Ex: Pansement plaie chirurgicale bras droit..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: errors.description ? '1.5px solid var(--red)' : '1.5px solid var(--bdr)', fontSize: 12, resize: 'none' }}
                  />
                  {errors.description && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{errors.description}</div>}
                </div>

                {showFrequence && (
                  <>
                    {/*
                      Bloc frequence regroupe sur toute la largeur : les trois champs
                      (Duree, Frequence, Valeur) tiennent dans une meme grille
                      `auto-fit` a 150px minimum, au lieu d'etre repartis entre une
                      grille 1fr/1fr et une cellule isolee sur la ligne suivante.
                      La case "Jusqu'a nouvelle ordre" est sortie de la cellule
                      "Duree" (ou elle decalait le champ vers le bas) et posee sur sa
                      propre ligne sous la grille.
                    */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
                      <div>
                        {!jno && (
                          <>
                            <label className="lbl">Durée (jours)</label>
                            <input type="number" min={1} value={dureeJours || ''} onChange={e => { setDureeJours(Number(e.target.value)); setErrors(er => ({ ...er, dureeJours: '' })); }}
                              placeholder="Ex: 7" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: errors.dureeJours ? '1.5px solid var(--red)' : '1.5px solid var(--bdr)', fontSize: 12 }}
                            />
                            {errors.dureeJours && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{errors.dureeJours}</div>}
                          </>
                        )}
                      </div>
                      <div>
                        <label className="lbl">Fréquence</label>
                        <select value={frequenceType} onChange={e => { setFrequenceType(e.target.value); setErrors(er => ({ ...er, frequenceType: '' })); }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: errors.frequenceType ? '1.5px solid var(--red)' : '1.5px solid var(--bdr)', fontSize: 12, background: 'var(--card)' }}
                        >
                          <option value="">— Choisir —</option>
                          <option value="HEURES">Toutes les X heures</option>
                          <option value="MINUTES">Toutes les X minutes</option>
                          <option value="PAR_JOUR">X fois par jour</option>
                          <option value="SOS">Si besoin (SOS)</option>
                          <option value="CONTINU">En continu</option>
                        </select>
                        {errors.frequenceType && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{errors.frequenceType}</div>}
                      </div>
                      {(frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && (
                        <div>
                          <label className="lbl">Valeur</label>
                          <input type="number" min={1} value={frequenceValeur || ''} onChange={e => { setFrequenceValeur(Number(e.target.value)); setErrors(er => ({ ...er, frequenceValeur: '' })); }}
                            placeholder={frequenceType === 'HEURES' ? 'Ex: 6' : frequenceType === 'MINUTES' ? 'Ex: 30' : 'Ex: 3'} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: errors.frequenceValeur ? '1.5px solid var(--red)' : '1.5px solid var(--bdr)', fontSize: 12 }}
                          />
                          {errors.frequenceValeur && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{errors.frequenceValeur}</div>}
                        </div>
                      )}
                      </div>
                      {['HEURES', 'MINUTES', 'PAR_JOUR'].includes(frequenceType) && (
                        <label className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 8, marginBottom: 0, whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={jno} onChange={e => { setJno(e.target.checked); setErrors(er => ({ ...er, dureeJours: '' })); }} /> Jusqu&apos;à nouvelle ordre
                        </label>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="lbl">Date début</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--bdr)', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="lbl">Heure début</label>
                  <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--bdr)', fontSize: 12 }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="lbl">Instructions</label>
                  <input type="text" value={instructions} onChange={e => setInstructions(e.target.value)}
                    placeholder="Ex: Avant repas du matin..." style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--bdr)', fontSize: 12 }}
                  />
                </div>
              </div>

              <button className="badd" onClick={handleAdd} disabled={!isAddValid}
                style={{
                  marginTop: 12, width: '100%',
                  opacity: isAddValid ? 1 : 0.5,
                }}
              >
                <Icone nom="add" style={{ fontSize: 18 }} />
                Ajouter l&apos;acte
              </button>
            </div>
          </div>

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
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><Icone nom="warning" style={{fontSize:16,color:"var(--red)"}} /><span className="lbl" style={{margin:0}}>Précautions &amp; Alertes</span></div>
              <textarea rows={1} value={alertes} onChange={e => setAlertes(e.target.value)} placeholder="Précautions..." style={{background:"var(--red-lt)",border:"1.5px solid var(--red-bdr)",padding:'8px 12px'}} />
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

            <button className="bp" onClick={handleValidate} disabled={!canValidate || loading}
              style={{
                opacity: canValidate && !loading ? 1 : 0.5,
                pointerEvents: canValidate && !loading ? 'auto' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icone nom="check_circle" />
              {loading ? 'Envoi...' : 'Valider la prescription'}
            </button>
          </div>
        </div>
      )}

      {/* === ONGLET EN COURS === */}
      {activeTab === 'encours' && (() => {
        const q = searchEncours.toLowerCase().trim();
        const filtered = q
          ? prescriptionsEnCours.filter(p => {
              const itemMatch = p.items?.some(i =>
                i.typeLabel?.toLowerCase().includes(q) ||
                i.type?.toLowerCase().includes(q) ||
                i.description?.toLowerCase().includes(q)
              );
              const docMatch = p.prescripteur?.nom?.toLowerCase().includes(q) ||
                p.nomMedecinPrescripteur?.toLowerCase().includes(q);
              return itemMatch || docMatch;
            })
          : prescriptionsEnCours;
        return (
        <div>
          <div className="active-rx" style={{ maxWidth: 700 }}>
            <div className="active-rx-header"><Icone nom="pending_actions" /><span>Soins en cours</span></div>
            {prescriptionsEnCours.length > 3 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ position: 'relative' }}>
                  <Icone nom="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--txt3)' }} />
                  <input
                    type="text"
                    value={searchEncours}
                    onChange={e => setSearchEncours(e.target.value)}
                    placeholder="Rechercher par type, description, médecin..."
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--inp)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {searchEncours && (
                    <button onClick={() => setSearchEncours('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16, lineHeight: 1, padding: 0 }}>
                      <Icone nom="close" />
                    </button>
                  )}
                </div>
              </div>
            )}
            {filtered.length > 0 ? filtered.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginBottom: 4 }}>
                  {p.createdAt && (
                    <span style={{ fontSize: 12, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icone nom="schedule" style={{ fontSize: 14 }} />
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {(p.nomMedecinPrescripteur || p.prescripteur?.nom) && (
                    <span style={{ fontSize: 12, color: 'var(--txt2)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icone nom="person" style={{ fontSize: 14 }} />
                      Dr {p.nomMedecinPrescripteur || p.prescripteur?.nom}
                    </span>
                  )}
                  {p.urgence && p.urgence !== 'NORMAL' && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 6, fontWeight: 700,
                      background: p.urgence === 'TRES_URGENT' ? 'var(--red)' : 'var(--amber)',
                      color: '#fff',
                    }}>
                      {p.urgence === 'TRES_URGENT' ? 'Très urgent' : 'Urgent'}
                    </span>
                  )}
                </div>
                {p.items?.map((item, idx) => {
                  const freq = item.frequence || (item.frequenceType && item.frequenceValeur != null
                    ? (item.frequenceType === 'HEURES' ? `Toutes les ${item.frequenceValeur}h`
                      : item.frequenceType === 'MINUTES' ? `Toutes les ${item.frequenceValeur} minutes`
                      : item.frequenceType === 'PAR_JOUR' ? `${item.frequenceValeur}×/jour`
                      : item.frequenceType === 'SOS' ? 'Si besoin'
                      : item.frequenceType === 'CONTINU' ? 'En continu' : '')
                    : '');
                  const dur = getDureeText(item);
                  const dateStr = item.dateDebut ? new Date(item.dateDebut).toLocaleDateString('fr-FR') : '';
                  return (
                    <div key={`${p.id}-${idx}`} style={{ padding: '10px 12px', marginBottom: 6, background: 'var(--inp)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Icone nom={TYPE_ICON[item.type || ''] || 'medical_services'} style={{ fontSize: 20, color: 'var(--navy)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: 13, color: 'var(--navy)' }}>{item.typeLabel || item.type}</strong>
                          <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{item.description}</div>
                        </div>
                        {item.planningActif !== false && (
                          <button
                            onClick={() => setArretCible({ kind: 'itemSoinInfirmier', id: item.id || '', label: item.typeLabel || item.type || 'Soin' })}
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
                      <div style={{ fontSize: 12, color: 'var(--txt2)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', lineHeight: 1.6, marginTop: 4 }}>
                        {freq && <span>Fréquence : <strong>{freq}</strong></span>}
                        {dur && <span>Durée : <strong>{dur}</strong></span>}
                        {dateStr && <span>Début : <strong>{dateStr}</strong></span>}
                        {item.heureDebut && <span>Heure : <strong>{item.heureDebut}</strong></span>}
                      </div>
                      {item.instructions && (
                        <div style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic', marginTop: 4, padding: '4px 8px', background: 'rgba(0,0,0,.03)', borderRadius: 4 }}>
                          {item.instructions}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )) : (
              <div className="active-rx-item">
                <span style={{ color: 'var(--txt3)' }}>
                  {q ? 'Aucun résultat pour cette recherche' : 'Aucun soin en cours'}
                </span>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      <p className="hint" style={{ textAlign: 'center', marginTop: 6 }}>
        La prescription sera transmise aux infirmiers de votre service
      </p>

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

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: 24, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Icone nom="warning" style={{ fontSize: 24, color: 'var(--red)' }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)' }}>Confirmer la suppression</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20, lineHeight: 1.5 }}>
              Voulez-vous vraiment supprimer le type <strong style={{ color: 'var(--txt)' }}>&laquo;&nbsp;{deleteConfirm.label}&nbsp;&raquo;</strong> ?
              {deleteConfirm.id && <><br /><span style={{ fontSize: 11, color: 'var(--txt3)' }}>Ce type sera également supprimé de la base de données.</span></>}
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

      <ArretPlanningDialog
        key={arretCible?.id || 'arret'}
        cible={arretCible}
        busy={arretBusy}
        onClose={() => { if (!arretBusy) setArretCible(null); }}
        onConfirm={handleConfirmArret}
      />
    </div>
  );
}
