'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchMedicaments, searchKits, getKitItems } from '@/features/prescription/lib/api';
import { Medicament, StockItem } from './types';
import { formatAriary, nowDateStr, nowHeureStr } from './utils';
import AutocompleteInput from '../AutocompleteInput';
import ItemNotifierSelector from '../ItemNotifierSelector';
import { Urgence, urgenceClasses } from '../types';
import { Icone } from '@/components/ui/Icone';

interface Props {
  patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
  isAccueil: boolean;
  onAdd: (med: Medicament) => void;
  onUrgenceChange?: (v: string) => void;
  onNomMedecinChange?: (v: string) => void;
  onNumeroONMChange?: (v: string) => void;
  serviceId?: string;
  serviceName?: string;
  chuId?: string;
}

export default function MedicamentAddForm({ patientType, isAccueil, onAdd, onUrgenceChange, onNomMedecinChange, onNumeroONMChange, serviceId, serviceName, chuId }: Props) {
  const [nom, setNom] = useState('');
  const [dose, setDose] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [quantiteType, setQuantiteType] = useState('COMPRIME');
  const [voie, setVoie] = useState('');
  const [frequenceType, setFrequenceType] = useState('');
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [jno, setJno] = useState(false);
  const [dateDebut, setDateDebut] = useState(nowDateStr);
  const [heureDebut, setHeureDebut] = useState(nowHeureStr);
  const [instructions, setInstructions] = useState('');
  const [remarques, setRemarques] = useState('');
  const [selectedPrixUnitaire, setSelectedPrixUnitaire] = useState<number>(0);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [notifierInfirmier, setNotifierInfirmier] = useState(false);
  const [serviceNotifId, setServiceNotifId] = useState('');

  // Mapping entre valeurs affichées (user-friendly) et valeurs backend (enum)
  const quantiteTypeMapping: Record<string, string> = {
    'Unité': 'UNITE',
    'Boîte': 'BOITE',
    'Gélule': 'GELULE',
    'Cachet': 'CACHET',
    'Comprimé': 'COMPRIME',
    'ml': 'ML',
    'L': 'L',
    'g': 'G',
    'mg': 'MG',
    'µg': 'UG',
    'Goutte': 'GOUTTE',
    'Flacon': 'FLACON',
    'Sachet': 'SACHET',
    'Poche': 'POCHE',
    'Ampoule': 'AMPOULE',
    'Seringue': 'SERINGUE',
    'Patch': 'PATCH',
    'Suppositoire': 'SUPPOSITOIRE',
    'Ovule': 'OVULE',
    'Pommade (tube)': 'POMMADE_TUBE',
    'Crème (pot)': 'CREME_POT',
    'Spray': 'SPRAY',
    'Inhalateur': 'INHALATEUR',
  };

  const quantiteTypeSuggestions = Object.keys(quantiteTypeMapping);

  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [urgence, setUrgence] = useState<Urgence>('NORMAL');

  const [kitsDisponibles, setKitsDisponibles] = useState<any[]>([]);
  const [kitPrices, setKitPrices] = useState<Map<string, number>>(new Map());
  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [showKitDropdown, setShowKitDropdown] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const kitDropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Seul le médicament est obligatoire : dose, fréquence et durée sont facultatives.
  const isFrequenceRequired = false;
  const isDureeRequired = false;

  const isFormValid = nom.trim()
    && (!isFrequenceRequired || (frequenceType && (frequenceType === 'SOS' || frequenceType === 'CONTINU' || frequenceValeur > 0)))
    && (!isDureeRequired || dureeJours > 0);

  useEffect(() => {
    async function fetchKitsList() {
      try {
        const data = await searchKits();
        setKitsDisponibles(data);
        const prices = new Map<string, number>();
        for (const kit of data) {
          if (kit.price != null && Number(kit.price) > 0) {
            prices.set(kit.id, Number(kit.price));
          } else {
            try {
              const items = await getKitItems(kit.id);
              const total = (items || []).reduce((sum: number, item: any) => {
                const price = Number(item.purchase_price || item.prix || item.price || item.montant) || 0;
                const qty = item.quantiteDefaut || item.quantity || item.quantite || 1;
                return sum + price * qty;
              }, 0);
              if (total > 0) prices.set(kit.id, total);
            } catch (e) {
              // silently ignore kit item fetch errors
            }
          }
        }
        setKitPrices(prices);
      } catch {
        // silently ignore kit list fetch errors
      }
    }
    fetchKitsList();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (kitDropdownRef.current && !kitDropdownRef.current.contains(event.target as Node)) {
        setShowKitDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = useCallback(async (value: string) => {
    setNom(value);
    setSearchError('');
    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchMedicaments(value.trim());
        const mapped: StockItem[] = results
          .filter((item: any) => item.is_active !== false)
          .map((item: any) => ({
            code: item.id,
            nom: item.dci,
            dose: item.dosage,
            conditionnement: item.conditionnement,
            stockDisponible: item.stock_total || 0,
            forme: item.forme,
            purchasePrice: Number(item.purchase_price) || 0,
          }));
        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
      } catch (error) {
        setSearchError('Recherche stock indisponible');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, []);

  const fetchSampleMedicaments = useCallback(async () => {
    try {
      const results = await searchMedicaments('a');
      const mapped: StockItem[] = results
        .filter((item: any) => item.is_active !== false)
        .map((item: any) => ({
          code: item.id,
          nom: item.dci,
          dose: item.dosage,
          conditionnement: item.conditionnement,
          stockDisponible: item.stock_total || 0,
          forme: item.forme,
          purchasePrice: Number(item.purchase_price) || 0,
        }));
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch (error) {
      setSuggestions([]);
    }
  }, []);

  const selectSuggestion = (med: StockItem) => {
    const formePart = med.forme ? ` — ${med.forme}` : '';
    const nomComplet = `${med.nom} ${med.dose}${formePart} — ${med.conditionnement}`;
    setNom(nomComplet);
    setDose(med.dose || '');
    if (med.forme) {
      const matchedLabel = quantiteTypeSuggestions.find(
        s => s.toLowerCase() === med.forme!.toLowerCase()
      );
      if (matchedLabel) setQuantiteType(matchedLabel);
      else {
        const matchedValue = Object.entries(quantiteTypeMapping).find(
          ([, v]) => v.toLowerCase() === med.forme!.toLowerCase()
        );
        if (matchedValue) setQuantiteType(matchedValue[0]);
      }
    }
    setSelectedPrixUnitaire(med.purchasePrice || 0);
    setSelectedArticleId(med.code || '');
    setShowSuggestions(false);
  };

  function validateAddForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!nom.trim()) newErrors.nom = 'Le médicament est requis';
    if (isFrequenceRequired && !frequenceType) newErrors.frequenceType = 'Le type de fréquence est requis';
    if (isFrequenceRequired && (frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && frequenceValeur <= 0) {
      newErrors.frequenceValeur = 'La valeur de fréquence est requise';
    }
    if (isDureeRequired && dureeJours <= 0) newErrors.dureeJours = 'La durée en jours est requise';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const ajouterMedicament = () => {
    if (!validateAddForm()) return;
    // Convertir la valeur affichée en valeur backend
    const backendQuantiteType = quantiteTypeMapping[quantiteType] || quantiteType;
    onAdd({
      id: Date.now().toString(),
      nom, dose, quantite, quantiteType: backendQuantiteType, voie, frequenceType, frequenceValeur, dureeJours: jno ? 0 : dureeJours,
      dateDebut, heureDebut, instructions, remarques,
      prixUnitaire: selectedPrixUnitaire,
      articleId: selectedArticleId,
      notifierInfirmier,
      serviceNotifId: notifierInfirmier ? (serviceNotifId || serviceId) : undefined,
    });
    setNom(''); setDose(''); setQuantite(1); setQuantiteType('COMPRIME'); setVoie(''); setFrequenceType('');
    setFrequenceValeur(0); setDureeJours(0); setDateDebut(nowDateStr); setHeureDebut(nowHeureStr);
    setInstructions(''); setRemarques(''); setErrors({});
    setSelectedPrixUnitaire(0);
    setSelectedArticleId('');
    setShowSuggestions(false);
    setJno(false);
    setNotifierInfirmier(false);
    setServiceNotifId('');
  };

  const appliquerKit = async (kitId: string) => {
    setSelectedKitId(kitId);
    setShowKitDropdown(false);
    try {
      const items = await getKitItems(kitId);
      if (items && items.length > 0) {
        const newMedicaments = items.map((item: any) => ({
          id: Date.now().toString() + Math.random().toString(),
          nom: item.designation || item.nom || item.article_name,
          dose: item.unite || item.dosage || "",
          quantite: item.quantiteDefaut || item.quantity || item.quantite || 1,
          quantiteType: "UNITE",
          voie: item.voie || "",
          frequenceType: "PAR_JOUR",
          frequenceValeur: 1,
          dureeJours: 1,
          dateDebut: "",
          heureDebut: "",
          instructions: "Ajouté depuis le kit",
          remarques: "",
          prixUnitaire: Number(item.unitPrice || item.purchase_price || item.prix || 0),
          notifierInfirmier: false,
          serviceNotifId: undefined,
        }));
        newMedicaments.forEach((m: Medicament) => onAdd(m));
      }
    } catch {
      // Toast handled by parent
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        {/* ── Colonne gauche : prescription ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
            Médicament / consommable
          </div>

          {/* RECHERCHE MÉDICAMENT */}
          <div className="mb12" ref={wrapperRef} style={{ position: 'relative' }}>
            <label className="lbl">Médicament <span className="req">*</span></label>
            <div className="iw">
              <input type="text" value={nom}
                onChange={e => { handleSearchChange(e.target.value); if (errors.nom) setErrors({...errors, nom: ''}); }}
                onFocus={() => {
                  if (nom.trim().length > 0) {
                    setShowSuggestions(true);
                  } else {
                    fetchSampleMedicaments();
                  }
                }}
                placeholder="Rechercher dans le stock pharmacie..."
                style={errors.nom ? { borderColor: 'var(--red)' } : {}} />
              <span className="ico"><Icone nom="search" /></span>
            </div>
            {errors.nom && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.nom}</div>}
            {searchError && <div style={{ fontSize: 11, color: 'var(--amber-warn)', marginTop: 3 }}>{searchError}</div>}
            {showSuggestions && suggestions.length > 0 && (
              <ul style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: 200, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
                {suggestions.map((med) => (
                  <li key={med.code} onMouseDown={() => selectSuggestion(med)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span>{med.nom} {med.dose}{med.forme ? ` — ${med.forme}` : ''} — {med.conditionnement}</span>
                      {med.purchasePrice != null && med.purchasePrice > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, display: 'block', marginTop: 2 }}>
                          Prix unitaire : {formatAriary(med.purchasePrice)}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11,
                      color: med.stockDisponible > 0 ? 'var(--green)' : 'var(--red)',
                      marginLeft: 8,
                      fontWeight: 600
                    }}>
                      {med.stockDisponible > 0 ? `${med.stockDisponible} dispo` : 'Rupture'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">Le médicament est recherché dans le stock en détail de la pharmacie.</p>
          </div>

          {/* CHAMPS DU FORMULAIRE */}
          <div className="g2 mb12">
            <div>
              <label className="lbl">Dose</label>
              <input type="text" value={dose} onChange={e => { setDose(e.target.value); if (errors.dose) setErrors({...errors, dose: ''}); }} placeholder="Ex : 1g, 500mg" style={errors.dose ? { borderColor: 'var(--red)' } : {}} />
              {errors.dose && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.dose}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <AutocompleteInput label="Type / forme" value={quantiteType === 'COMPRIME' ? '' : quantiteType} onChange={v => setQuantiteType(v || 'COMPRIME')} suggestions={quantiteTypeSuggestions} storageKey="rx_suggestions_typeforme" placeholder="Taper un type..." />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl">Quantité</label>
                <input type="number" min={1} value={quantite} onChange={e => setQuantite(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
            </div>
          </div>
          <div className="mb12"><AutocompleteInput label="Voie d&apos;administration" value={voie} onChange={setVoie} suggestions={['Orale (per os)','Intraveineuse (IV)','Intramusculaire (IM)','Sous-cutanée (SC)','Rectale','Topique / locale','Inhalation','Sublinguale']} storageKey="rx_suggestions_voieadmin" placeholder="Sélectionner ou taper..." /></div>
          {/*
            Grille de frequence : `auto-fit` avec 150px minimum par champ, au lieu
            de trois `flex:1` qui comprimaient le select jusqu'a tronquer
            "Toutes les X heures". La case "Jusqu'a nouvelle ordre" passe sur sa
            propre ligne sous la grille pour ne plus decaler le champ "Duree".
          */}
          <div className="mb12">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label className="lbl">Type de fréquence {isFrequenceRequired ? <span className="req">*</span> : null}</label>
              <select value={frequenceType} onChange={e => { setFrequenceType(e.target.value); if (errors.frequenceType) setErrors({...errors, frequenceType: ''}); }} style={errors.frequenceType ? { borderColor: 'var(--red)' } : {}}>
                <option value="">Sélectionner</option>
                <option value="HEURES">Toutes les X heures</option>
                <option value="MINUTES">Toutes les X minutes</option>
                <option value="PAR_JOUR">X fois par jour</option>
                <option value="SOS">Si besoin</option>
                <option value="CONTINU">En continu (perfusion)</option>
              </select>
              {errors.frequenceType && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errors.frequenceType}</div>}
            </div>
            {(frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && (
              <div>
                <label className="lbl">Valeur</label>
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
          <div className="g2 mb12">
            <div><label className="lbl">Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}/></div>
            <div><label className="lbl">Heure de début</label><input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}/></div>
          </div>
        </div>

        {/* ── Colonne droite : contexte & instructions ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy, #006A8C)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
            Contexte & instructions
          </div>

          {/* URGENCE + ACCUEIL */}
          <div className="mb12">
            <label className="lbl">Degré d&apos;urgence</label>
            <div className={`urgr ${urgenceClasses[urgence as Urgence] || 'un'}`} style={{ marginBottom: 8 }}>
              <div className="urgd" />
              <select className="urgs" value={urgence} onChange={e => { setUrgence(e.target.value as Urgence); onUrgenceChange?.(e.target.value); }}>
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="TRES_URGENT">Très urgent</option>
              </select>
            </div>
            {isAccueil && (
              <>
                <div className="mb12">
                  <label className="lbl">Nom du médecin prescripteur *</label>
                  <input type="text" value={nomMedecin} onChange={e => { setNomMedecin(e.target.value); onNomMedecinChange?.(e.target.value); }} placeholder="Dr ..." />
                </div>
                <div className="mb12">
                  <label className="lbl">N° ONM *</label>
                  <input type="text" value={numeroONM} onChange={e => { setNumeroONM(e.target.value); onNumeroONMChange?.(e.target.value); }} placeholder="ONM-..." />
                </div>
              </>
            )}
          </div>

          {/* KIT SELECTOR */}
          <div className="mb12" ref={kitDropdownRef} style={{ position: 'relative' }}>
            <label className="lbl">Appliquer un Kit de Soin / Examen</label>
            <div
              onClick={() => setShowKitDropdown(!showKitDropdown)}
              style={{
                padding: '8px 12px', border: '1px solid var(--bdr)', borderRadius: 8,
                background: 'var(--card)', cursor: 'pointer', fontSize: 13,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ color: selectedKitId ? 'var(--txt)' : 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {selectedKitId
                  ? (() => {
                      const sel = kitsDisponibles.find((k) => k.id === selectedKitId);
                      const selPrice = sel?.price ?? kitPrices.get(selectedKitId);
                      return (
                        <>
                          <span>{sel?.designation || sel?.nom || 'Kit sélectionné'}</span>
                          {sel?.is_don && (
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4 }}>Gratuit</span>
                          )}
                          {selPrice != null && selPrice > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600 }}>{formatAriary(selPrice)}</span>
                          )}
                        </>
                      );
                    })()
                  : '-- Aucun kit sélectionné --'}
              </span>
              <Icone nom={showKitDropdown ? 'expand_less' : 'expand_more'} style={{ fontSize: 16, color: 'var(--txt3)' }} />
            </div>
            {showKitDropdown && (
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2,
                background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30,
                maxHeight: 220, overflowY: 'auto',
              }}>
                <div
                  onClick={() => { setSelectedKitId(''); setShowKitDropdown(false); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--txt3)', borderBottom: '1px solid var(--bdr)' }}
                >
                  -- Aucun kit sélectionné --
                </div>
                {kitsDisponibles.map((kit) => {
                  const price = kit.price ?? kitPrices.get(kit.id);
                  const isDon = kit.is_don === true;
                  return (
                    <div
                      key={kit.id}
                      onClick={() => appliquerKit(kit.id)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                        borderBottom: '1px solid var(--bdr)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: selectedKitId === kit.id ? 'var(--navy-lt)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {kit.designation || kit.nom}
                        </span>
                        {isDon && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                            background: '#dcfce7', color: '#166534', padding: '1px 5px',
                            borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            Gratuit
                          </span>
                        )}
                        {kit.stock != null && (
                          <span style={{
                            fontSize: 10, color: kit.stock > 0 ? 'var(--green)' : 'var(--red)',
                            fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            {kit.stock} dispo
                          </span>
                        )}
                      </div>
                      {price != null && price > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
                          {formatAriary(price)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="hint">Sélectionner un kit ajoutera automatiquement ses éléments à la liste ci-dessous.</p>
          </div>

          <div className="mb12"><label className="lbl">Instructions d&apos;utilisation</label><input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ex : à prendre après les repas..."/></div>
          <div className="mb12"><label className="lbl">Remarques</label><input type="text" value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Précisions complémentaires..."/></div>

          <ItemNotifierSelector
            notifier={notifierInfirmier}
            setNotifier={setNotifierInfirmier}
            serviceNotifId={serviceNotifId}
            setServiceNotifId={setServiceNotifId}
            defaultServiceId={serviceId}
            serviceName={serviceName}
            chuId={chuId}
          />
        </div>
      </div>

      <button className="badd" onClick={ajouterMedicament} style={{ opacity: isFormValid ? 1 : 0.5, width: '100%', marginTop: 8 }}>
        <Icone nom="add" style={{fontSize:16}} /> Ajouter à la prescription
      </button>
    </>
  );
}
