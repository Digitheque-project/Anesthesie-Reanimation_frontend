'use client';

import { useState } from 'react';
import { creerPrescriptionMedicale, verifierEligibilitePremierSoin, creerPremierSoin } from '@/features/prescription/lib/api';
import { Medicament, Patient, Prescripteur } from './types';
import { formatAriary } from './utils';
import { normalizeQuantiteType } from './quantiteType';
import { Icone } from '@/components/ui/Icone';

interface Props {
  medicaments: Medicament[];
  patient: Patient;
  prescripteur: Prescripteur;
  urgence: string;
  remarqueGenerale: string;
  notifier: boolean;
  nomMedecin: string;
  numeroONM: string;
  createdPrescriptionId: string | null;
  onCreatedPrescriptionId: (id: string) => void;
  onResult: (result: any) => void;
  onRefreshPrescriptions: () => Promise<void>;
}

export default function PremierSoinSection({
  medicaments, patient, prescripteur, urgence, remarqueGenerale, notifier,
  nomMedecin, numeroONM, createdPrescriptionId, onCreatedPrescriptionId,
  onResult, onRefreshPrescriptions
}: Props) {
  const [premierSoinEligible, setPremierSoinEligible] = useState(false);
  const [premierSoinLoading, setPremierSoinLoading] = useState(false);
  const [premierSoinResult, setPremierSoinResult] = useState<any>(null);
  const [premierSoinError, setPremierSoinError] = useState('');
  const [showPremierSoinSelection, setShowPremierSoinSelection] = useState(false);
  const [premierSoinSelection, setPremierSoinSelection] = useState<Map<string, boolean>>(new Map());

  const canShowButton = medicaments.length > 0 && !premierSoinResult?.kitExistant;

  async function activerPremierSoin() {
    setPremierSoinLoading(true);
    setPremierSoinError('');
    setPremierSoinResult(null);
    try {
      let prescriptionId = createdPrescriptionId;
      if (!prescriptionId) {
        if (medicaments.length === 0) {
          setPremierSoinError('Ajoutez au moins un médicament avant d\'activer le Kit Premier Soin');
          setPremierSoinLoading(false);
          return;
        }
        const result = await creerPrescriptionMedicale({
          patientId: patient.id,
          prescripteurId: prescripteur.id,
          urgence,
          remarques: remarqueGenerale,
          notifierInfirmier: notifier,
          nomMedecinPrescripteur: nomMedecin,
          numeroONM: numeroONM,
          medicaments: medicaments.map(m => ({
            nom: m.nom, dose: m.dose, quantite: m.quantite, quantiteType: normalizeQuantiteType(m.quantiteType),
            voie: m.voie, frequenceType: m.frequenceType, frequenceValeur: m.frequenceValeur,
            dureeJours: m.dureeJours, instructions: m.instructions, remarques: m.remarques,
            dateDebut: m.dateDebut || undefined, heureDebut: m.heureDebut || undefined,
          })),
        });
        prescriptionId = result?.id;
        if (!prescriptionId) {
          setPremierSoinError('Erreur lors de la création de la prescription');
          setPremierSoinLoading(false);
          return;
        }
        onCreatedPrescriptionId(prescriptionId);
        await onRefreshPrescriptions();
      }
      const elig = await verifierEligibilitePremierSoin(prescriptionId);
      setPremierSoinResult(elig);
      if (elig?.eligible) {
        setPremierSoinEligible(true);
        const selection = new Map<string, boolean>();
        elig.medicamentsEligibles?.forEach((m: any) => { selection.set(m.id, true); });
        setPremierSoinSelection(selection);
        setShowPremierSoinSelection(true);
      } else {
        setPremierSoinEligible(false);
        setPremierSoinError(elig?.motif || 'Patient non éligible au Kit Premier Soin');
      }
    } catch (err: any) {
      setPremierSoinError(err?.message || 'Erreur lors de la vérification d\'éligibilité');
    } finally {
      setPremierSoinLoading(false);
    }
  }

  async function confirmerPremierSoin() {
    if (!createdPrescriptionId) return;
    const selectedIds = Array.from(premierSoinSelection.entries())
      .filter(([_, checked]) => checked).map(([id]) => id);
    if (selectedIds.length === 0) return;
    setPremierSoinLoading(true);
    setShowPremierSoinSelection(false);
    try {
      const result = await creerPremierSoin(createdPrescriptionId, selectedIds);
      setPremierSoinResult(result);
      setPremierSoinEligible(false);
      onResult(result);
    } catch (err: any) {
      setPremierSoinError(err?.message || 'Erreur lors de l\'activation du Premier Soin');
    } finally {
      setPremierSoinLoading(false);
    }
  }

  return (
    <>
      {/* Bouton + messages d'état */}
      {canShowButton && (
        <button
          onClick={activerPremierSoin}
          disabled={premierSoinLoading}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #93c5fd',
            background: '#eff6ff', color: '#1e40af', fontWeight: 700, fontSize: 13,
            cursor: premierSoinLoading ? 'wait' : 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8, opacity: premierSoinLoading ? 0.6 : 1,
          }}
        >
          <Icone nom={premierSoinLoading ? 'hourglass_empty' : 'volunteer_activism'} style={{ fontSize: 18 }} />
          {premierSoinLoading ? 'Vérification...' : 'Kit Premier Soin'}
        </button>
      )}

      {premierSoinResult?.kitExistant && (
        <div style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #86efac',
          background: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icone nom="check_circle" style={{ fontSize: 16 }} />
          Kit Premier Soin déjà activé
        </div>
      )}

      {premierSoinError && !premierSoinResult?.kitExistant && (
        <div style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #fca5a5',
          background: '#fef2f2', color: '#991b1b', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icone nom="error" style={{ fontSize: 16 }} />
          {premierSoinError}
        </div>
      )}

      {premierSoinEligible && !showPremierSoinSelection && (
        <div style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #93c5fd',
          background: '#eff6ff', color: '#1e40af', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icone nom="info" style={{ fontSize: 16 }} />
          {premierSoinResult?.medicamentsEligibles?.length} médicament(s) éligible(s) — {formatAriary(premierSoinResult?.montantEstime || 0)}
        </div>
      )}

      {/* Modale sélection */}
      {showPremierSoinSelection && (
        <div className="mb op" onClick={e => { if (e.target === e.currentTarget) setShowPremierSoinSelection(false); }}>
          <div className="mbox" style={{ maxWidth: 550, width: '90%' }}>
            <div style={{ background: '#2563eb', color: '#fff', padding: '14px 18px', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icone nom="volunteer_activism" style={{ fontSize: 22 }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Kit Premier Soin — Sélection des médicaments</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.85 }}>Cochez les médicaments à inclure dans le kit gratuit</p>
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af', display: 'flex', justifyContent: 'space-between' }}>
                <span>Plafond : <strong>{formatAriary(premierSoinResult?.plafond || 73000)}</strong></span>
                <span>Total sélectionné : <strong>{formatAriary(
                  premierSoinResult?.medicamentsEligibles
                    ?.filter((m: any) => premierSoinSelection.get(m.id) !== false)
                    .reduce((sum: number, m: any) => sum + m.coutTotal, 0) || 0
                )}</strong></span>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                {premierSoinResult?.medicamentsEligibles?.map((m: any) => {
                  const checked = premierSoinSelection.get(m.id) !== false;
                  return (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--bdr)', cursor: 'pointer', opacity: checked ? 1 : 0.5, transition: 'opacity 0.15s' }}>
                      <input type="checkbox" checked={checked}
                        onChange={e => { const newSel = new Map(premierSoinSelection); newSel.set(m.id, e.target.checked); setPremierSoinSelection(newSel); }}
                        style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{m.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--txt3)' }}>qté {m.quantitePrescrite} × {formatAriary(m.prixUnitaire)}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{formatAriary(m.coutTotal)}</div>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="bca" onClick={() => setShowPremierSoinSelection(false)}>Annuler</button>
                <button className="bok" onClick={confirmerPremierSoin}
                  disabled={premierSoinLoading || !Array.from(premierSoinSelection.values()).some(v => v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icone nom={premierSoinLoading ? 'hourglass_empty' : 'check'} style={{ fontSize: 16 }} />
                  {premierSoinLoading ? 'Activation...' : 'Confirmer le kit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
