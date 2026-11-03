'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { getPrescriptionsPatient, checkPremierSoinEligibility, getHistoriquePatient, getQuotaPremierSoin, creerPrescriptionMedicale, arreterPlanningItem } from '@/features/prescription/lib/api';
import { usePrescriptionPanier } from '@/features/prescription/contexts/PrescriptionPanierContext';
import { useAuth } from '@/features/prescription/contexts/AuthContext';
import { Medicament, CocktailPrescription, PrescriptionEnCours, Props } from './types';
import { calcAge, getFrequenceText, getDureeText, formatAriary } from './utils';
import { filterExpired } from '@/features/prescription/lib/prescriptionUtils';
import { subscribeSoinsMaj } from '@/features/prescription/platform/soins-realtime';
import MedicamentAddForm from './MedicamentAddForm';
import MedicamentList from './MedicamentList';
import CocktailAddForm from './CocktailAddForm';
import CocktailList from './CocktailList';
import OrdonnanceTab from './OrdonnanceTab';
import PrescriptionTermineeTab from './PrescriptionTermineeTab';
import PremierSoinQuotaBar from './PremierSoinQuotaBar';
import ValidationPopup from '../ValidationPopup';
import DrawerPanel from '../DrawerPanel';
import ArretPlanningDialog from '../ArretPlanningDialog';
import { useKeyboardNavigation } from '@/features/prescription/hooks/useKeyboardNavigation';
import { scrollPrescriptionContentToTop } from '@/features/prescription/lib/scrollUtils';
import { useDraftPersistence, loadDraft } from '@/features/prescription/hooks/useDraftPersistence';
import { Icone } from '@/components/ui/Icone';

type MedTab = 'nouvelle' | 'encours' | 'ordonnance' | 'terminee';

interface MedDraftData {
  medicaments: Medicament[];
  cocktails: CocktailPrescription[];
  remarqueGenerale: string;
  urgence: string;
}

const TABS: { key: MedTab; label: string; icon: string }[] = [
  { key: 'nouvelle', label: 'Nouvelle prescription', icon: 'add' },
  { key: 'encours', label: 'En cours', icon: 'pending_actions' },
  { key: 'terminee', label: 'Terminée', icon: 'task_alt' },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: active ? 600 : 500, flexShrink: 0,
  // Onglets actifs en VERT (couleur d'action de l'ergonomie clinique),
  // et non en navy. Texte vert fonce pour garder un contraste AA sur
  // le vert clair, comme les sous-onglets paracliniques (.psx-subtab).
  background: active ? 'var(--green, #2ECC71)' : 'var(--inp)',
  color: active ? '#103d29' : 'var(--txt2)', transition: 'all .15s',
});

