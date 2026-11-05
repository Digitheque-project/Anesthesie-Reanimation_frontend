'use client';

import { useEffect, useState } from 'react';
import DrawerPanel from '../DrawerPanel';
import { getAnalysesLaboEnRupture } from '@/features/prescription/lib/api';
import { Icone } from '@/components/ui/Icone';

// Le laboratoire bloque une analyse sous le nom de SON catalogue (« NFS »,
// « VSH », « TQ ») ; le formulaire la nomme autrement (« NFS complète »,
// « VSH 1ère heure », « TQ / TP »). Correspondance par mots entiers : « NFS »
// bloque « NFS complète », mais « TP » ne bloque pas « INR ».
function motsAnalyse(s: string): string[] {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function estAnalyseBloquee(nom: string, bloquees: Set<string>): boolean {
  if (bloquees.has(nom)) return true;
  const mots = motsAnalyse(nom);
  for (const b of bloquees) {
    const cle = motsAnalyse(b);
    if (cle.length === 0 || cle.length > mots.length) continue;
    for (let i = 0; i + cle.length <= mots.length; i++) {
      if (cle.every((m, j) => mots[i + j] === m)) return true;
    }
  }
  return false;
}

const CATEGORIES = [
  { id: 'hemato', label: '1. Hématologie & NFS', color: '#7c3aed', textColor: '#6d28d9', tube: 'Tube violet', analyses: ['NFS complète','Réticulocytes','VSH 1ère heure','VSH 2ème heure','Frottis sanguin','Groupage ABO / Rh','Test d\'Emmel (drépanocytose)'] },
  { id: 'hemostase', label: '2. Hémostase', color: '#0284c7', textColor: '#075985', tube: 'Tube bleu', analyses: ['Temps de saignement (TS)','TQ / TP','INR','TCA','D-Dimères','TT (Temps de Thrombine)'] },
  { id: 'biochimie', label: '3. Biochimie sérique', color: '#059669', textColor: '#065f46', tube: 'Tube vert', subGroups: [
    { label: 'Métabolisme général', analyses: ['Glucose','HbA1c','Urée','Créatinine','Acide urique','CRP','Protéines totales','Albumine','ASLO'] },
    { label: 'Bilan hépatique', analyses: ['ASAT (TGO)','ALAT (TGP)','GGT','PAL','Bilirubine totale','Bilirubine directe','LDH'] },
    { label: 'Bilan lipidique & pancréas', analyses: ['Cholestérol total','HDL','LDL','Triglycérides','Lipase','Amylase'] },
    { label: 'Ionogramme & minéraux', analyses: ['Sodium (Na⁺)','Potassium (K⁺)','Calcium','Magnésium','Phosphore','Fer sérique','Ferritine','Troponine','Chlore (Cl⁻)'] },
  ]},
  { id: 'serologie', label: '4. Sérologie / Immunologie', color: '#dc2626', textColor: '#991b1b', tube: 'Tube rouge', analyses: ['Hépatite B (Ag HBs)','Hépatite C (Ac anti-VHC)','VIH 1 & 2','Widal & Félix','TPHA','VDRL / RPR','Toxoplasmose','Rubéole','β-HCG','TSH','T3 / T4','PSA','Cysticercose IgM','Cysticercose IgG','Bilharziose IgM','Bilharziose IgG','Test de grossesse (bandelette)'] },
  { id: 'urinaire', label: '5. Biochimie urinaire', color: '#006A8C', textColor: '#04556F', tube: '', subGroups: [
    { label: 'Bandelette urinaire', analyses: ['Leucocytes','Nitrites','Protéines','Glucose urinaire','Sang / Hématies','pH urinaire','ECBU (Culot urinaire)','Protéinurie 24h','Urobilinogène','Densité urinaire','Acétone','Bilirubine (urinaire)','Diurèse (L/24h)'] },
    { label: 'Ionogramme urinaire (24h)', analyses: ['Volume total urine 3h (ml)','GR (hématies) /min','GB (leucocytes) /min','Kaliurèse (mmol/24h)','Natrirurèse (mmol/24h)','Dilution (osmolarité/densité)'] },
  ]},
  { id: 'parasito', label: '6. Parasitologie / Microbiologie', color: '#16a34a', textColor: '#14532d', tube: '', analyses: ['TDR Paludisme','GE / Frottis (GE/FM)','Examen parasitologique selles','Recherche sang occulte','Recherche microfilaires','Recherche de parasite (culot urinaire)','Densité parasitaire (parasites/µL)'] },
  { id: 'liquide', label: '7. Liquide de ponction', color: '#0891b2', textColor: '#164e63', tube: '', subGroups: [
    { label: 'Nature du liquide', analyses: ['LCR','Liquide d\'ascite','Liquide pleural','Liquide péricardique','Autre ponction'] },
    { label: 'Analyses sur liquide', analyses: ['Biochimie (protéines, glucose)','Cytologie','Bactériologie / Culture'] },
  ]},
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
  initialSelected?: string[];
  chuId?: string;
}

export default function LaboExamensPopup({ isOpen, onClose, onConfirm, initialSelected = [], chuId }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [ruptures, setRuptures] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !chuId) return;
    let cancelled = false;
    getAnalysesLaboEnRupture(chuId).then(list => {
      if (!cancelled) setRuptures(new Set(list));
    });
    return () => { cancelled = true; };
  }, [isOpen, chuId]);

  if (!isOpen) return null;

  const isRupture = (a: string) => estAnalyseBloquee(a, ruptures);

  function toggle(val: string) {
    if (isRupture(val)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  }

  function toggleMany(analyses: string[]) {
    const selectable = analyses.filter(a => !isRupture(a));
    if (selectable.length === 0) return;
    const allSelected = selectable.every(a => selected.has(a));
    setSelected(prev => {
      const next = new Set(prev);
      selectable.forEach(a => { if (allSelected) next.delete(a); else next.add(a); });
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selected).filter(a => !isRupture(a)));
    onClose();
  }

  const selectedCount = Array.from(selected).filter(a => !isRupture(a)).length;
  const ruptureCount = ruptures.size;

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Sélectionner les examens"
      subtitle={selectedCount > 0 ? `${selectedCount} examen${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''}` : 'Cliquez sur les examens à ajouter'}
      icon="science"
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="bca" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
          <button
            className="bok"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            style={{
              flex: 1, opacity: selectedCount === 0 ? 0.5 : 1,
              pointerEvents: selectedCount === 0 ? 'none' : 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icone nom="check" style={{ fontSize: 16 }} />
            Sélectionner ({selectedCount})
          </button>
        </div>
      }
    >
      {ruptureCount > 0 && (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bdr)', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: 'var(--red)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icone nom="warning" style={{ fontSize: 15 }} />
          {ruptureCount} analyse{ruptureCount > 1 ? 's' : ''} indisponible{ruptureCount > 1 ? 's' : ''} (rupture de réactif) — grisée{ruptureCount > 1 ? 's' : ''} et non cochable{ruptureCount > 1 ? 's' : ''}.
        </div>
      )}
      {CATEGORIES.map(cat => {
        const allAnalyses = cat.subGroups
          ? cat.subGroups.flatMap(sg => sg.analyses)
          : cat.analyses!;
        const selectableAnalyses = allAnalyses.filter(a => !isRupture(a));
        const catCount = selectableAnalyses.filter(a => selected.has(a)).length;
        const catAllSelected = selectableAnalyses.length > 0 && selectableAnalyses.every(a => selected.has(a));

        return (
          <div key={cat.id} style={{ marginBottom: 14 }}>
            <div
              onClick={() => toggleMany(allAnalyses)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 8, cursor: selectableAnalyses.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
                background: catAllSelected ? `${cat.color}10` : 'transparent',
                border: `1px solid ${catAllSelected ? `${cat.color}40` : 'transparent'}`,
              }}
            >
              <input type="checkbox" checked={catAllSelected} readOnly style={{ accentColor: cat.color, width: 16, height: 16, flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: cat.textColor, flex: 1 }}>
                {cat.label}{cat.tube && ` (${cat.tube})`}
              </span>
              {catCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#fff', background: cat.color,
                  borderRadius: 10, padding: '2px 8px',
                }}>
                  {catCount}/{selectableAnalyses.length}
                </span>
              )}
            </div>

            {cat.subGroups ? cat.subGroups.map(sg => {
              const selectableSg = sg.analyses.filter(a => !isRupture(a));
              const sgAllSelected = selectableSg.length > 0 && selectableSg.every(a => selected.has(a));
              const sgCount = selectableSg.filter(a => selected.has(a)).length;
              return (
                <div key={sg.label} style={{ marginLeft: 22, marginTop: 6 }}>
                  <div
                    onClick={() => toggleMany(sg.analyses)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                      cursor: selectableSg.length > 0 ? 'pointer' : 'not-allowed', padding: '2px 0',
                    }}
                  >
                    <input type="checkbox" checked={sgAllSelected} readOnly style={{ accentColor: cat.color, width: 14, height: 14, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--txt2)' }}>
                      {sg.label}
                    </span>
                    {sgCount > 0 && (
                      <span style={{ fontSize: 9, color: cat.color, fontWeight: 600 }}>
                        {sgCount}/{selectableSg.length}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginLeft: 20 }}>
                    {sg.analyses.map(a => {
                      const rupture = isRupture(a);
                      return (
                        <label key={a} className="cr labo-check" title={rupture ? 'Analyse indisponible (rupture de réactif)' : undefined}
                          style={{ cursor: rupture ? 'not-allowed' : 'pointer', opacity: rupture ? 0.45 : 1, gap: 8 }}>
                          <input type="checkbox" checked={!rupture && selected.has(a)} disabled={rupture} onChange={() => toggle(a)} style={{ accentColor: cat.color, width: 14, height: 14, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)', textDecoration: rupture ? 'line-through' : undefined }}>{a}</span>
                          {rupture && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--red)', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>Rupture</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            }) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginLeft: 22, marginTop: 4 }}>
                {cat.analyses!.map(a => {
                  const rupture = isRupture(a);
                  return (
                    <label key={a} className="cr labo-check" title={rupture ? 'Analyse indisponible (rupture de réactif)' : undefined}
                      style={{ cursor: rupture ? 'not-allowed' : 'pointer', opacity: rupture ? 0.45 : 1, gap: 8 }}>
                      <input type="checkbox" checked={!rupture && selected.has(a)} disabled={rupture} onChange={() => toggle(a)} style={{ accentColor: cat.color, width: 14, height: 14, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)', textDecoration: rupture ? 'line-through' : undefined }}>{a}</span>
                      {rupture && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--red)', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>Rupture</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <style jsx global>{`
        .labo-check { display: flex !important; justify-content: flex-start !important; }
      `}</style>
    </DrawerPanel>
  );
}
