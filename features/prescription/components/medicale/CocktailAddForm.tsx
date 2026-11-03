'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchMedicaments } from '@/features/prescription/lib/api';
import { CocktailPrescription, CocktailComposant, StockItem } from './types';
import { formatAriary, nowDateStr, nowHeureStr } from './utils';
import AutocompleteInput from '../AutocompleteInput';
import ItemNotifierSelector from '../ItemNotifierSelector';
import { Icone } from '@/components/ui/Icone';

interface Props {
  isAccueil: boolean;
  onAdd: (cocktail: CocktailPrescription) => void;
  serviceId?: string;
  serviceName?: string;
  chuId?: string;
}

export default function CocktailAddForm({ onAdd, serviceId, serviceName, chuId }: Props) {
  const [nom, setNom] = useState('');
  const [instructionsMelange, setInstructionsMelange] = useState('');
  const [voie, setVoie] = useState('');
  const [frequenceType, setFrequenceType] = useState('');
  const [frequenceValeur, setFrequenceValeur] = useState<number>(0);
  const [dureeJours, setDureeJours] = useState<number>(0);
  const [jno, setJno] = useState(false);
  const [dateDebut, setDateDebut] = useState(nowDateStr);
  const [heureDebut, setHeureDebut] = useState(nowHeureStr);
  const [instructions, setInstructions] = useState('');
  const [remarques, setRemarques] = useState('');
  const [notifierInfirmier, setNotifierInfirmier] = useState(false);
  const [serviceNotifId, setServiceNotifId] = useState('');

  const [compNom, setCompNom] = useState('');
  const [compDose, setCompDose] = useState('');
  const [compQuantite, setCompQuantite] = useState(1);
  const [compPrixUnitaire, setCompPrixUnitaire] = useState<number>(0);
  const [compArticleId, setCompArticleId] = useState<string>('');

  const [composants, setComposants] = useState<CocktailComposant[]>([]);
  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const autoName = composants.length >= 2
    ? composants.map(c => `${c.nom} ${c.dose}`.trim()).join(' + ')
    : '';
  const isFormValid = composants.length >= 2;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = useCallback(async (value: string) => {
    setCompNom(value);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: any) => item.is_active !== false)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, []);

  const fetchSampleMedicaments = useCallback(async () => {
    try {
      const results = await searchMedicaments('a');
      const mapped: StockItem[] = results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => item.is_active !== false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch {
      setSuggestions([]);
    }
  }, []);

  const selectSuggestion = (med: StockItem) => {
    setCompNom(`${med.nom} ${med.dose}${med.forme ? ` — ${med.forme}` : ''}`);
    setCompDose(med.dose || '');
    setCompPrixUnitaire(med.purchasePrice || 0);
    setCompArticleId(med.code || '');
    setShowSuggestions(false);
  };

  const ajouterComposant = () => {
    if (!compNom.trim() || !compDose.trim()) return;
    const newComp: CocktailComposant = {
      id: Date.now().toString(),
      nom: compNom,
      dose: compDose,
      quantite: compQuantite,
      articleId: compArticleId || undefined,
      prixUnitaire: compPrixUnitaire || undefined,
      premierSoin: false,
    };
    setComposants(prev => [...prev, newComp]);
    setCompNom('');
    setCompDose('');
    setCompQuantite(1);
    setCompPrixUnitaire(0);
    setCompArticleId('');
    setShowSuggestions(false);
  };

  const retirerComposant = (id: string) => {
    setComposants(prev => prev.filter(c => c.id !== id));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (composants.length < 2) newErrors.composants = 'Au moins 2 composants requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const ajouterCocktail = () => {
    if (!validateForm()) return;
    onAdd({
      id: Date.now().toString(),
      nom: nom.trim() || autoName,
      instructionsMelange: instructionsMelange || undefined,
      voie: voie || undefined,
      frequenceType: frequenceType || undefined,
      frequenceValeur: frequenceValeur || undefined,
      dureeJours: !jno ? (dureeJours || undefined) : undefined,
      dateDebut: dateDebut || undefined,
      heureDebut: heureDebut || undefined,
      instructions: instructions || undefined,
      remarques: remarques || undefined,
      composants,
      notifierInfirmier,
      serviceNotifId: notifierInfirmier ? (serviceNotifId || serviceId) : undefined,
    });
    setNom('');
    setInstructionsMelange('');
    setVoie('');
    setFrequenceType('');
    setFrequenceValeur(0);
    setDureeJours(0);
    setJno(false);
    setDateDebut(nowDateStr);
    setHeureDebut(nowHeureStr);
    setInstructions('');
    setRemarques('');
    setComposants([]);
    setErrors({});
    setNotifierInfirmier(false);
    setServiceNotifId('');
  };

  const totalComposants = composants.reduce((s, c) => s + (c.quantite * (c.prixUnitaire || 0)), 0);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy)', marginBottom: 10, borderLeft: '3px solid var(--navy)', paddingLeft: 8 }}>
            Cocktails de médicaments
          </div>

          <div className="mb12">
            <label className="lbl">Nom du cocktail</label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Ex : Cocktail anti-douleur IV, Sérum anti-émétique..."
            />
            {!nom.trim() && autoName && (
              <p className="hint" style={{ fontStyle: 'italic', color: 'var(--navy, #006A8C)' }}>
                Nom auto-généré : {autoName}
              </p>
            )}
          </div>

          <div className="mb12">
            <label className="lbl">Instructions de mélange</label>
            <textarea
              rows={3}
              value={instructionsMelange}
              onChange={e => setInstructionsMelange(e.target.value)}
              placeholder="Ex : Diluer dans 250ml de NaCl 0.9%, perfuser sur 2 heures. Mélanger à l'abri de la lumière..."
            />
            <p className="hint">Instructions détaillées pour la préparation du mélange par l&apos;infirmière.</p>
          </div>

          <div className="mb12">
            <AutocompleteInput
              label="Voie d&apos;administration"
              value={voie}
              onChange={setVoie}
              suggestions={['Orale (per os)', 'Intraveineuse (IV)', 'Intramusculaire (IM)', 'Sous-cutanée (SC)', 'Rectale', 'Topique / locale', 'Inhalation', 'Sublinguale']}
              storageKey="rx_suggestions_voiecocktail"
              placeholder="Sélectionner ou taper..."
            />
          </div>

          {/*
            Grille de frequence (voir aussi MedicamentAddForm, NonMedicaleForm,
            SurveillanceForm, SoinsInfirmierForm : meme structure partout).
            Avant : `display:flex` avec trois enfants `flex:1`, donc chaque champ
            etait comprime a un tiers de la colonne et le libelle du select se
            tronquait en "Toutes les X...". Maintenant : grille `auto-fit` avec un
            minimum de 150px par champ, donc les champs passent a la ligne au lieu
            de se tronquer. La case "Jusqu'a nouvelle ordre" est sortie de la
            grille : posee au-dessus du champ "Duree", elle decalait ce champ
            verticalement et desalignait la rangee.
          */}
          <div className="mb12">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
              <div>
                <label className="lbl">Type de fréquence</label>
                <select value={frequenceType} onChange={e => setFrequenceType(e.target.value)}>
                  <option value="">Sélectionner</option>
                  <option value="HEURES">Toutes les X heures</option>
                  <option value="MINUTES">Toutes les X minutes</option>
                  <option value="PAR_JOUR">X fois par jour</option>
                  <option value="SOS">Si besoin</option>
                  <option value="CONTINU">En continu (perfusion)</option>
                </select>
              </div>
              {(frequenceType === 'HEURES' || frequenceType === 'MINUTES' || frequenceType === 'PAR_JOUR') && (
                <div>
                  <label className="lbl">Valeur</label>
                  <input type="number" min={1} value={frequenceValeur || ''} onChange={e => setFrequenceValeur(parseInt(e.target.value) || 0)} placeholder={frequenceType === 'HEURES' ? 'Ex : 8h' : frequenceType === 'MINUTES' ? 'Ex : 30' : 'Ex : 3x'} />
                </div>
              )}
              {!jno && (
                <div>
                  <label className="lbl">Durée (jours)</label>
                  <input type="number" min={1} value={dureeJours || ''} onChange={e => setDureeJours(parseInt(e.target.value) || 0)} placeholder="Ex : 7" />
                </div>
              )}
            </div>
            {['HEURES', 'MINUTES', 'PAR_JOUR'].includes(frequenceType) && (
              <label className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 8, marginBottom: 0, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={jno} onChange={e => setJno(e.target.checked)} /> Jusqu&apos;à nouvelle ordre
              </label>
            )}
          </div>

          <div className="g2 mb12">
            <div><label className="lbl">Date de début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} /></div>
            <div><label className="lbl">Heure de début</label><input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} /></div>
          </div>

          <div className="g2 mb12">
            <div><label className="lbl">Instructions</label><input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ex : à perfuser lentement..." /></div>
            <div><label className="lbl">Remarques</label><input type="text" value={remarques} onChange={e => setRemarques(e.target.value)} placeholder="Précisions..." /></div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--navy, #006A8C)', marginBottom: 10, borderLeft: '3px solid var(--navy, #006A8C)', paddingLeft: 8 }}>
            Composants du cocktail de médicaments ({composants.length})
          </div>

          {errors.composants && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{errors.composants}</div>}

          {composants.length > 0 && (
            <div className="mb12">
              {composants.map((comp) => (
                <div key={comp.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  background: 'var(--inp)', borderRadius: 8, marginBottom: 4, fontSize: 13,
                }}>
                  <Icone nom="medication" style={{ fontSize: 14, color: 'var(--navy, #006A8C)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{comp.dose}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 6, background: 'var(--navy)', color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                    qté {comp.quantite}
                  </span>
                  {comp.prixUnitaire != null && comp.prixUnitaire > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, flexShrink: 0 }}>{formatAriary(comp.prixUnitaire)}</span>
                  )}
                  <button
                    onClick={() => retirerComposant(comp.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 0, display: 'flex', flexShrink: 0 }}
                  >
                    <Icone nom="close" style={{ fontSize: 16 }} />
                  </button>
                </div>
              ))}
              {totalComposants > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--navy-lt)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                  <span>Total estimé</span>
                  <span>{formatAriary(totalComposants)}</span>
                </div>
              )}
            </div>
          )}

          <div ref={wrapperRef} style={{ position: 'relative' }} className="mb12">
            <label className="lbl">Rechercher un médicament composant</label>
            <div className="iw">
              <input
                type="text"
                value={compNom}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (compNom.trim().length > 0) setShowSuggestions(true);
                  else fetchSampleMedicaments();
                }}
                placeholder="Rechercher dans le stock pharmacie..."
              />
              <span className="ico"><Icone nom="search" /></span>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul style={{
                position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2,
                background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 30,
                maxHeight: 200, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0,
              }}>
                {suggestions.map((med) => (
                  <li key={med.code} onMouseDown={() => selectSuggestion(med)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span>{med.nom} {med.dose}{med.forme ? ` — ${med.forme}` : ''}</span>
                      {med.purchasePrice != null && med.purchasePrice > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, display: 'block', marginTop: 2 }}>
                          Prix : {formatAriary(med.purchasePrice)}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: med.stockDisponible > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {med.stockDisponible > 0 ? `${med.stockDisponible} dispo` : 'Rupture'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">Le médicament est recherché dans le stock en détail de la pharmacie.</p>
          </div>

          <div className="g2 mb12">
            <div>
              <label className="lbl">Dose du composant</label>
              <input type="text" value={compDose} onChange={e => setCompDose(e.target.value)} placeholder="Ex : 500mg, 10ml" />
            </div>
            <div>
              <label className="lbl">Quantité</label>
              <input type="number" min={1} value={compQuantite} onChange={e => setCompQuantite(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
          </div>

          <button
            className="badd"
            onClick={ajouterComposant}
            disabled={!compNom.trim() || !compDose.trim()}
            style={{
              opacity: compNom.trim() && compDose.trim() ? 1 : 0.5,
              width: '100%', marginBottom: 12,
            }}
          >
            <Icone nom="add" style={{ fontSize: 16 }} /> Ajouter le composant
          </button>

          {composants.length > 0 && (
            <div style={{ padding: '8px 12px', background: composants.length >= 2 ? 'rgba(34,197,94,0.08)' : 'var(--inp)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, border: composants.length >= 2 ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--bdr)' }}>
              <Icone nom={composants.length >= 2 ? 'check_circle' : 'info'} style={{ fontSize: 16, color: composants.length >= 2 ? 'var(--green)' : 'var(--txt3)' }} />
              <span style={{ color: composants.length >= 2 ? 'var(--green-dk)' : 'var(--txt3)' }}>
                {composants.length >= 2
                  ? `${composants.length} composants — cocktail valide`
                  : `Encore ${2 - composants.length} composant${2 - composants.length > 1 ? 's' : ''} minimum`}
              </span>
            </div>
          )}

          {/*
            Le selecteur de notification est isole dans un conteneur qui porte
            l'espacement bas (14px) : ItemNotifierSelector renvoie un fragment,
            son dernier enfant n'a donc aucune marge propre et le bouton
            "Valider le cocktail" se collait au bloc "Alerter l'infirmier ?".
          */}
          <div style={{ marginBottom: 14 }}>
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

          <button
            className="badd"
            onClick={ajouterCocktail}
            style={{
              opacity: isFormValid ? 1 : 0.5,
              pointerEvents: isFormValid ? 'auto' : 'none',
              width: '100%',
              background: 'var(--navy)', color: '#fff', fontWeight: 700,
              padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14,
            }}
          >
            <Icone nom="science" style={{ fontSize: 18 }} />
            Valider le cocktail ({composants.length} composant{composants.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </>
  );
}
