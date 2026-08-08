'use client';

import { useState, useEffect } from 'react';
import { creerPrescriptionMedicale, getPrescriptionsPatient, updateStatutPrescription, notifierInfirmierMedicale } from '@/features/prescription/lib/api';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { Medicament, PrescriptionEnCours, Props } from './types';
import { calcAge, filterExpired } from './utils';
import { normalizeQuantiteType } from './quantiteType';
import MedicamentAddForm from './MedicamentAddForm';
import MedicamentList from './MedicamentList';
import OrdonnanceTab from './OrdonnanceTab';
import PremierSoinQuotaBar from './PremierSoinQuotaBar';
import PremierSoinTab from './PremierSoinTab';
import ValidationPopup from '../ValidationPopup';
import { ConfirmationModal } from '@/features/prescription/components/modals';

type MedTab = 'nouvelle' | 'encours' | 'ordonnance' | 'premiersoins';

const TABS: { key: MedTab; label: string; icon: string }[] = [
  { key: 'nouvelle', label: 'Nouvelle prescription', icon: 'add' },
  { key: 'encours', label: 'En cours', icon: 'pending_actions' },
  { key: 'ordonnance', label: 'Ordonnance', icon: 'description' },
  { key: 'premiersoins', label: 'Premier Soin', icon: 'local_hospital' },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: active ? 600 : 500, flexShrink: 0,
  background: active ? 'var(--navy)' : 'var(--inp)',
  color: active ? '#fff' : 'var(--txt2)', transition: 'all .15s',
});

