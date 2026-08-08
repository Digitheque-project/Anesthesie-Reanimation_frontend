'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrescriptionPanier, PanierItem } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { creerPrescriptionMedicale, creerOrdonnanceMedicale } from '@/features/prescription/lib/api';
import { Patient, Prescripteur, Medicament } from './types';
import { getFrequenceText, formatAriary } from './utils';
import { normalizeQuantiteType } from './quantiteType';

interface Props {
  patient: Patient;
  prescripteur: Prescripteur;
}

interface EditableMedicament extends Medicament {
  selected: boolean;
  ordonnanceQuantite: number;
}

export default function OrdonnanceTab({ patient, prescripteur }: Props) {
  const { panier, removeFromPanier } = usePrescriptionPanier();
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => setToast(''), 2800); }

  const draftItems = useMemo(
    () => panier.items.filter(i => i.type === 'medicale' && i.status === 'draft'),
    [panier.items]
  );

  const [itemsState, setItemsState] = useState<Record<string, EditableMedicament[]>>({});

  useEffect(() => {
    const next: Record<string, EditableMedicament[]> = {};
    for (const item of draftItems) {
      const existing = itemsState[item.localId];
      if (existing) {
        next[item.localId] = existing;
      } else {
        next[item.localId] = (item.payload?.medicaments ?? []).map((m: any) => ({
          ...m,
          id: m.id ?? `${item.localId}-${m.nom}-${Math.random().toString(36).slice(2, 8)}`,
          selected: true,
          ordonnanceQuantite: m.quantite,
          premierSoin: m.premierSoin ?? true,
        }));
      }
    }
    setItemsState(next);
  }, [draftItems.map(i => i.localId).join(',')]);

  function toggleMedication(itemLocalId: string, medId: string) {
    setItemsState(prev => ({
      ...prev,
      [itemLocalId]: (prev[itemLocalId] ?? []).map(m =>
        m.id === medId ? { ...m, selected: !m.selected } : m
      ),
    }));
  }

  function updateQuantite(itemLocalId: string, medId: string, qty: number) {
    setItemsState(prev => ({
      ...prev,
      [itemLocalId]: (prev[itemLocalId] ?? []).map(m =>
        m.id === medId ? { ...m, ordonnanceQuantite: Math.max(0, qty) } : m
      ),
    }));
  }

  function togglePremierSoin(itemLocalId: string, medId: string) {
    setItemsState(prev => ({
      ...prev,
      [itemLocalId]: (prev[itemLocalId] ?? []).map(m =>
        m.id === medId ? { ...m, premierSoin: !m.premierSoin } : m
      ),
    }));
  }

  async function handleCreateOrdonnance(item: PanierItem) {
    const meds = itemsState[item.localId] ?? [];
    const selected = meds.filter(m => m.selected && m.ordonnanceQuantite > 0);
    if (selected.length === 0) return;

    setLoading(item.localId);
    try {
      const result = await creerPrescriptionMedicale(item.payload);
      if (result?.id) {
        try {
          await creerOrdonnanceMedicale(
            result.id,
            selected.map(m => ({
              nom: m.nom, dose: m.dose, quantite: m.ordonnanceQuantite,
              quantiteType: normalizeQuantiteType(m.quantiteType), voie: m.voie,
              frequenceType: m.frequenceType, frequenceValeur: m.frequenceValeur,
              dureeJours: m.dureeJours, instructions: m.instructions, remarques: m.remarques,
              dateDebut: m.dateDebut || undefined, heureDebut: m.heureDebut || undefined,
              premierSoin: m.premierSoin ?? true,
            }))
          );
        } catch {
          showToast("Prescription créée mais l'envoi à la pharmacie a échoué");
        }
      }
      removeFromPanier(item.localId);
      showToast('Ordonnance créée et envoyée à la pharmacie');
    } catch {
      showToast("Erreur lors de la création de l'ordonnance.");
    } finally {
      setLoading(null);
    }
  }

  if (draftItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--txt3)' }}>
        <span className="ms" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--bdr)' }}>description</span>
        <p style={{ fontSize: 13 }}>Aucune ordonnance en attente</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>Ajoutez des médicaments depuis l&apos;onglet <strong>Nouvelle prescription</strong> puis cliquez <strong>Créer Ordonnance</strong>.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {draftItems.map(item => {
        const meds = itemsState[item.localId] ?? [];
        const selectedCount = meds.filter(m => m.selected && m.ordonnanceQuantite > 0).length;
        const isLoading = loading === item.localId;

        const premierSoinMeds = meds.filter(m => m.premierSoin);
        const nonPremierSoinMeds = meds.filter(m => !m.premierSoin);

        return (
          <div key={item.localId} style={{
            border: '1px solid var(--bdr)', borderRadius: 12, padding: 16,
            marginBottom: 12, background: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--navy-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--navy)' }}>description</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{item.summary}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {selectedCount}/{meds.length} sélectionné(s) pour l&apos;ordonnance
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeFromPanier(item.localId)}
                title="Retirer du panier"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16 }}
              >
                <span className="ms">delete</span>
              </button>
            </div>

            {/* PREMIER SOINS SECTION */}
            {premierSoinMeds.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                  padding: '6px 10px', background: '#eff6ff', borderRadius: 6,
                  border: '1px solid #bfdbfe',
                }}>
                  <span className="ms" style={{ fontSize: 14, color: '#2563eb' }}>local_hospital</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af' }}>PREMIER SOINS</span>
                  <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>({premierSoinMeds.length})</span>
                </div>
                {premierSoinMeds.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderBottom: '1px solid var(--bdr)', fontSize: 13,
                    borderLeft: '3px solid #2563eb', background: '#f8faff',
                  }}>
                    <input
                      type="checkbox"
                      checked={m.selected}
                      onChange={() => toggleMedication(item.localId, m.id)}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{m.nom} {m.dose}</strong>
                      <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'block' }}>
                        {getFrequenceText(m.frequenceType, m.frequenceValeur)} · {m.dureeJours} jour(s)
                      </span>
                      {m.prixUnitaire != null && m.prixUnitaire > 0 && (
                        <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
                          {formatAriary(m.prixUnitaire)} / unité
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Qté:</span>
                      <input
                        type="number"
                        min={0}
                        value={m.ordonnanceQuantite}
                        onChange={e => updateQuantite(item.localId, m.id, parseInt(e.target.value) || 0)}
                        disabled={!m.selected}
                        style={{
                          width: 55, textAlign: 'center', padding: '4px 0', fontSize: 12,
                          borderRadius: 6, border: '1px solid var(--bdr)',
                          opacity: m.selected ? 1 : 0.5,
                        }}
                      />
                    </div>
                    <label title="Premier Soin" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={m.premierSoin ?? true}
                        onChange={() => togglePremierSoin(item.localId, m.id)}
                        style={{ accentColor: '#2563eb', width: 14, height: 14 }}
                      />
                      <span className="ms" style={{ fontSize: 12, color: '#2563eb' }}>local_hospital</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* NON PREMIER SOINS SECTION */}
            {nonPremierSoinMeds.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                  padding: '6px 10px', background: '#f9fafb', borderRadius: 6,
                  border: '1px solid var(--bdr)',
                }}>
                  <span className="ms" style={{ fontSize: 14, color: 'var(--txt3)' }}>medication</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)' }}>AUTRES MÉDICAMENTS</span>
                  <span style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600 }}>({nonPremierSoinMeds.length})</span>
                </div>
                {nonPremierSoinMeds.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderBottom: '1px solid var(--bdr)', fontSize: 13,
                  }}>
                    <input
                      type="checkbox"
                      checked={m.selected}
                      onChange={() => toggleMedication(item.localId, m.id)}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{m.nom} {m.dose}</strong>
                      <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'block' }}>
                        {getFrequenceText(m.frequenceType, m.frequenceValeur)} · {m.dureeJours} jour(s)
                      </span>
                      {m.prixUnitaire != null && m.prixUnitaire > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                          {formatAriary(m.prixUnitaire)} / unité
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--txt3)' }}>Qté:</span>
                      <input
                        type="number"
                        min={0}
                        value={m.ordonnanceQuantite}
                        onChange={e => updateQuantite(item.localId, m.id, parseInt(e.target.value) || 0)}
                        disabled={!m.selected}
                        style={{
                          width: 55, textAlign: 'center', padding: '4px 0', fontSize: 12,
                          borderRadius: 6, border: '1px solid var(--bdr)',
                          opacity: m.selected ? 1 : 0.5,
                        }}
                      />
                    </div>
                    <label title="Premier Soin" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={m.premierSoin ?? true}
                        onChange={() => togglePremierSoin(item.localId, m.id)}
                        style={{ accentColor: '#2563eb', width: 14, height: 14 }}
                      />
                      <span className="ms" style={{ fontSize: 12, color: '#9ca3af' }}>local_hospital</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {meds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--txt3)', fontSize: 12 }}>
                Aucun médicament dans cette ordonnance
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="bok"
                onClick={() => handleCreateOrdonnance(item)}
                disabled={isLoading || selectedCount === 0}
                style={{
                  flex: 1,
                  opacity: isLoading || selectedCount === 0 ? 0.5 : 1,
                  pointerEvents: isLoading || selectedCount === 0 ? 'none' : 'auto',
                }}
              >
                {isLoading ? 'Création...' : `Créer l'ordonnance`}
              </button>
              <button
                className="bca"
                onClick={() => removeFromPanier(item.localId)}
                disabled={isLoading}
              >
                Retirer
              </button>
            </div>
          </div>
        );
      })}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}
    </div>
  );
}
