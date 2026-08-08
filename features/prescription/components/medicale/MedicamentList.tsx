'use client';

import { Medicament } from './types';
import { getFrequenceText, formatAriary } from './utils';
import { quantiteTypeLabel } from './quantiteType';

interface Props {
  medicaments: Medicament[];
  onRemove: (id: string) => void;
  onTogglePremierSoin: (id: string) => void;
}

export default function MedicamentList({ medicaments, onRemove, onTogglePremierSoin }: Props) {
  const totalPrescription = medicaments.reduce((sum, m) => sum + (m.quantite * (m.prixUnitaire || 0)), 0);
  const totalPremierSoin = medicaments
    .filter(m => m.premierSoin)
    .reduce((sum, m) => sum + (m.quantite * (m.prixUnitaire || 0)), 0);

  return (
    <>
      <div className="sh mb12">Prescriptions ajoutées{' '}<span style={{background:'var(--navy)',color:'#fff',borderRadius:'10px',padding:'1px 7px',fontSize:'10px',marginLeft:'5px'}}>{medicaments.length}</span></div>
      <div className="mb12">
        {medicaments.length === 0 ? (
          <div style={{textAlign:'center',padding:'20px',color:'var(--txt3)',fontSize:'13px'}}>Aucune prescription médicamenteuse ajoutée</div>
        ) : medicaments.map(m => (
          <div key={m.id} className="rxi" style={m.premierSoin ? { borderLeft: '3px solid #2563eb', background: '#f8faff' } : undefined}>
            <div className="rxi-ic"><span className="ms">medication</span></div>
            <div className="rxi-m" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <h4>{m.nom} {m.dose} — qté : {m.quantite}{m.quantiteType ? ` ${quantiteTypeLabel(m.quantiteType)}` : ''}</h4>
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
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, padding: '4px 10px', borderRadius: 6,
                background: m.premierSoin ? '#eff6ff' : 'var(--inp)',
                border: `1px solid ${m.premierSoin ? '#93c5fd' : 'var(--bdr)'}`,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                color: m.premierSoin ? '#1e40af' : 'var(--txt3)',
                transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={m.premierSoin ?? true}
                  onChange={() => onTogglePremierSoin(m.id)}
                  style={{ accentColor: '#2563eb', width: 14, height: 14 }}
                />
                <span className="ms" style={{ fontSize: 14 }}>local_hospital</span>
                Premier Soin
              </label>
            </div>
            <button className="bdel" onClick={() => onRemove(m.id)}><span className="ms">delete</span></button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px dashed #93c5fd' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="ms" style={{ fontSize: 14 }}>local_hospital</span>
                Premier Soin
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{formatAriary(totalPremierSoin)}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
