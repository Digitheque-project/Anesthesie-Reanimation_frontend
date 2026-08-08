"use client";
import { useState, useEffect } from 'react';
import SearchableSelect from '@/features/prescription/components/common/SearchableSelect';
import { authFetch } from '@/features/prescription/lib/auth';
import { getHistoriquePatient } from '@/features/prescription/lib/api';
import { getDirectoryUser, formatDirectoryUserName } from '@/lib/clinical/user-directory-api';

const FILTRES = [
  { id: 'all',   label: 'Tout',             icon: 'list' },
  { id: 'med',   label: 'Médicamenteuse',   icon: 'medication' },
  { id: 'nm',    label: 'Non Médicamenteuse', icon: 'self_care' },
  { id: 'surv',  label: 'Surveillance',     icon: 'monitor_heart' },
  { id: 'trans', label: 'Transfusion',      icon: 'bloodtype' },
  { id: 'labo',  label: 'Laboratoire',      icon: 'science' },
  { id: 'imag',  label: 'Imagerie',         icon: 'radiology' },
  { id: 'eeg',   label: 'EEG',              icon: 'neurology' },
  { id: 'kine',  label: 'Kinésithérapie',   icon: 'exercise' },
  { id: 'endo',  label: 'Endoscopie',       icon: 'visibility' },
  { id: 'dial',  label: 'Dialyse',          icon: 'water_full' },
  { id: 'ana',   label: 'Anapath',          icon: 'biotech' },
  { id: 'bloc',  label: 'Intervention chirurgicale',  icon: 'medical_services' },
];

// Palette neutre (UI/UX) : une seule teinte d'accent au lieu de l'arc-en-ciel.
const ACCENT = '#1e3a5f';
const TYPE_COLORS: Record<string, string> = {
  med:   ACCENT, nm:   ACCENT, surv:  ACCENT,
  trans: ACCENT, labo: ACCENT, imag:  ACCENT,
  eeg:   ACCENT, kine: ACCENT, endo:  ACCENT,
  dial:  ACCENT, ana:  ACCENT, bloc:  ACCENT,
};

const ENDPOINTS: Record<string, string> = {
  med:   'prescriptions/medicale',
  nm:    'prescriptions/non-medicale',
  surv:  'prescriptions/surveillance',
  trans: 'prescriptions/transfusion',
  labo:  'prescriptions/labo',
  imag:  'prescriptions/imagerie',
  eeg:   'prescriptions/eeg',
  kine:  'prescriptions/kine',
  endo:  'prescriptions/endoscopie',
  dial:  'prescriptions/dialyse',
  ana:   'prescriptions/anapath',
  bloc:  'prescriptions/bloc',
};

interface PrescriptionItem {
  _type: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  statut?: string;
  remarque?: string;
  remarques?: string;
  instructions?: string;
  description?: string;
  nom?: string;
  medicament?: string;
  type?: string;
  parametre?: string;
  produit?: string;
  groupe?: string;
  examen?: string;
  analyse?: string;
  seance?: string;
  intervention?: string;
  urgence?: string;
  alertes?: string;
  renseignements?: string;
  notes?: string;
  notifierInfirmier?: boolean;
  nomMedecinPrescripteur?: string;
  numeroONM?: string;
  prescripteurId?: string;
  serviceIdSource?: string;
  serviceIdDest?: string;
  premierSoin?: boolean;
  aJeun?: boolean;
  motifRefus?: string;
  medicaments?: PrescriptionItem[];
  items?: PrescriptionItem[];
  parametres?: PrescriptionItem[];
  analyses?: string[];
  examens?: Record<string, any>;
  typeEEG?: string;
  typeKine?: string;
  diagnostic?: string;
  contreIndications?: string[];
  autreContreIndic?: string;
  objectifs?: string;
  typeExamen?: string;
  typeDialyse?: string;
  data?: Record<string, unknown>;
  libelle?: string;
  risqueHemorragique?: string;
  typeChirurgie?: string;
  chirurgien?: string;
  consignes?: string;
  dateIntervention?: string;
  actes?: Record<string, any>[];
  atcdTransfusion?: boolean;
  incident?: string;
  groupage?: string;
  hb?: string;
  plaquettes?: string;
  quantite?: string;
  datePrevue?: string;
  typeLabel?: string;
  duree?: string;
  frequence?: string;
  dateDebut?: string;
  heureDebut?: string;
  seuil?: string;
  dose?: string;
  voie?: string;
  quantiteType?: string;
  frequenceType?: string;
  frequenceValeur?: string;
  dureeJours?: string | number;
  // Banque de Sang integration fields
  externalPrescriptionId?: string;
  statutBanqueSang?: string;
  motifRefusBanqueSang?: string;
  produits?: PrescriptionItem[];
  // Dialyse specific
  diagnosticRenal?: string;
  dateSouhaitee?: string;
  statutClinique?: string;
  observationsTol?: string;
  // EEG specific
  aeActuel?: string;
  agePremiereCrise?: string;
  dpm?: string;
  typeCrise?: string;
  dateDerniereCrise?: string;
  // Imagerie specific
  statutPatient?: string;
  // Kine specific
  autreKine?: string;
  sourceType?: string;
}

