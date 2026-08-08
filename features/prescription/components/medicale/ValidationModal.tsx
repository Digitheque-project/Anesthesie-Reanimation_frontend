'use client';

import { Medicament, ValidatedPrescription } from './types';
import { getFrequenceText, formatAriary } from './utils';

interface Props {
  validatedPrescription: ValidatedPrescription;
  premierSoinResult: any;
  premierSoinEligible: boolean;
  premierSoinError: string;
  premierSoinLoading: boolean;
  onClose: () => void;
  onActiverPremierSoin: () => void;
}

export default function ValidationModal({
  validatedPrescription, premierSoinResult, premierSoinEligible,
  premierSoinError, premierSoinLoading, onClose, onActiverPremierSoin
}: Props) {
  return (
    <div className="mb op" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth: 600, width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ background: 'var(--navy)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="ms" style={{ fontSize: 24 }}>check_circle</span>
          <div>
            <h3 style={{ fontFamily: '"Manrope", sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>{validatedPrescription.isOrdonnance ? 'Ordonnance transmise à la pharmacie' : 'Prescription médicamenteuse validée'}</h3>
            <p style={{ fontSize: 12, opacity: 0.9, margin: '4px 0 0 0' }}>{validatedPrescription.date}</p>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          {/* Patient Info */}
          <div style={{ background: 'var(--navy-lt)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="ms" style={{ fontSize: 22, color: '#fff' }}>person</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Patient</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{validatedPrescription.patient.prenom} {validatedPrescription.patient.nom}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--txt2)' }}>
              {validatedPrescription.patient.sexe && <span><strong>Sexe:</strong> {validatedPrescription.patient.sexe === 'M' ? 'Masculin' : validatedPrescription.patient.sexe === 'F' ? 'Féminin' : validatedPrescription.patient.sexe}</span>}
              {validatedPrescription.patient.age && <span><strong>Âge:</strong> {validatedPrescription.patient.age} ans</span>}
              {validatedPrescription.patient.groupeSanguin && <span><strong>Groupe sanguin:</strong> {validatedPrescription.patient.groupeSanguin}</span>}
            </div>
            {validatedPrescription.patient.allergies && validatedPrescription.patient.allergies.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="ms" style={{ fontSize: 14 }}>warning</span>
                <strong>Allergies:</strong> {validatedPrescription.patient.allergies.join(', ')}
              </div>
            )}
          </div>

          {/* Prescriber Info */}
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="ms" style={{ fontSize: 22, color: '#fff' }}>medical_services</span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 2 }}>Prescripteur</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>Dr {validatedPrescription.prescripteur.prenom} {validatedPrescription.prescripteur.nom}</div>
              <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{validatedPrescription.prescripteur.service || 'Service non spécifié'}</div>
            </div>
          </div>

          {/* Medications */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--txt3)', marginBottom: 12 }}>Médicaments prescrits</div>
            {validatedPrescription.medicaments.map((m: Medicament, idx: number) => (
              <div key={idx} style={{ background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--navy)' }}>medication</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{m.nom} {m.dose}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>
                    Quantité: <strong>{m.quantite}</strong> · {getFrequenceText(m.frequenceType, m.frequenceValeur)}{m.voie ? ` · ${m.voie}` : ''} · Pendant <strong>{m.dureeJours} jours</strong>
                  </div>
                  {m.instructions && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4, fontStyle: 'italic' }}>{m.instructions}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Remarks */}
          {validatedPrescription.remarques && (
            <div style={{ background: 'var(--navy-lt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--navy)', marginBottom: 6 }}>Remarques</div>
              <div style={{ fontSize: 13, color: 'var(--txt)' }}>{validatedPrescription.remarques}</div>
            </div>
          )}

          {/* Notification Status */}
          {validatedPrescription.notifier && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span className="ms" style={{ fontSize: 20, color: '#16a34a' }}>check_circle</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Infirmiers notifiés</div>
                <div style={{ fontSize: 11, color: '#15803d' }}>Notification envoyée au service clinique</div>
              </div>
            </div>
          )}

          {/* Premier Soin — déjà activé */}
          {premierSoinResult?.kitExistant && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ms" style={{ fontSize: 20, color: '#16a34a' }}>check_circle</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Kit Premier Soin déjà activé</div>
                <div style={{ fontSize: 11, color: '#15803d' }}>
                  Montant couvert : {formatAriary(Number(premierSoinResult.montantCouvert || 0))}
                </div>
              </div>
            </div>
          )}

          {/* Premier Soin — vérification / activation */}
          {!premierSoinResult?.kitExistant && (
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="ms" style={{ fontSize: 20, color: '#2563eb' }}>volunteer_activism</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>Kit Premier Soin</div>
              </div>
              <p style={{ fontSize: 12, color: '#334155', marginBottom: 10 }}>
                Ce patient bénéficie d&apos;un crédit de médicaments gratuits (max {formatAriary(premierSoinResult?.plafond || 73000)}).
              </p>
              {premierSoinEligible && premierSoinResult?.medicamentsEligibles && (
                <div style={{ fontSize: 11, color: '#1d4ed8', marginBottom: 10 }}>
                  Total estimé : {formatAriary(premierSoinResult?.montantEstime || 0)} — {premierSoinResult?.medicamentsEligibles?.length} médicament(s) éligible(s)
                </div>
              )}
              {premierSoinError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ms" style={{ fontSize: 16 }}>error</span>
                  {premierSoinError}
                </div>
              )}
              <button className="bok" onClick={onActiverPremierSoin} disabled={premierSoinLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="ms" style={{ fontSize: 16 }}>{premierSoinLoading ? 'hourglass_empty' : 'volunteer_activism'}</span>
                {premierSoinLoading ? 'Vérification en cours...' : 'Activer le Kit Premier Soin'}
              </button>
            </div>
          )}

          <div className="mbtns" style={{ marginTop: 20 }}>
            <button className="bok" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
