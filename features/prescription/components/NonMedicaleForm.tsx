'use client';

import { useState, useEffect } from 'react';
import { creerPrescriptionNonMedicale, getPrescriptionsPatient, updateStatutPrescription } from '@/features/prescription/lib/api';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import ValidationPopup from './ValidationPopup';

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
}

interface PrescriptionNonMedEnCours {
  statut?: string;
  id: string;
  items: { typeLabel: string; description: string; duree?: string; frequence?: string; dateDebut?: string }[];
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
  fontSize: 12, fontWeight: active ? 600 : 500, flexShrink: 0,
  background: active ? 'var(--navy)' : 'var(--inp)',
  color: active ? '#fff' : 'var(--txt2)', transition: 'all .15s',
});

const TYPE_OPTIONS = [
  { value: 'regime', label: 'Régime alimentaire' },
  { value: 'mobilisation', label: 'Mobilisation / Positionnement' },
  { value: 'nursing', label: 'Soins infirmiers / Nursing' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'contention', label: 'Contention / Attelle' },
  { value: 'autre', label: 'Autre' },
];

const TYPE_ICON: Record<string, string> = {
  regime: 'restaurant', mobilisation: 'accessibility_new', nursing: 'health_and_safety',
  hygiene: 'soap', contention: 'back_hand', autre: 'more_horiz',
};

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

const TYPES_WITHOUT_FREQUENCE = ['contention', 'regime'];
const TYPES_WITH_OPTIONAL_FREQUENCE = ['autre'];

function parseDureeMs(d: string): number {
  const parts = d.split(' ');
  if (parts.length !== 2) return 0;
  const val = Number(parts[0]);
  const unit = parts[1];
  if (isNaN(val)) return 0;
  switch (unit) {
    case 'heures': return val * 3600_000;
    case 'jours':  return val * 86400_000;
    case 'mois':   return val * 30 * 86400_000;
    default: return 0;
  }
}

function filterExpired(prescriptions: PrescriptionNonMedEnCours[]): PrescriptionNonMedEnCours[] {
  const now = Date.now();
  return prescriptions.filter(p => {
    if (p.statut !== 'ACTIVE') return false;
    return p.items?.some(item => {
      if (!item.dateDebut || !item.duree) return true;
      const start = new Date(item.dateDebut).getTime();
      return (start + parseDureeMs(item.duree)) > now;
    });
  });
}