export default function MedicaleForm({ patient, prescripteur, patientType }: Props) {
  const { addToPanier, setPatientId, panier, sendAll } = usePrescriptionPanier();
  const [activeTab, setActiveTab] = useState<MedTab>('nouvelle');
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [remarqueGenerale, setRemarqueGenerale] = useState('');
  const [notifier, setNotifier] = useState(false);
  const [urgence, setUrgence] = useState('NORMAL');
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionEnCours[]>([]);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0);
  const [showConfirmValidation, setShowConfirmValidation] = useState(false);

  const isHospitalise = patientType === 'hospitalise';
  const visibleTabs = isHospitalise ? TABS : TABS.filter(t => t.key !== 'premiersoins');

  useEffect(() => {
    if (activeTab === 'premiersoins' && !isHospitalise) {
      setActiveTab('nouvelle');
    }
  }, [activeTab, isHospitalise]);
  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const age = calcAge(patient?.dateNaissance);
  const canValidate = medicaments.length > 0;
  const draftMedicaleCount = panier.items.filter(i => i.type === 'medicale' && i.status === 'draft').length;

  function showToast(msg: string) { setToast(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => setToast(''), 2800); }

  useEffect(() => {
    setPatientId(patient.id);
    async function fetchPrescriptions() {
      try {
        const data = await getPrescriptionsPatient('medicale', patient.id);
        setPrescriptionsEnCours(filterExpired(data));
      } catch {}
    }
    fetchPrescriptions();
  }, [patient.id, setPatientId]);

  async function refreshPrescriptionsEnCours() {
    try {
      const data = await getPrescriptionsPatient('medicale', patient.id);
      setPrescriptionsEnCours(filterExpired(data));
    } catch {}
  }

  async function terminerPrescription(id: string) {
    try {
      await updateStatutPrescription('medicale', id, 'TERMINEE');
      await refreshPrescriptionsEnCours();
    } catch {
      console.error('Erreur terminaison prescription');
    }
  }

  function togglePremierSoin(id: string) {
    setMedicaments(prev => prev.map(m =>
      m.id === id ? { ...m, premierSoin: !m.premierSoin } : m
    ));
  }

  function buildPrescriptionData(includePremierSoinFlag = false) {
    return {
      patientId: patient.id,
      prescripteurId: prescripteur.id,
      urgence,
      remarques: remarqueGenerale,
      notifierInfirmier: notifier,
      nomMedecinPrescripteur: nomMedecin,
      numeroONM: numeroONM,
      patientNom: patient.nom,
      patientPrenom: patient.prenom,
      patientAge: age,
      patientSexe: patient.sexe,
      prescripteurNom: prescripteur.nom,
      prescripteurPrenom: prescripteur.prenom,
      prescripteurService: prescripteur.service,
      medicaments: medicaments.map(m => ({
        nom: m.nom, dose: m.dose, quantite: m.quantite, quantiteType: normalizeQuantiteType(m.quantiteType),
        voie: m.voie, frequenceType: m.frequenceType, frequenceValeur: m.frequenceValeur,
        dureeJours: m.dureeJours, instructions: m.instructions, remarques: m.remarques,
        dateDebut: m.dateDebut || undefined, heureDebut: m.heureDebut || undefined,
        prixUnitaire: m.prixUnitaire || undefined,
        premierSoin: includePremierSoinFlag ? (m.premierSoin ?? true) : undefined,
      })),
    };
  }

  // "Valider" — save to DB only
  async function handleValiderPrescription() {
    if (!canValidate) return;
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = buildPrescriptionData(false);
      const result = await creerPrescriptionMedicale(prescriptionData);
      if (result?.id && notifier) {
        try { await notifierInfirmierMedicale(result.id); } catch {}
      }
      setMedicaments([]);
      setRemarqueGenerale('');
      setNotifier(false);
      showToast('Prescription enregistrée');
      await refreshPrescriptionsEnCours();
    } catch (err: any) {
      setApiError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  }

  // "Créer Ordonnance" — save to DB + navigate to ordonnance tab
  async function handleCreerOrdonnance() {
    if (!canValidate) return;
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = buildPrescriptionData(true);
      const summary = `${medicaments.length} médicament(s)`;
      addToPanier('medicale', summary, prescriptionData);
      setMedicaments([]);
      setRemarqueGenerale('');
      setNotifier(false);
      setActiveTab('ordonnance');
      setQuotaRefreshKey(k => k + 1);
      await refreshPrescriptionsEnCours();
    } catch (err: any) {
      setApiError(err?.message || "Erreur lors de la création de l'ordonnance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      {/* BARRE D'ONGLETS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {visibleTabs.map(t => (
          <button key={t.key} style={chipStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            <span className="ms" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
            {t.key === 'encours' && prescriptionsEnCours.length > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {prescriptionsEnCours.length}
              </span>
            )}
            {t.key === 'nouvelle' && medicaments.length > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {medicaments.length}
              </span>
            )}
            {t.key === 'ordonnance' && draftMedicaleCount > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : '#e67e22',
                color: activeTab === t.key ? '#e67e22' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {draftMedicaleCount}
              </span>
            )}
            {t.key === 'premiersoins' && (
              <span style={{
                background: activeTab === t.key ? '#fff' : '#2563eb',
                color: activeTab === t.key ? '#2563eb' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                PS
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === ONGLET NOUVELLE PRESCRIPTION === */}
      {activeTab === 'nouvelle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          {/* COLONNE GAUCHE */}
          <div>
            <div className="card mb12" style={{ padding: 12 }}>
              <MedicamentAddForm
                patientType={patientType}
                isAccueil={isAccueil}
                onAdd={(med) => setMedicaments(prev => [...prev, { ...med, premierSoin: true }])}
              />
            </div>
            <MedicamentList
              medicaments={medicaments}
              onRemove={(id) => setMedicaments(prev => prev.filter(m => m.id !== id))}
              onTogglePremierSoin={togglePremierSoin}
            />
          </div>

          {/* COLONNE DROITE — sticky */}
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Quota Premier Soin — only for hospitalized patients */}
            {isHospitalise && (
              <PremierSoinQuotaBar patientId={patient.id} refreshKey={quotaRefreshKey} />
            )}

            <div className="card" style={{ padding: 12 }}>
              <label className="lbl">Remarques générales</label>
              <textarea rows={3} placeholder="Notes complémentaires..." value={remarqueGenerale} onChange={e => setRemarqueGenerale(e.target.value)} />
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="togr">
                <div className="togr-l"><p>Notifier les infirmiers</p><span>Envoyer une notification au service</span></div>
                <label className="tog"><input type="checkbox" checked={notifier} onChange={e => setNotifier(e.target.checked)}/><span className="tog-t"></span></label>
              </div>
              {notifier && <div className="hint"><span className="ms" style={{fontSize:13,verticalAlign:'middle',color:'var(--navy)'}}>notifications_active</span> Notification envoyée aux <strong>infirmiers de garde</strong>.</div>}
            </div>

            {!canValidate && (
              <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
                Ajoutez au moins un médicament.
              </div>
            )}

            {/* TWO BUTTONS */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="bp"
                onClick={() => setShowConfirmValidation(true)}
                disabled={!canValidate || loading}
                style={{
                  flex: 1,
                  opacity: canValidate && !loading ? 1 : 0.5,
                  pointerEvents: canValidate && !loading ? 'auto' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span className="ms">save</span>{loading ? 'Enregistrement...' : 'Valider'}
              </button>
              <button
                onClick={handleCreerOrdonnance}
                disabled={!canValidate || loading}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
                  background: canValidate && !loading ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#d1d5db',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: canValidate && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span className="ms">description</span>{loading ? 'Création...' : 'Créer Ordonnance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ONGLET PRESCRIPTIONS EN COURS === */}
      {activeTab === 'encours' && (
        <div>
          <div className="active-rx" style={{ maxWidth: 700 }}>
            <div className="active-rx-header"><span className="ms">pending_actions</span><span>Prescriptions en cours</span></div>
            {prescriptionsEnCours.length > 0 ? prescriptionsEnCours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {p.medicaments?.map((med, idx) => (
                  <div key={`${p.id}-${idx}`} className="active-rx-item">
                    <strong>{med.nom} {med.dose}</strong>
                    <span> — qté: {med.quantite} · {med.frequence}{med.voie ? ` · ${med.voie}` : ''}{p.prescripteur ? ` · Dr ${p.prescripteur.nom}` : ''}</span>
                    {p.notifierInfirmier && <span style={{ display: 'block', fontSize: 10, color: 'var(--navy)', marginTop: 2 }}>Infirmier notifié</span>}
                  </div>
                ))}
                <button
                  onClick={() => terminerPrescription(p.id)}
                  title="Terminer cette prescription"
                  style={{
                    position: 'absolute', right: 4, top: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--txt3)', fontSize: 16, lineHeight: 1,
                  }}
                >
                  <span className="ms">check_circle</span>
                </button>
              </div>
            )) : (
              <div className="active-rx-item">
                <span style={{ color: 'var(--txt3)' }}>Aucune prescription en cours</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === ONGLET ORDONNANCE === */}
      {activeTab === 'ordonnance' && (
        <OrdonnanceTab patient={patient} prescripteur={prescripteur} />
      )}

      {/* === ONGLET PREMIER SOIN === */}
      {activeTab === 'premiersoins' && (
        <PremierSoinTab patientId={patient.id} />
      )}

      {toast && <div className="tst on"><span className="ms">check_circle</span>{toast}</div>}

      <ConfirmationModal
        open={showConfirmValidation}
        title="Valider la prescription ?"
        message={`Vous êtes sur le point d'enregistrer une prescription médicamenteuse (${medicaments.length} médicament(s)). Confirmer ?`}
        confirmLabel="Valider"
        cancelLabel="Annuler"
        tone="primary"
        icon="fact_check"
        loading={loading}
        onCancel={() => setShowConfirmValidation(false)}
        onConfirm={async () => {
          setShowConfirmValidation(false);
          await handleValiderPrescription();
        }}
      />

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { setActiveTab('nouvelle'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onSendAll={async () => {
          setIsSending(true);
          try { await sendAll(prescripteur?.id || ''); } catch {} finally { setIsSending(false); }
        }}
        isSending={isSending}
      />
    </div>
  );
}
