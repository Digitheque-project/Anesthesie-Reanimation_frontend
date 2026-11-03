'use client';

import { Medicament } from './types';
import { getFrequenceText, formatAriary } from './utils';
import { Icone } from '@/components/ui/Icone';

interface Props {
  medicaments: Medicament[];
  onRemove: (id: string) => void;
  onTogglePremierSoin: (id: string) => void;
  premierSoinEligible?: boolean;
  kitDejaUtilise?: boolean;
}

export default function MedicamentList({ medicaments, onRemove, onTogglePremierSoin, premierSoinEligible, kitDejaUtilise }: Props) {
  const totalPrescription = medicaments.reduce((sum, m) => sum + (m.quantite * (m.prixUnitaire || 0)), 0);
  const totalPremierSoin = premierSoinEligible && !kitDejaUtilise
    ? medicaments.filter(m => m.premierSoin).reduce((sum, m) => sum + (m.quantite * (m.prixUnitaire || 0)), 0)
    : 0;
  const totalAPayer = Math.max(totalPrescription - totalPremierSoin, 0);

  return (
    <>
      <div className="sh mb12">Prescriptions ajoutées{' '}<span style={{background:'var(--navy)',color:'#fff',borderRadius:'10px',padding:'1px 7px',fontSize:'10px',marginLeft:'5px'}}>{medicaments.length}</span></div>
      <div className="mb12">
        {medicaments.length === 0 ? (
          <div style={{textAlign:'center',padding:'20px',color:'var(--txt3)',fontSize:'13px'}}>Aucune prescription médicamenteuse ajoutée</div>
        ) : medicaments.map(m => (
          <div key={m.id} className="rxi" style={m.premierSoin && !kitDejaUtilise ? { borderLeft: '3px solid var(--blue-ps)', background: 'var(--blue-ps-lt)' } : undefined}>
            <div className="rxi-ic"><Icone nom="medication" /></div>
            <div className="rxi-m" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <h4>{m.nom} {m.dose} — qté : {m.quantite}{m.quantiteType ? ` ${m.quantiteType}` : ''}</h4>
                  <p>{getFrequenceText(m.frequenceType, m.frequenceValeur)} · {m.dureeJours} jours {m.voie && `· ${m.voie}`}</p>
                  {m.prixUnitaire != null && m.prixUnitaire > 0 && (
                    <p style={{fontSize:11,color:'var(--navy)',fontWeight:600,marginTop:3}}>
                      {m.quantite} × {formatAriary(m.prixUnitaire)} = {formatAriary(m.quantite * m.prixUnitaire)}
                    </p>
                  )}
                  {(m.dateDebut || m.heureDebut) && <p style={{fontSize:11,color:'var(--txt3)',marginTop:3}}>{m.dateDebut && `Début : ${m.dateDebut}`}{m.heureDebut && ` à ${m.heureDebut}`}</p>}
                  {m.instructions && <p style={{fontSize:11,color:'var(--txt3)',marginTop:2}}>{m.instructions}</p>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
              {premierSoinEligible && !kitDejaUtilise && (
                <button
                  onClick={() => onTogglePremierSoin(m.id)}
                  title={m.premierSoin ? 'Retirer du Premier Soin' : 'Ajouter au Premier Soin'}
                  aria-label={m.premierSoin ? 'Retirer du Premier Soin' : 'Ajouter au Premier Soin'}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '6px 8px', borderRadius: 8,
                    border: m.premierSoin ? '1px solid var(--blue-ps-dk, #034b68)' : '1px solid var(--blue-ps-bdr, #b8d4e3)',
                    cursor: 'pointer',
                    background: m.premierSoin ? 'var(--blue-ps, #05668d)' : 'var(--blue-ps-lt, #ebf5fb)',
                    color: m.premierSoin ? '#fff' : 'var(--blue-ps-dk, #034b68)',
                    boxShadow: m.premierSoin ? '0 2px 6px rgba(5,102,141,.3)' : 'none',
                    transition: 'all 0.2s',
                    minWidth: 72,
                  }}
                >
                  <Icone nom={m.premierSoin ? 'remove_circle' : 'add_circle'} style={{ fontSize: 18 }} />
                  <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1.15, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {m.premierSoin ? 'Retirer' : 'Ajouter'}<br />Premier Soin
                  </span>
                </button>
              )}
              <button className="bdel" onClick={() => onRemove(m.id)}><Icone nom="delete" /></button>
            </div>
          </div>
        ))}
      </div>
      {medicaments.length > 0 && totalPrescription > 0 && (
        <div style={{ background: 'var(--navy-lt)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>Total estimé</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{formatAriary(totalPrescription)}</span>
          </div>
          {totalPremierSoin > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px dashed var(--blue-ps-bdr)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-ps)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icone nom="local_hospital" style={{ fontSize: 14 }} />
                Premier Soin
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-ps, #05668d)' }}>- {formatAriary(totalPremierSoin)}</span>
            </div>
          )}
          {totalPremierSoin > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--bdr)' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--txt)' }}>Total à payer</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green-dk, #16a34a)' }}>{formatAriary(totalAPayer)}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
