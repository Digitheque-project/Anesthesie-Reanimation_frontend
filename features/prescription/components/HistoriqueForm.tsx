"use client";
import { useState, useEffect } from 'react';
import { getHistoriquePatient } from '@/features/prescription/lib/api';
import { Icone } from '@/components/ui/Icone';

const FILTRES = [
  { id: 'all',   label: 'Tout',             icon: 'list' },
  { id: 'medicale',   label: 'Médicamenteuse',   icon: 'medication' },
  { id: 'nonMedicale',    label: 'Non Médicamenteuse', icon: 'self_care' },
  { id: 'soinsInfirmier', label: 'Soins / Actes', icon: 'health_and_safety' },
  { id: 'surveillance',  label: 'Surveillance',     icon: 'monitor_heart' },
  { id: 'transfusion', label: 'Transfusion sanguine', icon: 'bloodtype' },
  { id: 'labo',  label: 'Laboratoire',      icon: 'science' },
  { id: 'imagerie',  label: 'Imagerie',         icon: 'radiology' },
  { id: 'anapath',   label: 'Anapath',          icon: 'biotech' },
  { id: 'endoscopie',  label: 'Endoscopie',       icon: 'visibility' },
  { id: 'dialyse',  label: 'Dialyse',          icon: 'water_full' },
  { id: 'eeg',   label: 'EEG',              icon: 'neurology' },
  { id: 'ecg',   label: 'ECG',              icon: 'favorite' },
  { id: 'polysomnographie', label: 'Polysomnographie', icon: 'bedtime' },
  { id: 'orl',   label: 'ORL',              icon: 'hearing' },
  { id: 'actesOrl', label: 'Actes ORL',     icon: 'hearing' },
  { id: 'kine',  label: 'Kinésithérapie',   icon: 'exercise' },
  { id: 'bloc',  label: 'Intervention chirurgicale',  icon: 'medical_services' },
  { id: 'cpa',   label: 'CPA',                        icon: 'local_hospital' },
];

const TYPE_COLORS: Record<string, string> = {
  medicale:   '#3b82f6', nonMedicale:   '#8b5cf6', soinsInfirmier: '#0891b2',
  surveillance:  '#10b981', transfusion: '#ef4444', labo: '#0369a1', imagerie:  '#06b6d4',
  eeg:   '#6366f1', ecg: '#dc2626', polysomnographie: '#7c3aed', orl: '#0284c7', actesOrl: '#0e7490',
  kine: '#84cc16', endoscopie:  '#2563eb',
  dialyse:  '#14b8a6', anapath:  '#ec4899', bloc:  '#1e40af', cpa:  '#1e40af',
};

