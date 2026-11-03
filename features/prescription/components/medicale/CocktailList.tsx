'use client';

import { CocktailPrescription } from './types';
import { getFrequenceText, formatAriary } from './utils';
import { Icone } from '@/components/ui/Icone';

interface Props {
  cocktails: CocktailPrescription[];
  onRemove: (id: string) => void;
  onTogglePremierSoin: (id: string) => void;
  premierSoinEligible?: boolean;
  kitDejaUtilise?: boolean;
}

export default function CocktailList({ cocktails, onRemove, onTogglePremierSoin, premierSoinEligible, kitDejaUtilise }: Props) {
  const totalCocktails = cocktails.reduce((sum, c) => {
    const cTotal = (c.composants || []).reduce((s, comp) => s + (comp.quantite * (comp.prixUnitaire || 0)), 0);
    return sum + (c.prixUnitaire || cTotal);
  }, 0);

  const totalPremierSoinCocktails = premierSoinEligible && !kitDejaUtilise
    ? cocktails.reduce((sum, c) => {
        const psTotal = (c.composants || [])
          .filter(comp => comp.premierSoin)
          .reduce((s, comp) => s + (comp.quantite * (comp.prixUnitaire || 0)), 0);
        return sum + (c.premierSoin ? (c.prixUnitaire || psTotal) : psTotal);
      }, 0)
    : 0;

  if (cocktails.length === 0) return null;

  return (
    <>
      <div className="sh mb12" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icone nom="science" style={{ fontSize: 18, color: 'var(--navy, #006A8C)' }} />
        Cocktails de médicaments prescrits
        <span style={{ background: 'var(--navy, #006A8C)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', marginLeft: 4 }}>
          {cocktails.length}
        </span>
      </div>
      <div className="mb12">
        {cocktails.map(c => {
          const cTotal = (c.composants || []).reduce((s, comp) => s + (comp.quantite * (comp.prixUnitaire || 0)), 0);
          return (
            <div key={c.id} className="rxi" style={c.premierSoin && !kitDejaUtilise ? { borderLeft: '3px solid var(--blue-ps)', background: 'var(--blue-ps-lt)' } : { borderLeft: '3px solid var(--navy, #006A8C)' }}>
              <div className="rxi-ic" style={{ color: 'var(--navy, #006A8C)' }}><Icone nom="science" /></div>
              <div className="rxi-m" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.nom}
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: 'var(--navy, #006A8C)', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>
                        Cocktail
                      </span>
                    </h4>
                    {c.instructionsMelange && (
                      <p style={{ fontSize: 11, color: 'var(--navy, #006A8C)', fontWeight: 600, fontStyle: 'italic', marginTop: 2, padding: '4px 8px', background: 'rgba(5,102,141,0.08)', borderRadius: 4 }}>
                        Mélange: {c.instructionsMelange}
                      </p>
                    )}
                    <div style={{ marginTop: 6 }}>
                      {(c.composants || []).map((comp) => (
                        <div key={comp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)', padding: '2px 0' }}>
                          <Icone nom="medication" style={{ fontSize: 12, color: 'var(--txt3)' }} />
                          <span style={{ fontWeight: 600 }}>{comp.nom}</span>
                          <span>{comp.dose}</span>
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 6, background: 'var(--inp)', fontWeight: 600 }}>
                            qté {comp.quantite}
                          </span>
                          {comp.prixUnitaire != null && comp.prixUnitaire > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--navy)', fontWeight: 600 }}>
                              {formatAriary(comp.prixUnitaire)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {c.voie && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>Voie : <strong>{c.voie}</strong></p>}
                    {(c.frequenceType || c.dureeJours) && (
                      <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                        {c.frequenceType && getFrequenceText(c.frequenceType, c.frequenceValeur ?? 0)}{c.frequenceType && c.dureeJours ? ' · ' : ''}{c.dureeJours ? `${c.dureeJours} jours` : ''}
                      </p>
                    )}
                    {(c.dateDebut || c.heureDebut) && (
                      <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                        {c.dateDebut && `Début : ${c.dateDebut}`}{c.heureDebut && ` à ${c.heureDebut}`}
                      </p>
                    )}
                    {c.instructions && <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{c.instructions}</p>}
                    {(c.prixUnitaire || cTotal) > 0 && (
                      <p style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, marginTop: 4 }}>
                        Total estimé : {formatAriary(c.prixUnitaire || cTotal)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                {premierSoinEligible && !kitDejaUtilise && (
                  <button
                    onClick={() => onTogglePremierSoin(c.id)}
                    title={c.premierSoin ? 'Retirer du Premier Soin' : 'Ajouter au Premier Soin'}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      padding: '6px 8px', borderRadius: 8, border: 'none',
                      cursor: 'pointer',
                      background: c.premierSoin ? 'var(--blue-ps)' : 'var(--inp)',
                      color: c.premierSoin ? '#fff' : 'var(--txt3)',
                      boxShadow: c.premierSoin ? '0 2px 6px rgba(0,102,204,.3)' : 'none',
                      transition: 'all 0.2s',
                      minWidth: 48,
                    }}
                  >
                    <Icone nom="local_hospital" style={{ fontSize: 18 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.1, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      Premier{'\n'}Soin
                    </span>
                  </button>
                )}
                <button className="bdel" onClick={() => onRemove(c.id)}><Icone nom="delete" /></button>
              </div>
            </div>
          );
        })}
      </div>
      {totalCocktails > 0 && (
        <div style={{ background: 'var(--navy-lt, #EBF5FB)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy, #006A8C)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icone nom="science" style={{ fontSize: 14 }} />
              Total cocktails estimé
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy, #006A8C)' }}>{formatAriary(totalCocktails)}</span>
          </div>
          {totalPremierSoinCocktails > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px dashed rgba(5,102,141,0.3)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-ps)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icone nom="local_hospital" style={{ fontSize: 14 }} />
                Premier Soin (cocktails)
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-ps)' }}>{formatAriary(totalPremierSoinCocktails)}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