interface Props {
  patient?: {
    id?: string;
    idPermanent?: string;
    nom?: string;
    prenom?: string;
    sexe?: string;
    dateNaissance?: string;
    allergies?: string[];
    groupeSanguin?: string;
    service?: string;
    chambre?: string;
    lit?: string;
    typeHospital?: string;
    categorie?: string;
    patientType?: string;
  };
  prescripteur?: { id?: string; nom?: string; prenoms?: string; poste?: string; service?: string };
}

export default function HistoriqueForm({ patient }: Props) {
  const [filtre, setFiltre] = useState('all');
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<PrescriptionItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [medicamentFilter, setMedicamentFilter] = useState('');
  const [examenFilter, setExamenFilter] = useState('');
  // Filtres avancés repliables (masqués par défaut pour laisser la place aux résultats)
  const [showFilters, setShowFilters] = useState(false);
  const advancedFilterCount = [periodeFilter, dateFrom, dateTo, medicamentFilter, examenFilter].filter(Boolean).length;
  // Cache de resolution des prescripteurs par id (via /api/users/:id).
  // Valeur = nom formate ('Nom Prenom'), ou '' si introuvable.
  const [prescripteurNames, setPrescripteurNames] = useState<Record<string, string>>({});
  const [prescripteurLoadingId, setPrescripteurLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistorique() {
      setLoading(true);
      setError('');
      try {
        const patientId = patient?.id;
        if (!patientId) {
          setItems([]);
          return;
        }
        const results = await getHistoriquePatient(patientId, {
          type: filtre === 'all' ? undefined : ENDPOINTS[filtre],
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          medicament: medicamentFilter || undefined,
          examen: examenFilter || undefined,
          periode: periodeFilter || undefined,
        });
        setItems(Array.isArray(results) ? results : []);
      } catch (e: unknown) {
        setError('Erreur lors du chargement : ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        setLoading(false);
      }
    }
    fetchHistorique();
  }, [filtre, patient?.id, periodeFilter, dateFrom, dateTo, medicamentFilter, examenFilter]);

  // Option 1 : si le nom du prescripteur n'a pas ete saisi a la creation,
  // on le resout dynamiquement depuis prescripteurId via l'annuaire
  // (/api/users/:id), avec un cache par id pour eviter les appels repetes.
  useEffect(() => {
    const id = selectedItem?.prescripteurId?.trim();
    if (!showModal || !id) return;
    if (selectedItem?.nomMedecinPrescripteur) return; // deja renseigne a la source
    if (id in prescripteurNames) return; // deja resolu (ou marque introuvable)

    let annule = false;
    setPrescripteurLoadingId(id);
    getDirectoryUser(id)
      .then((user) => {
        if (annule) return;
        setPrescripteurNames((prev) => ({
          ...prev,
          [id]: formatDirectoryUserName(user),
        }));
      })
      .finally(() => {
        if (!annule)
          setPrescripteurLoadingId((cur) => (cur === id ? null : cur));
      });

    return () => {
      annule = true;
    };
  }, [showModal, selectedItem, prescripteurNames]);

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function getTypeLabel(type: string) {
    return FILTRES.find(f => f.id === type)?.label || type;
  }

  function getResume(item: PrescriptionItem, type: string) {
    switch (type) {
      case 'med':   return item.medicament || item.nom || 'Médicament';
      case 'nm':    return item.type || item.description || 'Non médicamenteuse';
      case 'surv':  return item.parametre || item.type || 'Surveillance';
      case 'trans': return item.produit || item.groupe || 'Transfusion';
      case 'labo':  return item.examen || item.analyse || 'Analyse laboratoire';
      case 'imag':  return getImagerieExamenType(item) || item.examen || item.type || 'Imagerie';
      case 'eeg':   return item.type || 'EEG';
      case 'kine':  return item.type || item.seance || 'Kinésithérapie';
      case 'endo':  return item.type || 'Endoscopie';
      case 'dial':  return item.type || 'Dialyse';
      case 'ana':   return item.examen || item.type || 'Anapath';
      case 'bloc':  return item.intervention || item.type || 'Intervention chirurgicale';
      default:      return item.description || item.nom || '—';
    }
  }

  function handleItemClick(item: PrescriptionItem) {
    setSelectedItem(item);
    setShowModal(true);
  }

  function renderDetailField(label: string, value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>{label}: </span>
        <span style={{ fontSize: 12, color: 'var(--txt)' }}>{String(value)}</span>
      </div>
    );
  }

  function getUrgenceLabel(u?: string) {
    if (!u) return '';
    switch (u) {
      case 'NORMAL': return 'Normal';
      case 'URGENT': return 'Urgent';
      case 'TRES_URGENT': return 'Très urgent';
      default: return u;
    }
  }

  function getImagerieModaliteKey(typeExamen?: string): string {
    if (!typeExamen) return '';
    const normalized = typeExamen.toUpperCase();
    const mapping: Record<string, string> = {
      'SCANNER': 'scanner',
      'RADIOGRAPHIE': 'radiographie',
      'ECHOGRAPHIE': 'echographie',
      'GESTE': 'geste',
      'RADIO_SPECIALE': 'radioSpeciale',
    };
    return mapping[normalized] || '';
  }

  function getImagerieExamenType(item: PrescriptionItem): string | undefined {
    const modaliteKey = getImagerieModaliteKey(item.typeExamen);
    if (!modaliteKey || !item.examens) return undefined;
    
    const examData = item.examens[modaliteKey];
    if (!examData) return undefined;
    
    // Case 1: Current format - object with 'type' field
    if (typeof examData === 'object' && !Array.isArray(examData) && 'type' in examData) {
      return examData.type as string;
    }
    
    // Case 2: Old format - array of objects with 'type' field
    if (Array.isArray(examData) && examData.length > 0) {
      if (typeof examData[0] === 'object' && 'type' in examData[0]) {
        return examData.map((e: any) => e.type).filter(Boolean).join(', ');
      }
      // Case 3: Old format - array of strings
      if (typeof examData[0] === 'string') {
        return examData.join(', ');
      }
    }
    
    return undefined;
  }

  function renderPrescriptionDetails(item: PrescriptionItem, type: string) {
    const color = TYPE_COLORS[type] || 'var(--navy)';

    switch (type) {
      case 'med':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.remarques && renderDetailField('Remarques générales', item.remarques)}
            {item.notifierInfirmier !== undefined && renderDetailField('Notifier infirmier', item.notifierInfirmier ? 'Oui' : 'Non')}
            {item.premierSoin !== undefined && renderDetailField('Premier Soin', item.premierSoin ? 'Oui' : 'Non')}
            {item.medicaments && Array.isArray(item.medicaments) && item.medicaments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Médicaments prescrits ({item.medicaments.length})</div>
                {item.medicaments.map((med: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Nom', med.nom)}
                    {renderDetailField('Dose', med.dose)}
                    {renderDetailField('Quantité', med.quantite)}
                    {renderDetailField('Type quantité', med.quantiteType)}
                    {renderDetailField('Voie', med.voie)}
                    {renderDetailField('Fréquence', med.frequenceType ? `${med.frequenceType} ${med.frequenceValeur || ''}`.trim() : med.frequence)}
                    {renderDetailField('Durée (jours)', med.dureeJours)}
                    {renderDetailField('Date de début', med.dateDebut)}
                    {renderDetailField('Heure de début', med.heureDebut)}
                    {renderDetailField('Instructions', med.instructions)}
                    {renderDetailField('Remarques', med.remarques)}
                    {med.premierSoin !== undefined && renderDetailField('Premier Soin', med.premierSoin ? 'Oui' : 'Non')}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'nm':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.notifierInfirmier !== undefined && renderDetailField('Notifier infirmier', item.notifierInfirmier ? 'Oui' : 'Non')}
            {item.items && Array.isArray(item.items) && item.items.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Prescriptions ({item.items.length})</div>
                {item.items.map((itm: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type', itm.typeLabel || itm.type)}
                    {renderDetailField('Description', itm.description)}
                    {renderDetailField('Durée', itm.duree)}
                    {renderDetailField('Fréquence', itm.frequence)}
                    {renderDetailField('Date de début', itm.dateDebut)}
                    {renderDetailField('Heure de début', itm.heureDebut)}
                    {renderDetailField('Instructions', itm.instructions)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'surv':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.notes && renderDetailField('Notes', item.notes)}
            {item.notifierInfirmier !== undefined && renderDetailField('Notifier infirmier', item.notifierInfirmier ? 'Oui' : 'Non')}
            {item.parametres && Array.isArray(item.parametres) && item.parametres.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Paramètres à surveiller ({item.parametres.length})</div>
                {item.parametres.map((param: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Paramètre', param.parametre)}
                    {renderDetailField('Fréquence', param.frequence)}
                    {renderDetailField('Durée', param.duree)}
                    {renderDetailField('Seuil', param.seuil)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'trans':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.atcdTransfusion !== undefined && renderDetailField('Antécédents transfusionnels', item.atcdTransfusion ? 'Oui' : 'Non')}
            {item.incident && renderDetailField('Incidents précédents', item.incident)}
            {item.groupage && renderDetailField('Groupage sanguin', item.groupage)}
            {item.hb && renderDetailField('Hémoglobine', item.hb)}
            {item.notes && renderDetailField('Notes', item.notes)}
            {item.produits && Array.isArray(item.produits) && item.produits.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Produits sanguins ({item.produits.length})</div>
                {item.produits.map((prod: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type', prod.produit)}
                    {renderDetailField('Quantité', prod.quantite)}
                    {renderDetailField('Plaquettes', prod.plaquettes)}
                    {renderDetailField('Date prévue', prod.datePrevue)}
                    {prod.statutBanqueSang && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: prod.statutBanqueSang === 'VALIDEE' ? '#dcfce7' : prod.statutBanqueSang === 'REFUSEE' ? '#fee2e2' : prod.statutBanqueSang === 'LIVREE' ? '#dbeafe' : '#f3f4f6',
                          color: prod.statutBanqueSang === 'VALIDEE' ? '#166534' : prod.statutBanqueSang === 'REFUSEE' ? '#991b1b' : prod.statutBanqueSang === 'LIVREE' ? '#1e40af' : '#4b5563',
                        }}>
                          {prod.statutBanqueSang}{prod.motifRefusBanqueSang ? ` — ${prod.motifRefusBanqueSang}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'labo':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.aJeun !== undefined && renderDetailField('À jeun', item.aJeun ? 'Oui' : 'Non')}
            {item.analyses && Array.isArray(item.analyses) && item.analyses.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Analyses demandées ({item.analyses.length})</div>
                <div style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6 }}>
                  {item.analyses.map((analyse: string, idx: number) => (
                    <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>• {analyse}</div>
                  ))}
                </div>
              </div>
            )}
            {item.notes && renderDetailField('Notes', item.notes)}
            {item.motifRefus && renderDetailField('Motif de refus', item.motifRefus)}
          </div>
        );

      case 'imag':
        const modaliteKey = getImagerieModaliteKey(item.typeExamen);
        const examData = modaliteKey && item.examens ? item.examens[modaliteKey] : null;
        const isScanner = item.typeExamen?.toUpperCase() === 'SCANNER';
        const isCurrentFormat = examData && typeof examData === 'object' && !Array.isArray(examData);

        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.statutPatient && renderDetailField('Statut patient', item.statutPatient)}
            {item.typeExamen && renderDetailField("Type d'examen", item.typeExamen)}
            {getImagerieExamenType(item) && renderDetailField("Examen demandé", getImagerieExamenType(item))}
            {isScanner && isCurrentFormat && examData && (
              <>
                {renderDetailField('Glasgow', examData.glasgow)}
                {renderDetailField('Agitation', examData.agite)}
                {renderDetailField('Allergie', examData.allergie)}
                {examData.allergieDetail && renderDetailField('Détail allergie', examData.allergieDetail)}
                {renderDetailField('Créatinine', examData.creatinine)}
                {renderDetailField('Clairance', examData.clearance)}
                {renderDetailField('Diabète', examData.diabete)}
              </>
            )}
            {isCurrentFormat && examData && (
              <>
                {renderDetailField('Précisions', examData.precisions)}
                {renderDetailField('Préparation', examData.preparation)}
              </>
            )}
            {!isCurrentFormat && item.examens && typeof item.examens === 'object' && Object.keys(item.examens).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Examens demandés:</div>
                {Object.entries(item.examens).map(([typeEx, exams]: [string, unknown]) => (
                  <div key={typeEx} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>{typeEx}:</div>
                    {Array.isArray(exams) && exams.map((exam: unknown, idx: number) => (
                      <div key={idx} style={{ fontSize: 12, marginLeft: 8 }}>• {String(exam)}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {item.notes && renderDetailField('Notes', item.notes)}
            {item.motifRefus && renderDetailField('Motif de refus', item.motifRefus)}
          </div>
        );

      case 'eeg':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.typeEEG && renderDetailField("Type d'EEG", item.typeEEG)}
            {item.aeActuel && renderDetailField('AE actuel', item.aeActuel)}
            {item.agePremiereCrise && renderDetailField('Âge 1ère crise', item.agePremiereCrise)}
            {item.dpm && renderDetailField('DPM', item.dpm)}
            {item.typeCrise && renderDetailField('Type de crise', item.typeCrise)}
            {item.dateDerniereCrise && renderDetailField('Date dernière crise', item.dateDerniereCrise)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
            {item.motifRefus && renderDetailField('Motif de refus', item.motifRefus)}
          </div>
        );

      case 'kine':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.typeKine && renderDetailField('Type de kinésithérapie', item.typeKine)}
            {item.diagnostic && renderDetailField('Diagnostic', item.diagnostic)}
            {item.contreIndications && Array.isArray(item.contreIndications) && item.contreIndications.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>Contre-indications:</div>
                {item.contreIndications.map((ci: string, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, marginLeft: 8 }}>• {ci}</div>
                ))}
              </div>
            )}
            {item.autreContreIndic && renderDetailField('Autre contre-indication', item.autreContreIndic)}
            {item.objectifs && renderDetailField('Objectifs', item.objectifs)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
          </div>
        );

      case 'endo':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.typeExamen && renderDetailField("Type d'examen", item.typeExamen)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
          </div>
        );

      case 'dial':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.diagnosticRenal && renderDetailField('Diagnostic rénal', item.diagnosticRenal)}
            {item.dateSouhaitee && renderDetailField('Date souhaitée', item.dateSouhaitee)}
            {item.statutClinique && renderDetailField('Statut clinique', item.statutClinique)}
            {item.observationsTol && renderDetailField('Observations tolérance', item.observationsTol)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
            {item.motifRefus && renderDetailField('Motif de refus', item.motifRefus)}
          </div>
        );

      case 'ana':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.typeExamen && renderDetailField("Type d'examen", item.typeExamen)}
            {item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Détails:</div>
                {Object.entries(item.data).map(([key, value]: [string, unknown]) => (
                  <div key={key}>
                    {renderDetailField(key.charAt(0).toUpperCase() + key.slice(1), value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'bloc':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.consignes && renderDetailField('Consignes', item.consignes)}
            {item.actes && item.actes.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 6 }}>Actes ({item.actes.length})</div>
                {item.actes.map((acte: any, idx: number) => (
                  <div key={acte.id || idx} style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 8, padding: 10, marginBottom: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>#{idx + 1} — {acte.libelle}</div>
                    {acte.typeChirurgie && <div style={{ color: 'var(--txt2)' }}>Type: {acte.typeChirurgie}</div>}
                    {acte.dateIntervention && <div style={{ color: 'var(--txt2)' }}>Date: {new Date(acte.dateIntervention).toLocaleDateString('fr-FR')}</div>}
                    {(acte.dureeHeures || acte.dureeMinutes) && <div style={{ color: 'var(--txt2)' }}>Durée: {acte.dureeHeures || 0}h{acte.dureeMinutes ? `${acte.dureeMinutes}min` : ''}</div>}
                    {acte.risqueHemorragique && <div style={{ color: 'var(--txt2)' }}>Risque hémorragique: {acte.risqueHemorragique}</div>}
                    {acte.risqueInfectieux && <div style={{ color: 'var(--txt2)' }}>Risque infectieux: {acte.risqueInfectieux}</div>}
                    {acte.typeAnesthesie && <div style={{ color: 'var(--txt2)' }}>Anesthésie: {acte.typeAnesthesie}{acte.typeAnesthesieAutre ? ` (${acte.typeAnesthesieAutre})` : ''}</div>}
                    {acte.intubation && <div style={{ color: 'var(--txt2)' }}>Intubation: {acte.intubation}{acte.intubationAutre ? ` (${acte.intubationAutre})` : ''}</div>}
                    {acte.nomChirurgien && <div style={{ color: 'var(--txt2)' }}>Chirurgien: {acte.nomChirurgien}</div>}
                    {acte.materiels && <div style={{ color: 'var(--txt2)' }}>Matériels: {acte.materiels}</div>}
                    {acte.positions && <div style={{ color: 'var(--txt2)' }}>Positions: {acte.positions}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div>
            {renderDetailField('Description', item.description)}
            {renderDetailField('Remarques', item.remarques)}
          </div>
        );
    }
  }

  return (
    <div>
      {/* TITRE */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>
          Historique des prescriptions
        </h2>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt2)', marginTop: 4 }}>
          {items.length} prescription{items.length > 1 ? 's' : ''} trouvée{items.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* BARRE D'OUTILS — compacte : type de prescription + bouton « Filtres » repliable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: showFilters ? 12 : 20 }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--txt3)' }}>filter_list</span>
            <SearchableSelect
              options={FILTRES.map((f) => ({ value: f.id, label: f.label, icon: f.icon }))}
              value={filtre}
              onChange={setFiltre}
              placeholder="Type de prescription"
              searchPlaceholder="Rechercher un type…"
              ariaLabel="Filtrer par type de prescription"
              style={{ minWidth: 240, maxWidth: 320 }}
            />
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                background: (showFilters || advancedFilterCount > 0) ? 'var(--navy-lt)' : '#fff',
                color: advancedFilterCount > 0 ? 'var(--navy)' : 'var(--txt2)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <span className="ms" style={{ fontSize: 16 }}>tune</span>
              Filtres{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ''}
              <span className="ms" style={{ fontSize: 16 }}>{showFilters ? 'expand_less' : 'expand_more'}</span>
            </button>
            {advancedFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setPeriodeFilter(''); setDateFrom(''); setDateTo(''); setMedicamentFilter(''); setExamenFilter(''); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bdr)',
                  background: '#fff', color: 'var(--txt2)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <span className="ms" style={{ fontSize: 16 }}>close</span>
                Réinitialiser
              </button>
            )}
          </div>

          {/* FILTRES AVANCÉS — repliables, largeurs fixes pour rester compacts sur une seule ligne */}
          {showFilters && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <select
                value={periodeFilter}
                onChange={(e) => setPeriodeFilter(e.target.value)}
                style={{
                  width: 160, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                  background: '#fff', color: 'var(--txt)', fontSize: 13,
                }}
              >
                <option value="">Toute période</option>
                <option value="jour">Aujourd'hui</option>
                <option value="semaine">7 derniers jours</option>
                <option value="mois">30 derniers jours</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Date de début"
                style={{
                  width: 150, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                  background: '#fff', color: 'var(--txt)', fontSize: 13,
                }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Date de fin"
                style={{
                  width: 150, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                  background: '#fff', color: 'var(--txt)', fontSize: 13,
                }}
              />
              <input
                type="text"
                value={medicamentFilter}
                onChange={(e) => setMedicamentFilter(e.target.value)}
                placeholder="Recherche médicament..."
                style={{
                  width: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                  background: '#fff', color: 'var(--txt)', fontSize: 13,
                }}
              />
              <input
                type="text"
                value={examenFilter}
                onChange={(e) => setExamenFilter(e.target.value)}
                placeholder="Recherche examen..."
                style={{
                  width: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                  background: '#fff', color: 'var(--txt)', fontSize: 13,
                }}
              />
            </div>
          )}

          {/* CONTENU */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}>
              <span className="ms" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>hourglass_top</span>
              Chargement...
            </div>
          ) : error ? (
            <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: 16, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}>
          <span className="ms" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>inbox</span>
          Aucune prescription trouvée
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => {
            const color = TYPE_COLORS[item._type] || 'var(--navy)';
            return (
              <div key={i} className="card" style={{
                padding: '12px 16px', borderLeft: `4px solid ${color}`,
                display: 'flex', alignItems: 'flex-start', gap: 12,
                cursor: 'pointer',
              }} onClick={() => handleItemClick(item)}>
                {/* Icône type */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="ms" style={{ fontSize: 18, color }}>{FILTRES.find(f => f.id === item._type)?.icon || 'description'}</span>
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '3px 9px',
                      borderRadius: 10, background: color + '20', color,
                    }}>
                      {getTypeLabel(item._type)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt2)' }}>
                      {formatDate(item.createdAt || item.date)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt)', marginTop: 4 }}>
                    {getResume(item, item._type)}
                  </div>
                  {item.remarque || item.remarques || item.instructions ? (
                    <div style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 3 }}>
                      {item.remarque || item.remarques || item.instructions}
                    </div>
                  ) : null}
                </div>

                {/* Statut */}
                {item.statut && (
                  <div style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 9px',
                    borderRadius: 10, flexShrink: 0,
                    background: item.statut === 'validé' ? '#d1fae5' : '#fef3c7',
                    color: item.statut === 'validé' ? '#065f46' : '#92400e',
                  }}>
                    {item.statut}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DÉTAILS */}
      {showModal && selectedItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div className="card" style={{
            maxWidth: 680, width: '95%', maxHeight: '88vh', overflowY: 'auto',
            padding: 0, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>

            {/* ── HEADER coloré ── */}
            {(() => {
              const color = TYPE_COLORS[selectedItem._type] || '#1e3a5f';
              const icon = FILTRES.find(f => f.id === selectedItem._type)?.icon || 'description';
              const label = getTypeLabel(selectedItem._type);
              return (
                <div style={{ background: color, padding: '20px 24px', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="ms" style={{ fontSize: 22, color: '#fff' }}>{icon}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '.2px' }}>Prescription {label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{formatDate(selectedItem.createdAt || selectedItem.date)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedItem.urgence && selectedItem.urgence !== 'NORMAL' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: selectedItem.urgence === 'TRES_URGENT' ? '#ef4444' : '#f59e0b', color: '#fff' }}>
                        {getUrgenceLabel(selectedItem.urgence)}
                      </span>
                    )}
                    <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>×</button>
                  </div>
                </div>
              );
            })()}

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── STATUT ── */}
              {selectedItem.statut && (() => {
                const s = selectedItem.statut;
                const isOk = s === 'ACTIVE' || s === 'EXECUTEE' || s === 'validé' || s === 'CREEE';
                const isKo = s === 'ANNULEE' || s === 'REJETEE' || s === 'EXPIREE';
                const bg = isOk ? '#d1fae5' : isKo ? '#fee2e2' : '#fef3c7';
                const fg = isOk ? '#065f46' : isKo ? '#991b1b' : '#92400e';
                const ic = isOk ? 'check_circle' : isKo ? 'cancel' : 'pending';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: bg }}>
                    <span className="ms" style={{ fontSize: 18, color: fg }}>{ic}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>Statut : {s}</span>
                  </div>
                );
              })()}

              {/* ── SECTION PATIENT ── */}
              {patient && (patient.nom || patient.idPermanent) && (
                <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ms" style={{ fontSize: 16, color: 'var(--navy)' }}>person</span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Patient</span>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {patient.idPermanent && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--navy)', color: '#fff' }}>{patient.idPermanent}</span>
                      )}
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>
                        {patient.sexe === 'M' ? 'M.' : patient.sexe === 'F' ? 'Mme' : ''} {patient.nom} {patient.prenom}
                      </span>
                      {patient.dateNaissance && (() => {
                        const diff = Date.now() - new Date(patient.dateNaissance!).getTime();
                        const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
                        return <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{age} ans</span>;
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {patient.groupeSanguin && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                          <span className="ms" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 3 }}>bloodtype</span>{patient.groupeSanguin}
                        </span>
                      )}
                      {patient.service && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--txt2)', fontWeight: 500 }}>{patient.service}</span>
                      )}
                      {(patient.chambre || patient.lit) && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--txt2)', fontWeight: 500 }}>
                          {[patient.chambre, patient.lit].filter(Boolean).join(' — ')}
                        </span>
                      )}
                      {patient.patientType && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                          {patient.patientType === 'hospitalise' ? 'Hospitalisé' : patient.patientType === 'consultation_externe' ? 'Consultation externe' : 'Accueil'}
                        </span>
                      )}
                    </div>
                    {patient.allergies && patient.allergies.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fbbf24' }}>
                        <span className="ms" style={{ fontSize: 14, color: '#92400e' }}>warning</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>Allergies : {patient.allergies.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SECTION PRESCRIPTEUR ── */}
              <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--navy)' }}>stethoscope</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Prescripteur</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {(() => {
                      const pid = selectedItem.prescripteurId?.trim();
                      const resolved =
                        selectedItem.nomMedecinPrescripteur ||
                        (pid ? prescripteurNames[pid] : '');
                      if (resolved) {
                        return (
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Dr {resolved}</span>
                        );
                      }
                      if (pid && prescripteurLoadingId === pid) {
                        return (
                          <span style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic' }}>Résolution du prescripteur…</span>
                        );
                      }
                      return (
                        <span style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic' }}>Prescripteur non renseigné</span>
                      );
                    })()}
                    {selectedItem.numeroONM && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--txt2)', fontWeight: 500 }}>N° ONM : {selectedItem.numeroONM}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedItem.sourceType && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: selectedItem.sourceType === 'accueil' ? '#ede9fe' : selectedItem.sourceType === 'hospitalisation' ? '#dbeafe' : '#f0fdf4',
                        color: selectedItem.sourceType === 'accueil' ? '#5b21b6' : selectedItem.sourceType === 'hospitalisation' ? '#1e40af' : '#166534',
                      }}>
                        Via {selectedItem.sourceType.toUpperCase()}
                      </span>
                    )}
                    {selectedItem.serviceIdSource && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)', padding: '2px 6px', borderRadius: 6, background: 'var(--bg2)' }}>Service : {selectedItem.serviceIdSource.slice(0, 8)}…</span>
                    )}
                  </div>
                  {selectedItem.sourceType === 'accueil' && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="ms" style={{ fontSize: 13 }}>info</span>
                      Prescription initiée depuis le service d'Accueil
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION DÉTAILS CLINIQUES ── */}
              <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--navy)' }}>clinical_notes</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Détails cliniques</span>
                </div>
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--txt)', lineHeight: 1.7 }}>
                  {renderPrescriptionDetails(selectedItem, selectedItem._type)}
                </div>
              </div>

              {/* ── SECTION SUIVI / TIMELINE ── */}
              <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--navy)' }}>history</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Suivi</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {/* Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 22 }}>
                    <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--bdr)', borderRadius: 2 }} />
                    {/* Création */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -22, top: 2, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', boxShadow: '0 0 0 2px #22c55e' }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>Prescription créée</div>
                        <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{formatDate(selectedItem.createdAt)}</div>
                        {(() => {
                          const pid = selectedItem.prescripteurId?.trim();
                          const resolved =
                            selectedItem.nomMedecinPrescripteur ||
                            (pid ? prescripteurNames[pid] : '');
                          return resolved ? (
                            <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>par Dr {resolved}</div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {/* Modification (si différente de création) */}
                    {selectedItem.updatedAt && selectedItem.updatedAt !== selectedItem.createdAt && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -22, top: 2, width: 14, height: 14, borderRadius: '50%', background: '#f59e0b', border: '2px solid #fff', boxShadow: '0 0 0 2px #f59e0b' }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>Dernière modification</div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{formatDate(selectedItem.updatedAt)}</div>
                        </div>
                      </div>
                    )}
                    {/* Statut final */}
                    {selectedItem.statut && (() => {
                      const s = selectedItem.statut;
                      const isOk = s === 'ACTIVE' || s === 'EXECUTEE' || s === 'validé' || s === 'CREEE';
                      const isKo = s === 'ANNULEE' || s === 'REJETEE' || s === 'EXPIREE';
                      const dotColor = isOk ? '#22c55e' : isKo ? '#ef4444' : '#6366f1';
                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
                          <div style={{ position: 'absolute', left: -22, top: 2, width: 14, height: 14, borderRadius: '50%', background: dotColor, border: '2px solid #fff', boxShadow: `0 0 0 2px ${dotColor}` }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>Statut actuel</div>
                            <div style={{ fontSize: 11, marginTop: 2 }}>
                              <span style={{ padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: isOk ? '#d1fae5' : isKo ? '#fee2e2' : '#ede9fe', color: isOk ? '#065f46' : isKo ? '#991b1b' : '#5b21b6' }}>{s}</span>
                            </div>
                            {selectedItem.motifRefus && (
                              <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4 }}>Motif : {selectedItem.motifRefus}</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── FOOTER ── */}
              <button
                onClick={() => setShowModal(false)}
                style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '.2px' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