export default function NonMedicaleForm({ patient, prescripteur, patientType }: Props) {
  const { addToPanier, setPatientId, sendAll } = usePrescriptionPanier();
  const [activeTab, setActiveTab] = useState<NMTab>('nouvelle');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [frequenceType, setFrequenceType] = useState('');
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dateDebut, setDateDebut] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [instructions, setInstructions] = useState('');
  const [urgence, setUrgence] = useState<'NORMAL'|'URGENT'|'TRES_URGENT'>('NORMAL');
  const [items, setItems] = useState<NMItem[]>([]);
  const [notifOn, setNotifOn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const urgenceClasses: Record<string, string> = { NORMAL: 'un', URGENT: 'uu', TRES_URGENT: 'utu' };
  const [apiError, setApiError] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionNonMedEnCours[]>([]);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;

  const isFrequenceRequired = !TYPES_WITHOUT_FREQUENCE.includes(type) && !TYPES_WITH_OPTIONAL_FREQUENCE.includes(type) && patientType !== 'accueil';
  const isDureeRequired = isFrequenceRequired;
  const showFrequence = !TYPES_WITHOUT_FREQUENCE.includes(type);

  const canValidate = items.length > 0;
  const isAddValid = type && description.trim() && (!showFrequence || patientType === 'accueil' || TYPES_WITH_OPTIONAL_FREQUENCE.includes(type) || (dureeJours > 0 && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)));


  useEffect(() => {
    setPatientId(patient.id);
    async function fetchPrescriptions() {
      try {
        const data = await getPrescriptionsPatient('non-medicale', patient.id);
        setPrescriptionsEnCours(filterExpired(data));
      } catch {}
    }
    fetchPrescriptions();
  }, [patient.id, setPatientId]);

  function showToast(msg: string) { setToast(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => setToast(''), 2800); }

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = 'Le type est requis';
    if (!description.trim()) newErrors.description = 'La description est requise';
    if (isDureeRequired && dureeJours <= 0) newErrors.dureeJours = 'La durée en jours est requise';
    if (isFrequenceRequired && !frequenceType) newErrors.frequenceType = 'Le type de fréquence est requis';
    if (isFrequenceRequired && (frequenceType === 'HEURES' || frequenceType === 'PAR_JOUR') && frequenceValeur <= 0) {
      newErrors.frequenceValeur = 'La valeur de fréquence est requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAdd() {
    if (!validateAddForm()) return;
    const typeLabel = TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
    setItems(prev => [...prev, {
      id: Date.now().toString(), type, typeLabel,
      description: description.trim(), dureeJours, frequenceType, frequenceValeur,
      dateDebut, heureDebut, instructions: instructions.trim(),
    }]);
    setType(''); setDescription(''); setDureeJours(0); setFrequenceType(''); setFrequenceValeur(0);
    setDateDebut(''); setHeureDebut(''); setInstructions(''); setErrors({});
  }

  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)); }

  async function refreshPrescriptions() {
    try {
      const data = await getPrescriptionsPatient('non-medicale', patient.id);
      setPrescriptionsEnCours(filterExpired(data));
    } catch {}
  }

  async function terminerPrescription(id: string) {
    try {
      await updateStatutPrescription('non-medicale', id, 'TERMINEE');
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


  async function handleValidate() {
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = {
        patientId: patient.id,
        prescripteurId: prescripteur.id,
        urgence,
        notifierInfirmier: notifOn,
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

      const summary = `${items.length} soin(s) non médicamenteux`;
      addToPanier('non-medicale', summary, prescriptionData);

      setShowValidationPopup(true);
      setItems([]);
      setNotifOn(false);
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
    <div>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

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
                <label className="lbl">Type de prescription <span className="req">*</span></label>
                <select value={type} onChange={e => { setType(e.target.value); if (errors.type) setErrors({...errors, type: ''}); }} style={errors.type ? { borderColor: 'var(--red)' } : {}}>
                  <option value="">Sélectionner un type</option>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.type && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.type}</div>}
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
                  <div>
                    <label className="lbl">Nom du médecin prescripteur *</label>
                    <input type="text" value={nomMedecin} onChange={e => setNomMedecin(e.target.value)} placeholder="Dr ..." />
                  </div>
                  <div>
                    <label className="lbl">N° ONM *</label>
                    <input type="text" value={numeroONM} onChange={e => setNumeroONM(e.target.value)} placeholder="ONM-..." />
                  </div>
                </>
              )}
              {showFrequence && (
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
              )}
              <div className="g2 mb12">
                <div><label className="lbl">Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} /></div>
                <div><label className="lbl">Heure de début</label><input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} /></div>
              </div>
              <button className="badd" onClick={handleAdd} style={{ opacity: isAddValid ? 1 : 0.5 }}>
                <span className="ms" style={{ fontSize: 17 }}>add</span> Ajouter
              </button>
            </div>
            <div className="sh mb12">Prescriptions non médicamenteuses ajoutées</div>
            <div className="mb12">
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--txt3)', fontSize: 13 }}>Aucune prescription ajoutée</div>
              ) : items.map(item => (
                <div key={item.id} className="rxi">
                  <div className="rxi-ic"><span className="ms">{TYPE_ICON[item.type] ?? 'self_care'}</span></div>
                  <div className="rxi-m">
                    <h4>{item.typeLabel}</h4><p>{item.description}</p>
                    {item.dureeJours && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{item.dureeJours} jours{item.frequenceType ? ` · ${getFrequenceText(item.frequenceType, item.frequenceValeur)}` : ''}</p>}
                    {(item.dateDebut || item.heureDebut) && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{item.dateDebut && `Début : ${item.dateDebut}`}{item.heureDebut && ` à ${item.heureDebut}`}</p>}
                    {item.instructions && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{item.instructions}</p>}
                  </div>
                  <button className="bdel" onClick={() => handleDelete(item.id)}><span className="ms">delete</span></button>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE — sticky */}
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <label className="lbl">Instructions pour l&apos;équipe soignante</label>
              <textarea rows={4} placeholder="Précisions pour l'équipe..." value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div className="togr">
                <div className="togr-l"><p>Notifier les infirmiers</p><span>Envoyer une notification au service</span></div>
                <label className="tog"><input type="checkbox" checked={notifOn} onChange={e => setNotifOn(e.target.checked)}/><span className="tog-t"></span></label>
              </div>
              {notifOn && <div className="hint"><span className="ms" style={{ fontSize: 13, verticalAlign: 'middle', color: 'var(--navy)' }}>notifications_active</span> Notification envoyée aux infirmiers de garde.</div>}
            </div>

            {!canValidate && (
              <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
                Ajoutez au moins un soin.
              </div>
            )}
            <button className="bp" onClick={handleValidate}
              style={{ opacity: canValidate && !loading ? 1 : 0.5, pointerEvents: canValidate && !loading ? "auto" : "none" }}>
              <span className="ms">check_circle</span>{loading ? "Envoi..." : "Valider"}
            </button>
          </div>
        </div>
      )}

      {/* === ONGLET PRESCRIPTIONS EN COURS === */}
      {activeTab === 'encours' && (
        <div style={{ maxWidth: 700 }}>
          <div className="active-rx">
            <div className="active-rx-header"><span className="ms">pending_actions</span><span>Prescriptions en cours</span></div>
            {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {p.items?.map((item, idx) => (
                  <div key={`${p.id}-${idx}`} className="active-rx-item">
                    <strong>{item.typeLabel}</strong>
                    <span> — {item.description}{item.duree ? ` (${item.duree})` : ''}{item.frequence ? ` · ${item.frequence}` : ''}{p.prescripteur?.nom ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
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
              <div className="active-rx-item"><span style={{ color: 'var(--txt3)' }}>Aucune prescription en cours</span></div>
            )}
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