export default function MedicaleForm({ patient, prescripteur, patientType }: Props) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation();
  const { addToPanier, setPatientId, panier, sendAll } = usePrescriptionPanier();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chuId = (user?.services as any[])?.[0]?.chu?.id || process.env.NEXT_PUBLIC_CHU_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceId = (user?.services as any[])?.[0]?.serviceId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceName = (user?.services as any[])?.[0]?.serviceName;
  const [activeTab, setActiveTab] = useState<MedTab>('nouvelle');
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [cocktails, setCocktails] = useState<CocktailPrescription[]>([]);
  const [remarqueGenerale, setRemarqueGenerale] = useState('');
  const [urgence, setUrgence] = useState('NORMAL');
  const [nomMedecin, setNomMedecin] = useState('');
  const [numeroONM, setNumeroONM] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');
  const [prescriptionsEnCours, setPrescriptionsEnCours] = useState<PrescriptionEnCours[]>([]);
  const [arretCible, setArretCible] = useState<{ kind: 'medicament' | 'cocktail'; id: string; label: string } | null>(null);
  const [arretBusy, setArretBusy] = useState(false);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0);
  const [premierSoinEligible, setPremierSoinEligible] = useState(false);
  const [kitDejaUtilise, setKitDejaUtilise] = useState(false);
  const [, setDraftRestored] = useState(false);
  const [, setDraftSavedAt] = useState<Date | null>(null);
  const [showMedicamentDrawer, setShowMedicamentDrawer] = useState(false);
  const [showCocktailDrawer, setShowCocktailDrawer] = useState(false);
  const [termineeCount, setTermineeCount] = useState(0);
  const [searchEncours, setSearchEncours] = useState('');
  const prevPatientIdRef = useRef<string | null>(null);

  const isHospitalise = patientType === 'hospitalise';

  const { clearDraft } = useDraftPersistence<MedDraftData>(
    `draft:medicale:${patient.id}`,
    { medicaments, cocktails, remarqueGenerale, urgence },
    { skip: !patient.id }
  );

  const isAccueil = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
  const age = calcAge(patient?.dateNaissance);
  const canValidate = medicaments.length > 0 || cocktails.length > 0;
  const totalPremierSoinDraft = premierSoinEligible && !kitDejaUtilise
    ? medicaments.filter(m => m.premierSoin).reduce((s, m) => s + (m.quantite * (m.prixUnitaire || 0)), 0)
      + cocktails.filter(c => c.premierSoin).reduce((s, c) => s + (c.composants || []).reduce((cs, comp) => cs + (comp.quantite * (comp.prixUnitaire || 0)), 0), 0)
    : 0;

  function showToast(msg: string) { setToast(msg); scrollPrescriptionContentToTop(); setTimeout(() => setToast(''), 2800); }

  const eligibilityGenerationRef = useRef(0);

  useEffect(() => {
    const patientChanged = prevPatientIdRef.current !== patient.id;
    prevPatientIdRef.current = patient.id;
    setPatientId(patient.id);
    const gen = ++eligibilityGenerationRef.current;

    if (patientChanged) {
      const draftKey = `draft:medicale:${patient.id}`;
      const draftData = loadDraft<MedDraftData>(draftKey);
      if (draftData) {
        let savedAt: Date | null = null;
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const envelope = JSON.parse(raw);
            if (envelope?.savedAt) savedAt = new Date(envelope.savedAt);
          }
        } catch {}
        startTransition(() => {
          setDraftRestored(false);
          setDraftSavedAt(null);
          if (draftData.medicaments?.length > 0) setMedicaments(draftData.medicaments);
          if (draftData.cocktails?.length > 0) setCocktails(draftData.cocktails);
          if (draftData.remarqueGenerale) setRemarqueGenerale(draftData.remarqueGenerale);
          if (draftData.urgence && draftData.urgence !== 'NORMAL') setUrgence(draftData.urgence);
          setDraftRestored(true);
          if (savedAt) setDraftSavedAt(savedAt);
        });
      } else {
        startTransition(() => {
          setDraftRestored(false);
          setDraftSavedAt(null);
        });
      }
    }

    const chuId = prescripteur.chuId;
    const serviceId = prescripteur.serviceId;

    async function fetchPrescriptions() {
      try {
        const data = await getPrescriptionsPatient('medicale', patient.id);
        if (eligibilityGenerationRef.current === gen) setPrescriptionsEnCours(filterExpired(data, 'medicaments'));
      } catch {}
    }
    fetchPrescriptions();

    async function fetchTermineeCount() {
      try {
        if (!isHospitalise) { setTermineeCount(0); return; }
        const all = await getHistoriquePatient(patient.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const terminees = all.filter((p: any) => p.statut === 'TERMINEE');
        if (eligibilityGenerationRef.current === gen) setTermineeCount(terminees.length);
      } catch {}
    }
    fetchTermineeCount();

    async function checkEligibility() {
      try {
        const result = await checkPremierSoinEligibility(patient.id, chuId, serviceId);
        if (eligibilityGenerationRef.current === gen) setPremierSoinEligible(result.eligible);
      } catch {
        if (eligibilityGenerationRef.current === gen) setPremierSoinEligible(false);
      }
    }
    checkEligibility();

    async function checkKitDejaUtilise() {
      try {
        if (!chuId) { if (eligibilityGenerationRef.current === gen) setKitDejaUtilise(false); return; }
        const q = await getQuotaPremierSoin(patient.id, chuId, serviceId);
        if (eligibilityGenerationRef.current === gen) setKitDejaUtilise(q.used > 0);
      } catch {
        if (eligibilityGenerationRef.current === gen) setKitDejaUtilise(false);
      }
    }
    checkKitDejaUtilise();
  }, [patient.id]);

  async function refreshPrescriptionsEnCours() {
    try {
      const data = await getPrescriptionsPatient('medicale', patient.id);
      setPrescriptionsEnCours(filterExpired(data, 'medicaments'));
    } catch {}
  }

  useEffect(() => subscribeSoinsMaj(detail => {
    if (!detail.patientId || detail.patientId === patient.id) void refreshPrescriptionsEnCours();
  }), [patient.id]);

  async function handleConfirmArret(motif: string) {
    if (!arretCible) return;
    setArretBusy(true);
    try {
      await arreterPlanningItem(arretCible.kind, arretCible.id, prescripteur?.id, motif || undefined);
      setPrescriptionsEnCours(prev => prev.map(p => {
        if (arretCible.kind === 'medicament') {
          return { ...p, medicaments: (p.medicaments || []).filter(m => m.id !== arretCible.id) };
        }
        if (arretCible.kind === 'cocktail') {
          return { ...p, cocktails: (p.cocktails || []).filter(c => c.id !== arretCible.id) };
        }
        return p;
      }).filter(p => (p.medicaments?.length ?? 0) > 0 || (p.cocktails?.length ?? 0) > 0));
      setArretCible(null);
      showToast('Prescription arrêtée');
    } catch {
      setArretCible(null);
      showToast("Erreur lors de l'arrêt");
    } finally {
      setArretBusy(false);
    }
  }

  function togglePremierSoin(id: string) {
    setMedicaments(prev => prev.map(m =>
      m.id === id ? { ...m, premierSoin: !m.premierSoin } : m
    ));
  }

  function togglePremierSoinCocktail(id: string) {
    setCocktails(prev => prev.map(c =>
      c.id === id ? { ...c, premierSoin: !c.premierSoin } : c
    ));
  }

  function buildPrescriptionData(includePremierSoinFlag = false) {
    const isAccueilService = prescripteur?.service?.toLowerCase().includes('accueil') ?? false;
    return {
      patientId: patient.id,
      prescripteurId: prescripteur.id,
      sourceType: isAccueilService ? 'EXTERNE' : 'INTERNE',
      urgence,
      remarques: remarqueGenerale,
      notifierInfirmier: medicaments.some(m => m.notifierInfirmier) || cocktails.some(c => c.notifierInfirmier),
      nomMedecinPrescripteur: nomMedecin,
      numeroONM: numeroONM,
      patientNom: patient.nom,
      patientPrenom: patient.prenom,
      patientAge: age,
      patientSexe: patient.sexe,
      prescripteurNom: prescripteur.nom,
      prescripteurPrenom: prescripteur.prenom,
      prescripteurService: prescripteur.service,
      prescriptionId: undefined as string | undefined,
      medicaments: medicaments.map(m => ({
        nom: m.nom, dose: m.dose, quantite: m.quantite, quantiteType: m.quantiteType || undefined,
        voie: m.voie, frequenceType: m.frequenceType, frequenceValeur: m.frequenceValeur,
        dureeJours: m.dureeJours, instructions: m.instructions, remarques: m.remarques,
        dateDebut: m.dateDebut || undefined, heureDebut: m.heureDebut || undefined,
        prixUnitaire: m.prixUnitaire || undefined,
        premierSoin: includePremierSoinFlag ? (m.premierSoin ?? true) : undefined,
        notifierInfirmier: m.notifierInfirmier,
        serviceNotifId: m.notifierInfirmier ? m.serviceNotifId : undefined,
      })),
      cocktails: cocktails.length > 0 ? cocktails.map(c => ({
        nom: c.nom,
        instructionsMelange: c.instructionsMelange || undefined,
        voie: c.voie || undefined,
        frequenceType: c.frequenceType || undefined,
        frequenceValeur: c.frequenceValeur || undefined,
        dureeJours: c.dureeJours || undefined,
        dateDebut: c.dateDebut || undefined,
        heureDebut: c.heureDebut || undefined,
        instructions: c.instructions || undefined,
        remarques: c.remarques || undefined,
        prixUnitaire: c.prixUnitaire || undefined,
        premierSoin: includePremierSoinFlag ? (c.premierSoin ?? true) : undefined,
        notifierInfirmier: c.notifierInfirmier,
        serviceNotifId: c.notifierInfirmier ? c.serviceNotifId : undefined,
        composants: (c.composants || []).map(comp => ({
          nom: comp.nom,
          dose: comp.dose,
          quantite: comp.quantite,
          articleId: comp.articleId || undefined,
          prixUnitaire: comp.prixUnitaire || undefined,
          premierSoin: includePremierSoinFlag ? (comp.premierSoin ?? true) : undefined,
        })),
      })) : undefined,
    };
  }

  // "Valider" — create prescription on backend (CREEE) + add to panier + redirect to en cours tab
  async function handleValiderPrescription() {
    if (!canValidate) return;
    setLoading(true);
    setApiError('');
    try {
      const prescriptionData = buildPrescriptionData(true);

      // Create prescription on backend immediately so it survives a "Retirer" on ordonnance tab
      const created = await creerPrescriptionMedicale(prescriptionData);
      if (created?.id) {
        prescriptionData.prescriptionId = created.id;
      }

      const summary = `${medicaments.length} médicament(s)${cocktails.length > 0 ? ` + ${cocktails.length} cocktail(s)` : ''}`;
      addToPanier('medicale', summary, prescriptionData);
      clearDraft();
      setMedicaments([]);
      setCocktails([]);
      setRemarqueGenerale('');
      setQuotaRefreshKey(k => k + 1);
      await refreshPrescriptionsEnCours();
      // Redirect to ordonnance tab — prescription is already in "En cours" for later
      setActiveTab('ordonnance');
      showToast('Prescription créée — vous pouvez générer l\'ordonnance');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setApiError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {apiError && (
        <div style={{ background: "var(--red-lt)", border: "1px solid var(--red-bdr)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
          {apiError}
        </div>
      )}

      {/* BARRE D'ONGLETS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} style={chipStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            <Icone nom={t.icon} style={{ fontSize: 16 }} />
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
            {t.key === 'nouvelle' && (medicaments.length + cocktails.length) > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {medicaments.length + cocktails.length}
              </span>
            )}
            {t.key === 'terminee' && termineeCount > 0 && (
              <span style={{
                background: activeTab === t.key ? '#fff' : 'var(--navy)',
                color: activeTab === t.key ? 'var(--navy)' : '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 2,
              }}>
                {termineeCount}
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
            {/* Boutons d'ajout : Médicament + Cocktail */}
            <div className="card mb12" style={{ padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {/*
                  Les deux cartes d'ajout partagent EXACTEMENT le meme habillage
                  (bordure pointillee `--navy-mid`, remplissage `--blue-ps-lt`
                  quand la carte contient des elements). Avant, le cocktail
                  utilisait une bordure `--navy` pleine intensite et un fond
                  rgba(5,102,141,0.08) : les deux boutons, pourtant de meme
                  niveau hierarchique, paraissaient de nature differente.
                */}
                <button
                  onClick={() => setShowMedicamentDrawer(true)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    border: '2px dashed var(--navy-mid)',
                    background: medicaments.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icone nom="medication" style={{ fontSize: 22, color: 'var(--navy)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy, #006A8C)' }}>
                      Ajouter un médicament
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {medicaments.length > 0
                        ? `${medicaments.length} médicament${medicaments.length > 1 ? 's' : ''}`
                        : 'Individuel'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowCocktailDrawer(true)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    border: '2px dashed var(--navy-mid)',
                    background: cocktails.length > 0 ? 'var(--blue-ps-lt)' : '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icone nom="science" style={{ fontSize: 22, color: 'var(--navy)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy, #006A8C)' }}>
                      Ajouter un cocktail de médicaments
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {cocktails.length > 0
                        ? `${cocktails.length} cocktail${cocktails.length > 1 ? 's' : ''}`
                        : 'Mélange 2+ médicaments'}
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <MedicamentList
              medicaments={medicaments}
              onRemove={(id) => setMedicaments(prev => prev.filter(m => m.id !== id))}
              onTogglePremierSoin={togglePremierSoin}
              premierSoinEligible={premierSoinEligible}
              kitDejaUtilise={kitDejaUtilise}
            />
            <CocktailList
              cocktails={cocktails}
              onRemove={(id) => setCocktails(prev => prev.filter(c => c.id !== id))}
              onTogglePremierSoin={togglePremierSoinCocktail}
              premierSoinEligible={premierSoinEligible}
              kitDejaUtilise={kitDejaUtilise}
            />
          </div>

          {/* COLONNE DROITE — sticky */}
          <div className="psx-side" style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Quota Premier Soin — only for eligible patients (ADMIS/EN_COURS) */}
            {premierSoinEligible && (
              <PremierSoinQuotaBar
                patientId={patient.id}
                chuId={prescripteur.chuId}
                serviceId={prescripteur.serviceId}
                refreshKey={quotaRefreshKey}
                draftPremierSoinTotal={totalPremierSoinDraft}
              />
            )}

            <div className="card" style={{ padding: 12 }}>
              <label className="lbl">Remarques générales</label>
              <textarea rows={3} placeholder="Notes complémentaires..." value={remarqueGenerale} onChange={e => setRemarqueGenerale(e.target.value)} />
            </div>

            {!canValidate && (
              <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: -8 }}>
                Ajoutez au moins un médicament ou un cocktail.
              </div>
            )}

            <button
              className="bp"
              onClick={handleValiderPrescription}
              disabled={!canValidate || loading}
              style={{
                opacity: canValidate && !loading ? 1 : 0.5,
                pointerEvents: canValidate && !loading ? 'auto' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icone nom="save" />{loading ? 'Validation...' : 'Valider'}
            </button>
          </div>
        </div>
      )}

      {/* === ONGLET PRESCRIPTIONS EN COURS === */}
      {activeTab === 'encours' && (() => {
        const q = searchEncours.toLowerCase().trim();
        const filteredEncours = q
          ? prescriptionsEnCours.filter(p => {
              const medMatch = p.medicaments?.some(m =>
                m.nom?.toLowerCase().includes(q) ||
                m.dose?.toLowerCase().includes(q) ||
                m.voie?.toLowerCase().includes(q) ||
                m.frequence?.toLowerCase().includes(q) ||
                m.instructions?.toLowerCase().includes(q)
              );
              const cocktailMatch = p.cocktails?.some(c =>
                c.nom?.toLowerCase().includes(q) ||
                c.instructionsMelange?.toLowerCase().includes(q) ||
                c.voie?.toLowerCase().includes(q) ||
                c.composants?.some(comp => comp.nom?.toLowerCase().includes(q))
              );
              const docMatch = p.prescripteur?.nom?.toLowerCase().includes(q) ||
                p.nomMedecinPrescripteur?.toLowerCase().includes(q);
              return medMatch || cocktailMatch || docMatch;
            })
          : prescriptionsEnCours;
        return (
        <div>
          <div className="active-rx" style={{ maxWidth: 700 }}>
            <div className="active-rx-header"><Icone nom="pending_actions" /><span>Prescriptions en cours</span></div>
            {prescriptionsEnCours.length > 3 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ position: 'relative' }}>
                  <Icone nom="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--txt3)' }} />
                  <input
                    type="text"
                    value={searchEncours}
                    onChange={e => setSearchEncours(e.target.value)}
                    placeholder="Rechercher par médicament, dose, voie, médecin..."
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--inp)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {searchEncours && (
                    <button onClick={() => setSearchEncours('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16, lineHeight: 1, padding: 0 }}>
                      <Icone nom="close" />
                    </button>
                  )}
                </div>
              </div>
            )}
            {filteredEncours.length > 0 ? filteredEncours.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginBottom: 4 }}>
                  {p.createdAt && (
                    <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icone nom="schedule" style={{ fontSize: 13 }} />
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {(p.nomMedecinPrescripteur || p.prescripteur?.nom) && (
                    <span style={{ fontSize: 11, color: 'var(--txt2)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icone nom="person" style={{ fontSize: 13 }} />
                      Dr {p.nomMedecinPrescripteur || p.prescripteur?.nom}
                    </span>
                  )}
                </div>
                {p.ordonnance && (
                  <div style={{
                    background: 'var(--green-lt)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    marginBottom: 4,
                    fontSize: 11,
                    color: 'var(--green-dk)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Icone nom="description" />
                    Ordonnance créée · {p.ordonnance.statut}
                  </div>
                )}
                {p.medicaments?.map((med, idx) => {
                  const freq = med.frequence || (med.frequenceType && med.frequenceValeur != null ? getFrequenceText(med.frequenceType, med.frequenceValeur) : '');
                  const dur = getDureeText(med);
                  const dateStr = med.dateDebut ? new Date(med.dateDebut).toLocaleDateString('fr-FR') : '';
                  return (
                    <div key={`${p.id}-${idx}`} className="active-rx-item" style={{ padding: '10px 12px', marginBottom: 6, background: 'var(--inp)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <strong style={{ fontSize: 13 }}>{med.nom} {med.dose}</strong>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--navy)', color: '#fff', fontWeight: 600 }}>
                          qté {med.quantite}
                        </span>
                        {med.premierSoin && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--amber)', color: '#fff', fontWeight: 600 }}>PS</span>
                        )}
                        {med.notifierInfirmier && (
                          <span style={{ fontSize: 9, color: 'var(--navy)', marginTop: 2, padding: '1px 5px', borderRadius: 4, background: 'var(--blue-ps-lt)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Icone nom="notifications_active" style={{ fontSize: 11 }} />
                            Infirmier notifié
                          </span>
                        )}
                        {med.id && med.planningActif !== false && (
                          <button
                            onClick={() => setArretCible({ kind: 'medicament', id: med.id as string, label: `${med.nom} ${med.dose}` })}
                            className="btn-stop-prescription"
                            title="Arrêter cette prescription"
                            style={{
                              marginLeft: 'auto', background: 'none', border: '1.5px solid var(--red-lt, #fecaca)',
                              color: 'var(--red)', fontSize: 11, fontWeight: 600, borderRadius: 8,
                              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <Icone nom="stop" style={{ fontSize: 14 }} />
                            Arrêter
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', lineHeight: 1.6 }}>
                        {med.voie && <span>Voie : <strong>{med.voie}</strong></span>}
                        {freq && <span>Fréquence : <strong>{freq}</strong></span>}
                        {dur && <span>Durée : <strong>{dur}</strong></span>}
                        {dateStr && <span>Début : <strong>{dateStr}</strong></span>}
                        {med.heureDebut && <span>Heure : <strong>{med.heureDebut}</strong></span>}
                      </div>
                      {med.instructions && (
                        <div style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic', marginTop: 4, padding: '4px 8px', background: 'rgba(0,0,0,.03)', borderRadius: 4 }}>
                          {med.instructions}
                        </div>
                      )}
                      {p.prescripteur?.nom && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>Dr {p.prescripteur.nom}</div>}
                    </div>
                  );
                })}
                {p.cocktails?.map((cocktail, cidx) => {
                  const freq = cocktail.frequenceType && cocktail.frequenceValeur != null ? getFrequenceText(cocktail.frequenceType, cocktail.frequenceValeur) : '';
                  const dur = getDureeText(cocktail);
                  const dateStr = cocktail.dateDebut ? new Date(cocktail.dateDebut).toLocaleDateString('fr-FR') : '';
                  const totalComp = cocktail.composants?.reduce((s, c) => s + (c.quantite * (c.prixUnitaire || 0)), 0) || 0;
                  return (
                    <div key={`${p.id}-cocktail-${cidx}`} className="active-rx-item" style={{ padding: '10px 12px', marginBottom: 6, background: 'rgba(5,102,141,0.05)', borderRadius: 8, borderLeft: '3px solid var(--navy, #006A8C)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Icone nom="science" style={{ fontSize: 14, color: 'var(--navy, #006A8C)' }} />
                        <strong style={{ fontSize: 13 }}>{cocktail.nom || (cocktail.composants?.map(c => `${c.nom} ${c.dose}`).join(' + ') || 'Cocktail')}</strong>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: 'var(--navy, #006A8C)', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>
                          Cocktail
                        </span>
                        {cocktail.premierSoin && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--amber)', color: '#fff', fontWeight: 600 }}>PS</span>
                        )}
                        {cocktail.notifierInfirmier && (
                          <span style={{ fontSize: 9, color: 'var(--navy)', marginTop: 2, padding: '1px 5px', borderRadius: 4, background: 'var(--blue-ps-lt)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Icone nom="notifications_active" style={{ fontSize: 11 }} />
                            Infirmier notifié
                          </span>
                        )}
                        {cocktail.id && cocktail.planningActif !== false && (
                          <button
                            onClick={() => setArretCible({ kind: 'cocktail', id: cocktail.id as string, label: cocktail.nom || 'Cocktail' })}
                            className="btn-stop-prescription"
                            title="Arrêter ce cocktail"
                            style={{
                              marginLeft: 'auto', background: 'none', border: '1.5px solid var(--red-lt, #fecaca)',
                              color: 'var(--red)', fontSize: 11, fontWeight: 600, borderRadius: 8,
                              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <Icone nom="stop" style={{ fontSize: 14 }} />
                            Arrêter
                          </button>
                        )}
                      </div>
                      {cocktail.instructionsMelange && (
                        <div style={{ fontSize: 11, color: 'var(--navy, #006A8C)', fontStyle: 'italic', marginTop: 2, padding: '4px 8px', background: 'rgba(5,102,141,0.08)', borderRadius: 4 }}>
                          Mélange: {cocktail.instructionsMelange}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--txt2)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', lineHeight: 1.6, marginTop: 4 }}>
                        {cocktail.voie && <span>Voie : <strong>{cocktail.voie}</strong></span>}
                        {freq && <span>Fréquence : <strong>{freq}</strong></span>}
                        {dur && <span>Durée : <strong>{dur}</strong></span>}
                        {dateStr && <span>Début : <strong>{dateStr}</strong></span>}
                        {cocktail.heureDebut && <span>Heure : <strong>{cocktail.heureDebut}</strong></span>}
                      </div>
                      {cocktail.composants && cocktail.composants.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          {cocktail.composants.map((comp, compIdx) => (
                            <div key={compIdx} style={{ fontSize: 11, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                              <Icone nom="medication" style={{ fontSize: 11, color: 'var(--txt3)' }} />
                              <span style={{ fontWeight: 600 }}>{comp.nom}</span>
                              <span>{comp.dose}</span>
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 6, background: 'var(--inp)', fontWeight: 600 }}>qté {comp.quantite}</span>
                              {comp.prixUnitaire != null && comp.prixUnitaire > 0 && (
                                <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{formatAriary(comp.prixUnitaire)}</span>
                              )}
                            </div>
                          ))}
                          {totalComp > 0 && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginTop: 4, textAlign: 'right' }}>
                              Total: {formatAriary(totalComp)}
                            </div>
                          )}
                        </div>
                      )}
                      {cocktail.instructions && (
                        <div style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic', marginTop: 4, padding: '4px 8px', background: 'rgba(0,0,0,.03)', borderRadius: 4 }}>
                          {cocktail.instructions}
                        </div>
                      )}
                      {cocktail.remarques && (
                        <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{cocktail.remarques}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )) : (
              <div className="active-rx-item">
                <span style={{ color: 'var(--txt3)' }}>
                  {q ? 'Aucun résultat pour cette recherche' : 'Aucune prescription en cours'}
                </span>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* === ONGLET ORDONNANCE === */}
      {activeTab === 'ordonnance' && (
        <OrdonnanceTab patient={patient} prescripteur={prescripteur} onAddNew={() => setActiveTab('nouvelle')} premierSoinEligible={premierSoinEligible} />
      )}

      {/* === ONGLET PRESCRIPTION TERMINÉE === */}
      {activeTab === 'terminee' && (
        <PrescriptionTermineeTab patientId={patient.id} patientType={patientType} onRefresh={() => {
          getHistoriquePatient(patient.id).then((all: any[]) => {
            setTermineeCount(all.filter((p: any) => p.statut === 'TERMINEE').length);
          }).catch(() => {});
        }} />
      )}

      {toast && <div className="tst on"><Icone nom="check_circle" />{toast}</div>}

      <ArretPlanningDialog
        key={arretCible?.id || 'arret'}
        cible={arretCible}
        busy={arretBusy}
        onClose={() => { if (!arretBusy) setArretCible(null); }}
        onConfirm={handleConfirmArret}
      />

      <ValidationPopup
        isOpen={showValidationPopup}
        onClose={() => setShowValidationPopup(false)}
        onAddNew={() => { setActiveTab('nouvelle'); scrollPrescriptionContentToTop(); }}
        onSendAll={async () => {
          setIsSending(true);
          try { const result = await sendAll(patient.id); if (result?.allSent) showToast("Prescriptions envoyées avec succès"); else if (result?.errorCount) setApiError("Erreur lors de l'envoi"); } catch { setApiError("Erreur lors de l'envoi"); } finally { setIsSending(false); }
        }}
        isSending={isSending}
      />

      {/* DrawerPanel pour MedicamentAddForm */}
      <DrawerPanel
        isOpen={showMedicamentDrawer}
        onClose={() => setShowMedicamentDrawer(false)}
        title="Ajouter un médicament"
        subtitle={medicaments.length > 0 ? `${medicaments.length} médicament${medicaments.length > 1 ? 's' : ''} déjà ajouté${medicaments.length > 1 ? 's' : ''}` : undefined}
        icon="medication"
        wide
      >
        <MedicamentAddForm
          patientType={patientType}
          isAccueil={isAccueil}
          onAdd={(med) => {
            setMedicaments(prev => [...prev, { ...med, premierSoin: premierSoinEligible }]);
            setShowMedicamentDrawer(false);
          }}
          onUrgenceChange={setUrgence}
          onNomMedecinChange={setNomMedecin}
          onNumeroONMChange={setNumeroONM}
          serviceId={serviceId}
          serviceName={serviceName}
          chuId={chuId}
        />
      </DrawerPanel>

      {/* DrawerPanel pour CocktailAddForm */}
      <DrawerPanel
        isOpen={showCocktailDrawer}
        onClose={() => setShowCocktailDrawer(false)}
        title="Cocktails de médicaments"
        subtitle={cocktails.length > 0 ? `${cocktails.length} cocktail${cocktails.length > 1 ? 's' : ''} de médicaments ajouté${cocktails.length > 1 ? 's' : ''}` : undefined}
        icon="science"
        wide
      >
        <CocktailAddForm
          isAccueil={isAccueil}
          onAdd={(cocktail) => {
            setCocktails(prev => [...prev, { ...cocktail, premierSoin: premierSoinEligible }]);
            setShowCocktailDrawer(false);
          }}
          serviceId={serviceId}
          serviceName={serviceName}
          chuId={chuId}
        />
      </DrawerPanel>
    </div>
  );
}