const ENDPOINTS: Record<string, string> = {
  medicale:   'prescriptions/medicale',
  nonMedicale:    'prescriptions/non-medicale',
  soinsInfirmier: 'prescriptions/soins-infirmier',
  surveillance:  'prescriptions/surveillance',
  transfusion: 'prescriptions/transfusion',
  labo:  'prescriptions/labo',
  imagerie:  'prescriptions/imagerie',
  eeg:   'prescriptions/eeg',
  ecg:   'prescriptions/ecg',
  polysomnographie: 'prescriptions/polysomnographie',
  orl:   'prescriptions/orl',
  actesOrl: 'prescriptions/actes-orl',
  kine:  'prescriptions/kine',
  endoscopie:  'prescriptions/endoscopie',
  dialyse:  'prescriptions/dialyse',
  anapath:   'prescriptions/anapath',
  bloc:  'prescriptions/bloc',
  cpa:   'prescriptions/cpa',
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
  motif?: string;
  dateSouhaitee?: string;
  renseignements?: string;
  renseignementsCliniques?: string;
  notes?: string;
  notifierInfirmier?: boolean;
  nomMedecinPrescripteur?: string;
  numeroONM?: string;
  prescripteurId?: string;
  prescripteur?: { nom?: string; prenoms?: string } | null;
  serviceIdSource?: string;
  serviceIdDest?: string;
  premierSoin?: boolean;
  aJeun?: boolean;
  motifRefus?: string;
  medicaments?: PrescriptionItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cocktails?: any[];
  items?: PrescriptionItem[];
  parametres?: PrescriptionItem[];
  analyses?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  examens?: Record<string, any>;
  typeEEG?: string;
  typeKine?: string;
  diagnostic?: string;
  contreIndications?: string[];
  autreContreIndic?: string;
  objectifs?: string;
  typeExamen?: string;
  typeActe?: string;
  typePrescription?: string;
  motifConsultation?: string;
  serviceOrigine?: string;
  nomAgentAccueil?: string;
  typeDialyse?: string;
  numeroCycle?: string | number;
  jourCycle?: string | number;
  dateDebutEffective?: string;
  data?: Record<string, unknown>;
  demandes?: PrescriptionItem[];
  libelle?: string;
  risqueHemorragique?: string;
  typeChirurgie?: string;
  chirurgien?: string;
  consignes?: string;
  dateIntervention?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // Soins infirmier specific
  valeur?: string;
  // Dialyse specific
  diagnosticRenal?: string;


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
  interpretation?: string;
  interpreteParId?: string;
  interpreteLe?: string;
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
  const [availableTypes, setAvailableTypes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<PrescriptionItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [medicamentFilter, setMedicamentFilter] = useState('');
  const [examenFilter, setExamenFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  const activeAdvancedFiltersCount = [periodeFilter, dateFrom, dateTo, medicamentFilter, examenFilter].filter(v => v && v.trim()).length;

  useEffect(() => {
    if (activeAdvancedFiltersCount > 0) {
      setShowAdvancedFilters(true);
    }
  }, []);

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
        if (filtre === 'all' && Array.isArray(results)) {
          const types = new Set<string>();
          results.forEach((item: PrescriptionItem) => { if (item._type) types.add(item._type); });
          setAvailableTypes(types);
        }
      } catch (e: unknown) {
        setError('Erreur lors du chargement : ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        setLoading(false);
      }
    }
    fetchHistorique();
  }, [filtre, patient?.id, periodeFilter, dateFrom, dateTo, medicamentFilter, examenFilter]);

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
      case 'medicale':   {
        const parts: string[] = [];
        if (item.medicaments?.length) parts.push(`${item.medicaments.length} médicament(s)`);
        if (item.cocktails?.length) parts.push(`${item.cocktails.length} cocktail(s)`);
        return parts.length > 0 ? parts.join(' + ') : (item.medicament || item.nom || 'Médicament');
      }
      case 'nonMedicale':    return item.type || item.description || 'Non médicamenteuse';
      case 'surveillance':  return item.parametre || item.type || 'Surveillance';
      case 'transfusion': return item.produit || item.groupe || 'Transfusion';
      case 'labo':  return item.examen || item.analyse || 'Analyse laboratoire';
      case 'imagerie':  return getImagerieExamenType(item) || item.examen || item.type || 'Imagerie';
      case 'eeg':   return item.type || 'EEG';
      case 'ecg':   return item.renseignements || 'ECG';
      case 'polysomnographie': return item.renseignements || 'Polysomnographie';
      case 'orl':   return item.renseignements || 'ORL';
      case 'actesOrl': return item.demandes?.length ? `${item.demandes.length} acte(s) ORL` : 'Actes ORL';
      case 'soinsInfirmier': return item.items?.length ? `${item.items.length} acte(s)` : 'Soins infirmier';
      case 'kine':  return item.type || item.seance || 'Kinésithérapie';
      case 'endoscopie':  return item.type || 'Endoscopie';
      case 'dialyse':  return item.type || 'Dialyse';
      case 'anapath':   return item.examen || item.type || 'Anapath';
      case 'bloc':  return item.intervention || item.type || 'Intervention chirurgicale';
      case 'cpa':   return item.motif || 'Demande de CPA';
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      case 'medicale':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.remarques && renderDetailField('Remarques générales', item.remarques)}
            {item.notifierInfirmier !== undefined && renderDetailField('Notifier infirmier', item.notifierInfirmier ? 'Oui' : 'Non')}
            {item.premierSoin !== undefined && renderDetailField('Premier Soin', item.premierSoin ? 'Oui' : 'Non')}
            {item.numeroCycle && renderDetailField('Numéro de cycle', item.numeroCycle)}
            {item.jourCycle && renderDetailField('Jour du cycle', item.jourCycle)}
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
                    {renderDetailField('Fréquence', med.frequence || (med.frequenceType ? `${med.frequenceType} ${med.frequenceValeur || ''}`.trim() : undefined))}
                    {renderDetailField('Durée (jours)', med.dureeJours || med.duree)}
                    {renderDetailField('Date de début', med.dateDebut)}
                    {renderDetailField('Date début effective', med.dateDebutEffective)}
                    {renderDetailField('Heure de début', med.heureDebut)}
                    {renderDetailField('Instructions', med.instructions)}
                    {renderDetailField('Remarques', med.remarques)}
                    {med.premierSoin !== undefined && renderDetailField('Premier Soin', med.premierSoin ? 'Oui' : 'Non')}
                  </div>
                ))}
              </div>
            )}
            {item.cocktails && Array.isArray(item.cocktails) && item.cocktails.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#006A8C', marginBottom: 8 }}>
                  <Icone nom="science" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }} />
                  Cocktails de médicaments ({item.cocktails.length})
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {item.cocktails.map((cocktail: any, ci: number) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const totalComp = cocktail.composants?.reduce((s: number, c: any) => s + (c.quantite * (c.prixUnitaire || 0)), 0) || 0;
                  return (
                    <div key={ci} style={{ background: 'rgba(5,102,141,0.06)', borderLeft: '3px solid #006A8C', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                      {renderDetailField('Nom', cocktail.nom)}
                      {cocktail.instructionsMelange && renderDetailField('Instructions mélange', cocktail.instructionsMelange)}
                      {renderDetailField('Voie', cocktail.voie)}
                      {renderDetailField('Fréquence', cocktail.frequenceType ? `${cocktail.frequenceType} ${cocktail.frequenceValeur || ''}`.trim() : undefined)}
                      {renderDetailField('Durée (jours)', cocktail.dureeJours)}
                      {renderDetailField('Date de début', cocktail.dateDebut)}
                      {renderDetailField('Heure de début', cocktail.heureDebut)}
                      {renderDetailField('Instructions', cocktail.instructions)}
                      {renderDetailField('Remarques', cocktail.remarques)}
                      {cocktail.premierSoin !== undefined && renderDetailField('Premier Soin', cocktail.premierSoin ? 'Oui' : 'Non')}
                      {cocktail.composants && cocktail.composants.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4 }}>Composants ({cocktail.composants.length})</div>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {cocktail.composants.map((comp: any, cpi: number) => (
                            <div key={cpi} style={{ background: 'var(--bg2)', padding: 8, borderRadius: 6, marginBottom: 4, borderLeft: '2px solid #006A8C' }}>
                              {renderDetailField('Nom', comp.nom)}
                              {renderDetailField('Dose', comp.dose)}
                              {renderDetailField('Quantité', comp.quantite)}
                              {comp.prixUnitaire != null && renderDetailField('Prix unitaire', `${comp.prixUnitaire} Ar`)}
                              {comp.premierSoin !== undefined && renderDetailField('Premier Soin', comp.premierSoin ? 'Oui' : 'Non')}
                            </div>
                          ))}
                          {totalComp > 0 && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginTop: 4, textAlign: 'right' }}>
                              Total: {totalComp.toLocaleString('fr-FR')} Ar
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'nonMedicale':
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
                    {renderDetailField('Durée', itm.duree || (itm.dureeJours ? `${itm.dureeJours} jours` : undefined))}
                    {renderDetailField('Fréquence', itm.frequence || (itm.frequenceType ? `${itm.frequenceType} ${itm.frequenceValeur || ''}`.trim() : undefined))}
                    {renderDetailField('Date de début', itm.dateDebut)}
                    {renderDetailField('Heure de début', itm.heureDebut)}
                    {renderDetailField('Instructions', itm.instructions)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'surveillance':
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
                    {renderDetailField('Fréquence', param.frequence || (param.frequenceType ? `${param.frequenceType} ${param.frequenceValeur || ''}`.trim() : undefined))}
                    {renderDetailField('Durée', param.duree || (param.dureeJours ? `${param.dureeJours} jours` : undefined))}
                    {renderDetailField('Seuil', param.seuil)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'transfusion':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.atcdTransfusion !== undefined && renderDetailField('Antécédents transfusionnels', item.atcdTransfusion ? 'Oui' : 'Non')}
            {item.incident && renderDetailField('Incidents précédents', item.incident)}
            {item.groupage && renderDetailField('Groupage sanguin', item.groupage)}
            {item.hb && renderDetailField('Hémoglobine', item.hb)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
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
                    {renderDetailField('Statut', prod.statut)}
                    {renderDetailField('Motif de refus', prod.motifRefus)}
                    {prod.statutBanqueSang && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: prod.statutBanqueSang === 'VALIDEE' ? 'var(--green-lt)' : prod.statutBanqueSang === 'REFUSEE' ? 'var(--red-lt)' : prod.statutBanqueSang === 'LIVREE' ? 'var(--blue-ps-lt)' : 'var(--surface-alt)',
                          color: prod.statutBanqueSang === 'VALIDEE' ? 'var(--green-dk)' : prod.statutBanqueSang === 'REFUSEE' ? 'var(--red-dk)' : prod.statutBanqueSang === 'LIVREE' ? 'var(--blue-info)' : 'var(--txt2)',
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

      case 'imagerie':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderExamenDetails = (examen: any, idx: number) => {
          const exType = examen.typeExamen || examen.type || '';
          const typeLabel = exType.toUpperCase();
          return (
            <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
              {(examen.renseignementsCliniques || examen.renseignement) && renderDetailField('Renseignements cliniques / Diagnostic', examen.renseignementsCliniques || examen.renseignement)}
              {examen.questionRadio && renderDetailField('Question posée au radiologue', examen.questionRadio)}
              {renderDetailField('Type', typeLabel)}
              {typeLabel === 'SCANNER' && (
                <>
                  {renderDetailField('Sous-type', examen.scanType)}
                  {renderDetailField('Glasgow', examen.scanGlasgow || examen.glasgow)}
                  {renderDetailField('Agitation', examen.scanAgite || examen.agite)}
                  {renderDetailField('Allergie', examen.scanAllergie || examen.allergie)}
                  {renderDetailField('Détail allergie', examen.scanAllergieDetail || examen.allergieDetail)}
                  {renderDetailField('Créatinine', examen.scanCreatinine || examen.creatinine)}
                  {renderDetailField('Clairance', examen.scanClearance || examen.clearance)}
                  {renderDetailField('Diabète', examen.scanDiabete || examen.diabete)}
                </>
              )}
              {typeLabel === 'ECHOGRAPHIE' && (
                <>
                  {renderDetailField('Sous-type', examen.echoType)}
                  {examen.echoDoppler !== undefined && renderDetailField('Doppler', examen.echoDoppler ? 'Oui' : 'Non')}
                </>
              )}
              {typeLabel === 'RADIOGRAPHIE' && (
                <>
                  {renderDetailField('Sous-type', examen.rxType)}
                  {examen.rxIncidences && Array.isArray(examen.rxIncidences) && renderDetailField('Incidences', examen.rxIncidences.join(', '))}
                </>
              )}
              {typeLabel === 'GESTE' && (
                <>
                  {renderDetailField('Sous-type', examen.gesteType)}
                </>
              )}
              {typeLabel === 'RADIO_SPECIALE' && (
                <>
                  {renderDetailField('Sous-type', examen.rxspType)}
                  {renderDetailField('Préparation', examen.rxspPrep || examen.preparation)}
                </>
              )}
              {renderDetailField('Précisions', examen.scanPrecisions || examen.echoPrecisions || examen.rxPrecisions || examen.gestePrecisions || examen.rxspPrecisions || examen.precisions)}
            </div>
          );
        };

        const hasExamensArray = item.examens && Array.isArray(item.examens) && item.examens.length > 0;

        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.statutPatient && renderDetailField('Statut patient', item.statutPatient)}
            {item.typeExamen && renderDetailField("Type d'examen", item.typeExamen)}
            {getImagerieExamenType(item) && !hasExamensArray && renderDetailField("Examen demandé", getImagerieExamenType(item))}
            {hasExamensArray && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Examens demandés ({item.examens?.length || 0})</div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {item.examens?.map((examen: any, idx: number) => renderExamenDetails(examen, idx))}
              </div>
            )}
            {!hasExamensArray && (() => {
              const modaliteKey = getImagerieModaliteKey(item.typeExamen);
              const examData = modaliteKey && item.examens ? item.examens[modaliteKey] : null;
              const isScanner = item.typeExamen?.toUpperCase() === 'SCANNER';
              const isCurrentFormat = examData && typeof examData === 'object' && !Array.isArray(examData);
              if (isScanner && isCurrentFormat && examData) {
                return (
                  <div style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginTop: 8 }}>
                    {renderDetailField('Glasgow', examData.glasgow)}
                    {renderDetailField('Agitation', examData.agite)}
                    {renderDetailField('Allergie', examData.allergie)}
                    {examData.allergieDetail && renderDetailField('Détail allergie', examData.allergieDetail)}
                    {renderDetailField('Créatinine', examData.creatinine)}
                    {renderDetailField('Clairance', examData.clearance)}
                    {renderDetailField('Diabète', examData.diabete)}
                    {renderDetailField('Précisions', examData.precisions)}
                    {renderDetailField('Préparation', examData.preparation)}
                  </div>
                );
              }
              if (isCurrentFormat && examData) {
                return (
                  <div style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginTop: 8 }}>
                    {renderDetailField('Précisions', examData.precisions)}
                    {renderDetailField('Préparation', examData.preparation)}
                  </div>
                );
              }
              if (!isCurrentFormat && item.examens && typeof item.examens === 'object' && Object.keys(item.examens).length > 0) {
                return (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Examens demandés:</div>
                    {Object.entries(item.examens).map(([typeEx, exams]: [string, unknown]) => {
                      if (!Array.isArray(exams)) return null;
                      return (
                        <div key={typeEx} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', textTransform: 'capitalize' }}>{typeEx}:</div>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {exams.map((exam: any, idx: number) => {
                            if (exam && typeof exam === 'object') {
                              return (
                                <div key={idx} style={{ background: 'var(--bg2)', padding: 8, borderRadius: 6, marginTop: 4, marginLeft: 8 }}>
                                  {(exam.renseignementsCliniques || exam.renseignement) && renderDetailField('Renseignements cliniques / Diagnostic', exam.renseignementsCliniques || exam.renseignement)}
                                  {exam.questionRadio && renderDetailField('Question posée au radiologue', exam.questionRadio)}
                                  {exam.type && renderDetailField('Type', exam.type)}
                                  {exam.precisions && renderDetailField('Précisions', exam.precisions)}
                                  {exam.preparation && renderDetailField('Préparation', exam.preparation)}
                                  {exam.glasgow && renderDetailField('Glasgow', exam.glasgow)}
                                  {exam.agite && renderDetailField('Agitation', exam.agite)}
                                  {exam.allergie && renderDetailField('Allergie', exam.allergie)}
                                  {exam.allergieDetail && renderDetailField('Détail allergie', exam.allergieDetail)}
                                  {exam.creatinine && renderDetailField('Créatinine', exam.creatinine)}
                                  {exam.clearance && renderDetailField('Clairance', exam.clearance)}
                                  {exam.diabete && renderDetailField('Diabète', exam.diabete)}
                                  {exam.doppler !== undefined && renderDetailField('Doppler', exam.doppler ? 'Oui' : 'Non')}
                                  {exam.incidences && Array.isArray(exam.incidences) && renderDetailField('Incidences', exam.incidences.join(', '))}
                                </div>
                              );
                            }
                            return <div key={idx} style={{ fontSize: 12, marginLeft: 8 }}>• {String(exam)}</div>;
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
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

      case 'ecg':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
          </div>
        );

      case 'polysomnographie':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
          </div>
        );

      case 'orl':
        return (
          <div>
            {item.typePrescription && renderDetailField('Type', item.typePrescription === 'CONSULTATION' ? 'Demande de consultation' : 'Prescription d\'examens')}
            {item.motifConsultation && renderDetailField('Motif de la demande', item.motifConsultation)}
            {item.serviceOrigine && renderDetailField('Service d\'origine', item.serviceOrigine)}
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.demandes && Array.isArray(item.demandes) && item.demandes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Actes ORL demandés ({item.demandes.length})</div>
                {item.demandes.map((dem: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type d\'acte', dem.typeActe || dem.typeExamen)}
                    {dem.renseignementsCliniques && renderDetailField('Renseignements cliniques', dem.renseignementsCliniques)}
                    {dem.remarques && renderDetailField('Remarques', dem.remarques)}
                  </div>
                ))}
              </div>
            )}
            {item.nomAgentAccueil && renderDetailField('Agent d\'accueil', item.nomAgentAccueil)}
          </div>
        );

      case 'actesOrl':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
            {item.demandes && Array.isArray(item.demandes) && item.demandes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Actes ORL demandés ({item.demandes.length})</div>
                {item.demandes.map((dem: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type d\'acte', dem.typeActe || dem.type || dem.typeExamen)}
                    {dem.renseignementsCliniques && renderDetailField('Renseignements cliniques', dem.renseignementsCliniques)}
                    {dem.remarques && renderDetailField('Remarques', dem.remarques)}
                  </div>
                ))}
              </div>
            )}
            {item.nomAgentAccueil && renderDetailField('Agent d\'accueil', item.nomAgentAccueil)}
          </div>
        );

      case 'soinsInfirmier':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.notifierInfirmier !== undefined && renderDetailField('Notifier infirmier', item.notifierInfirmier ? 'Oui' : 'Non')}
            {item.items && Array.isArray(item.items) && item.items.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Actes ({item.items.length})</div>
                {item.items.map((itm: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type', itm.typeLabel || itm.type)}
                    {renderDetailField('Description', itm.description)}
                    {renderDetailField('Durée', itm.duree || (itm.dureeJours ? `${itm.dureeJours} jours` : undefined))}
                    {renderDetailField('Fréquence', itm.frequence || (itm.frequenceType ? `${itm.frequenceType} ${itm.frequenceValeur || ''}`.trim() : undefined))}
                    {renderDetailField('Date de début', itm.dateDebut)}
                    {renderDetailField('Heure de début', itm.heureDebut)}
                    {renderDetailField('Instructions', itm.instructions)}
                  </div>
                ))}
              </div>
            )}
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

      case 'endoscopie':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.demandes && Array.isArray(item.demandes) && item.demandes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Examens demandés ({item.demandes.length})</div>
                {item.demandes.map((dem: PrescriptionItem, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type d\'examen', dem.typeExamen)}
                    {renderDetailField('Renseignements cliniques', dem.renseignementsCliniques)}
                    {renderDetailField('Remarques', dem.remarques)}
                  </div>
                ))}
              </div>
            )}
            {!item.demandes && item.typeExamen && renderDetailField("Type d'examen", item.typeExamen)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
          </div>
        );

      case 'dialyse':
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.diagnosticRenal && renderDetailField('Diagnostic rénal', item.diagnosticRenal)}
            {item.observationsTol && renderDetailField('Observations tolérance', item.observationsTol)}
            {item.remarques && renderDetailField('Remarques', item.remarques)}
            {item.motifRefus && renderDetailField('Motif de refus', item.motifRefus)}
          </div>
        );

      case 'anapath':
        const ANA_TYPE_LABELS: Record<string, string> = {
          fcv: 'Frottis Cervico-Vaginal',
          cyto: 'Cytoponction',
          liq: 'Liquide',
          bio: 'Biopsie',
          pos: 'Pièce Opératoire',
          poc: 'Prélèvement Opératoire au Crible',
          ext: 'Extemporané',
        };
        const ANA_FIELD_LABELS: Record<string, string> = {
          renseign: 'Renseignements cliniques',
          renseignementsCliniques: 'Renseignements cliniques',
          fcvService: 'Service', fcvGPA: 'GPA', fcvDDR: 'DDR', fcvMeno: 'Ménorragies',
          fcvMenarche: 'Ménarche', fcvRapport: 'Rapport', fcvContra: 'Contraception',
          fcvTtt: 'Traitement', fcvPapLieu: 'Lieu Pap', fcvPapNb: 'Nb Pap',
          fcvPapDate: 'Date Pap', fcvPapRes: 'Résultat Pap', fcvAtcd: 'ATCD',
          fcvMeth: 'Méthode', fcvNote: 'Note',
          cytoService: 'Service', cytoSiege: 'Siège', cytoOrgane: 'Organe',
          cytoFix: 'Fixateur', cytoFixAutre: 'Autre fixateur', cytoNotes: 'Notes',
          liqService: 'Service', liqUnite: 'Unité', liqNat: 'Nature',
          liqNatAutre: 'Autre nature', liqNotes: 'Notes',
          bioService: 'Service', bioExamAnt: 'Examen antérieur', bioResAnt: 'Résultat antérieur',
          bioGPA: 'GPA', bioDDR: 'DDR', bioMeno: 'Ménorragies', bioAtcd: 'ATCD',
          bioDatePrelev: 'Date prélèvement', bioFixateur: 'Fixateur', bioOrgane: 'Organe',
          bioNature: 'Nature', bioNatureAutre: 'Autre nature', bioSuspicion: 'Suspicion',
          bioFaitA: 'Fait à', bioFaitLe: 'Fait le', bioNote: 'Note',
          extService: 'Service', extChirurgien: 'Chirurgien', extIntervention: 'Intervention',
          extNature: 'Nature', extOrgane: 'Organe', extQuestion: 'Question',
          extDatePrevue: 'Date prévue', extHeure: 'Heure', extNote: 'Note',
        };
        return (
          <div>
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.renseignements && renderDetailField('Renseignements cliniques', item.renseignements)}
            {item.demandes && Array.isArray(item.demandes) && item.demandes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Demandes anapath ({item.demandes.length})</div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {item.demandes.map((dem: any, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
                    {renderDetailField('Type d\'examen', ANA_TYPE_LABELS[dem.typeExamen] || dem.typeExamen)}
                    {dem.renseign && renderDetailField('Renseignements cliniques', dem.renseign)}
                    {Object.entries(dem).filter(([k, v]) => v && k !== 'id' && k !== 'typeExamen' && k !== 'renseign').map(([key, value]) => (
                      renderDetailField(ANA_FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1), value)
                    ))}
                  </div>
                ))}
              </div>
            )}
            {!item.demandes && item.typeExamen && renderDetailField("Type d'examen", item.typeExamen)}
            {item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Détails:</div>
                {Object.entries(item.data).map(([key, value]: [string, unknown]) => (
                  <div key={key}>
                    {renderDetailField(ANA_FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1), value)}
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

      case 'cpa':
        return (
          <div>
            {item.motif && renderDetailField('Motif', item.motif)}
            {renderDetailField("Degré d'urgence", getUrgenceLabel(item.urgence))}
            {item.dateSouhaitee && renderDetailField('Date souhaitée', new Date(item.dateSouhaitee).toLocaleDateString('fr-FR'))}
            {item.alertes && renderDetailField('Alertes', item.alertes)}
            {item.consignes && renderDetailField('Consignes', item.consignes)}
            {item.nomMedecinPrescripteur && renderDetailField('Médecin prescripteur', item.nomMedecinPrescripteur)}
            {item.numeroONM && renderDetailField('N° ONM', item.numeroONM)}
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
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
          {items.length} prescription{items.length > 1 ? 's' : ''} trouvée{items.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* FILTRES */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {FILTRES.filter(f => f.id === 'all' || availableTypes.has(f.id)).map(f => {
          const active = filtre === f.id;
          return (
            <button key={f.id} onClick={() => setFiltre(f.id)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: active ? 'none' : '1px solid var(--bdr)',
              background: active ? (f.id === 'all' ? 'var(--navy)' : TYPE_COLORS[f.id] || 'var(--navy)') : 'var(--card)',
              color: active ? '#fff' : 'var(--txt2)',
              cursor: 'pointer', transition: 'all .15s',
            }}>
              <Icone nom={f.icon} style={{ fontSize: 14 }} />
              {f.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            border: showAdvancedFilters ? 'none' : '1px solid var(--bdr)',
            background: showAdvancedFilters ? 'var(--navy)' : 'var(--card)',
            color: showAdvancedFilters ? '#fff' : 'var(--txt2)',
            cursor: 'pointer', transition: 'all .15s',
          }}
        >
          <Icone nom="tune" style={{ fontSize: 14 }} />
          Filtres avancés
          {activeAdvancedFiltersCount > 0 && (
            <span style={{
              background: 'var(--red)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 10,
              minWidth: 18,
              textAlign: 'center',
            }}>
              {activeAdvancedFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvancedFilters && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 20,
          padding: 12,
          background: 'var(--card)',
          border: '1px solid var(--bdr)',
          borderRadius: 8,
        }}>
          <div>
            <label className="lbl" style={{ fontSize: 11, marginBottom: 4 }}>Période</label>
            <select
              value={periodeFilter}
              onChange={(e) => setPeriodeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                background: '#fff', color: 'var(--txt)', fontSize: 12,
              }}
            >
              <option value="">Toute période</option>
              <option value="jour">Aujourd&apos;hui</option>
              <option value="semaine">7 derniers jours</option>
              <option value="mois">30 derniers jours</option>
            </select>
          </div>
          <div>
            <label className="lbl" style={{ fontSize: 11, marginBottom: 4 }}>Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                background: '#fff', color: 'var(--txt)', fontSize: 12,
              }}
            />
          </div>
          <div>
            <label className="lbl" style={{ fontSize: 11, marginBottom: 4 }}>Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                background: '#fff', color: 'var(--txt)', fontSize: 12,
              }}
            />
          </div>
          <div>
            <label className="lbl" style={{ fontSize: 11, marginBottom: 4 }}>Médicament</label>
            <input
              type="text"
              value={medicamentFilter}
              onChange={(e) => setMedicamentFilter(e.target.value)}
              placeholder="Recherche..."
              style={{
                width: '100%',
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                background: '#fff', color: 'var(--txt)', fontSize: 12,
              }}
            />
          </div>
          <div>
            <label className="lbl" style={{ fontSize: 11, marginBottom: 4 }}>Examen</label>
            <input
              type="text"
              value={examenFilter}
              onChange={(e) => setExamenFilter(e.target.value)}
              placeholder="Recherche..."
              style={{
                width: '100%',
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bdr)',
                background: '#fff', color: 'var(--txt)', fontSize: 12,
              }}
            />
          </div>
        </div>
      )}

          {/* CONTENU */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}>
              <Icone nom="hourglass_top" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
              Chargement...
            </div>
          ) : error ? (
            <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: 16, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)' }}>
          <Icone nom="inbox" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
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
                  <Icone nom={FILTRES.find(f => f.id === item._type)?.icon || 'description'} style={{ fontSize: 18, color }} />
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 10, background: color + '20', color,
                    }}>
                      {getTypeLabel(item._type)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {formatDate(item.createdAt || item.date)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)', marginTop: 4 }}>
                    {getResume(item, item._type)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    {item.remarque || item.remarques || item.instructions ? (
                      <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                        {item.remarque || item.remarques || item.instructions}
                      </span>
                    ) : null}
                    {item.prescripteur && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icone nom="person" style={{ fontSize: 13 }} />
                        Dr {item.prescripteur.prenoms} {item.prescripteur.nom}
                      </span>
                    )}
                    {item.nomMedecinPrescripteur && !item.prescripteur && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icone nom="person" style={{ fontSize: 13 }} />
                        {item.nomMedecinPrescripteur}
                      </span>
                    )}
                  </div>
                </div>

                {/* Statut */}
                  {item.statut && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 10, flexShrink: 0,
                    background: item.statut === 'validé' ? 'var(--green-lt)' : 'var(--amber-lt)',
                    color: item.statut === 'validé' ? 'var(--green-dk)' : 'var(--amber-dk)',
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
          background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(2px)',
          padding: 16, overflow: 'hidden', height: '100dvh', boxSizing: 'border-box',
        }} onClick={() => setShowModal(false)}>
          {/*
            Structure de defilement du modal de details.
            Avant : la carte entiere etait `overflowY: auto`, donc l'en-tete colore
            et le bouton "Fermer" defilaient avec le contenu, et l'overlay pouvait
            defiler en meme temps (deux barres de defilement imbriquees).
            Maintenant : la carte est une colonne flex qui ne deborde pas
            (`overflow: hidden`), l'en-tete et le pied restent fixes
            (`flexShrink: 0`) et seule la zone centrale defile, avec
            `overscrollBehavior: contain` pour ne pas propager le defilement au
            dossier patient situe derriere.
          */}
          <div className="card" style={{
            maxWidth: 680, width: '100%',
            /* Une hauteur REELLE est indispensable : avec seulement maxHeight,
               certains navigateurs laissaient le corps flex garder sa hauteur
               naturelle et coupaient le bas sans creer de zone scrollable. */
            height: 'min(88dvh, 900px)', maxHeight: 'calc(100dvh - 32px)', minHeight: 0,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            padding: 0, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }} onClick={(e) => e.stopPropagation()}>

            {/* ── HEADER coloré ── */}
            {(() => {
              const color = TYPE_COLORS[selectedItem._type] || '#1e3a5f';
              const icon = FILTRES.find(f => f.id === selectedItem._type)?.icon || 'description';
              const label = getTypeLabel(selectedItem._type);
              return (
                <div style={{ background: color, padding: '20px 24px', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icone nom={icon} style={{ fontSize: 22, color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '.2px' }}>Prescription {label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{formatDate(selectedItem.createdAt || selectedItem.date)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedItem.urgence && selectedItem.urgence !== 'NORMAL' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: selectedItem.urgence === 'TRES_URGENT' ? 'var(--red)' : 'var(--amber)', color: '#fff' }}>
                        {getUrgenceLabel(selectedItem.urgence)}
                      </span>
                    )}
                    <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, transition: 'all .15s' }}>×</button>
                  </div>
                </div>
              );
            })()}

            <div className="psx-modal-scroll" style={{
              padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
              /* `scroll` (et non `auto`) garantit une vraie zone de defilement
                 et reserve toujours la barre, meme avant le premier geste. */
              flex: '1 1 0%', height: 0, minHeight: 0, overflowY: 'scroll', overflowX: 'hidden',
              overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y', scrollBehavior: 'smooth',
            }}>

              {/* ── STATUT ── */}
              {selectedItem.statut && (() => {
                const s = selectedItem.statut;
                const isOk = s === 'ACTIVE' || s === 'EXECUTEE' || s === 'validé' || s === 'CREEE';
                const isKo = s === 'ANNULEE' || s === 'REJETEE' || s === 'EXPIREE';
                const bg = isOk ? 'var(--green-lt)' : isKo ? 'var(--red-lt)' : 'var(--amber-lt)';
                const fg = isOk ? 'var(--green-dk)' : isKo ? 'var(--red-dk)' : 'var(--amber-dk)';
                const ic = isOk ? 'check_circle' : isKo ? 'cancel' : 'pending';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: bg }}>
                    <Icone nom={ic} style={{ fontSize: 18, color: fg }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>Statut : {s}</span>
                  </div>
                );
              })()}

              {/* ── SECTION PRESCRIPTEUR ── */}
              <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icone nom="stethoscope" style={{ fontSize: 16, color: 'var(--navy)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Prescripteur</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {selectedItem.nomMedecinPrescripteur ? (
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Dr {selectedItem.nomMedecinPrescripteur}</span>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--txt3)', fontStyle: 'italic' }}>Prescripteur non renseigné</span>
                    )}
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
                    {selectedItem.nomAgentAccueil && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)', padding: '2px 6px', borderRadius: 6, background: 'var(--bg2)' }}>Agent : {selectedItem.nomAgentAccueil}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SECTION PATIENT ── */}
              {patient && (patient.nom || patient.idPermanent) && (
                <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icone nom="person" style={{ fontSize: 16, color: 'var(--navy)' }} />
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
                          <Icone nom="bloodtype" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 3 }} />{patient.groupeSanguin}
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
                        <Icone nom="warning" style={{ fontSize: 14, color: '#92400e' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>Allergies : {patient.allergies.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SECTION DÉTAILS CLINIQUES ── */}
              <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icone nom="clinical_notes" style={{ fontSize: 16, color: 'var(--navy)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--navy)' }}>Détails cliniques</span>
                </div>
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--txt)', lineHeight: 1.7 }}>
                  {renderPrescriptionDetails(selectedItem, selectedItem._type)}
                </div>
              </div>

              {/* ── SECTION SUIVI / TIMELINE ── */}
              <div style={{ border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg2)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icone nom="history" style={{ fontSize: 16, color: 'var(--navy)' }} />
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
                        {selectedItem.nomMedecinPrescripteur && (
                          <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>par Dr {selectedItem.nomMedecinPrescripteur}</div>
                        )}
                      </div>
                    </div>
                    {/* Modification (si différente de création) */}
                    {selectedItem.updatedAt && selectedItem.updatedAt !== selectedItem.createdAt && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -22, top: 2, width: 14, height: 14, borderRadius: '50%', background: '#006A8C', border: '2px solid #fff', boxShadow: '0 0 0 2px #006A8C' }} />
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

            </div>

            {/* ── FOOTER ── hors de la zone de defilement, toujours visible */}
            <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid var(--bdr)', background: 'var(--card)', borderRadius: '0 0 16px 16px' }}>
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
