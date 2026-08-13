'use client'
import { Suspense } from "react";

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { patientService } from '@/lib/api'
import { formaterIdDossier } from '@/lib/patient'
import MomentsTimeline from '@/components/bloc/moments-operatoire/MomentsTimeline'
import SurveillancePanel from '@/components/bloc/surveillance/SurveillancePanel'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import BackButton from '@/components/bloc/layout/BackButton'
import VoirDossierButton from '@/components/bloc/patient/VoirDossierButton'
import { useRole } from '@/lib/hooks/useRole'

export default function ActivitePendantOperationPage() {
  return (
    <RoleGate
      allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.IBODE, RoleClinique.MAJOR]}
      message="Cette page (chronologie de l'opération) n'est pas accessible pour votre rôle."
    >
      <Suspense fallback={<div>Chargement...</div>}>
        <ActivitePendantOperationPageContent />
      </Suspense>
    </RoleGate>
  );
}

function ActivitePendantOperationPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get('patientId') || ''
  const patientNom = searchParams.get('patientNom') || 'Patient'
  const intervention = searchParams.get('intervention') || ''
  const [patient, setPatient] = useState<any>(null)
  // Pendant l'opération, seul l'anesthésiste a une interface active ici (formulaire clinique et
  // boutons de chronologie) — l'IBODE n'a aucune interface à ce stade (voir MomentsTimeline),
  // le Major consulte sans agir. Tous deux ne voient que l'historique en lecture seule.
  const { estAnesthesiste } = useRole()

  useEffect(() => {
    if (!patientId) return
    patientService.getById(patientId).then(setPatient).catch(console.error)
  }, [patientId])

  // État du formulaire (hors constantes, gérées par SurveillancePanel)
  const [form, setForm] = useState({
    dateOperation: new Date().toISOString().split('T')[0],
    perfusions: '', transfusions: '', journalSorties: '',
    intubationOT: false, sArme: false, masqueLarynge: false,
    ventilationSpontanee: '', ventilationAssistee: '', ventilationControlee: '', ventilationPEEP: '', ventilationCircuitFerme: '',
    ventilationSpontaneeOn: false, ventilationAssisteeOn: false, ventilationControleeOn: false, ventilationPEEPOn: false, ventilationCircuitFermeOn: false,
  })

  const [loading, setLoading] = useState(false)
  // Enregistrement ActivitePerOp de ce patient — créé tôt (dès l'arrivée sur l'écran) pour que
  // les constantes puissent y être rattachées et synchronisées en temps réel au fur et à mesure
  // de l'opération, plutôt qu'une seule grosse saisie à la toute fin.
  const [activiteId, setActiviteId] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    let annule = false
    apiClient.get('/activites-per-op', { params: { patientId, limite: 1 } })
      .then(async ({ data }) => {
        if (annule) return
        const existante = data?.data?.[0]
        if (existante) { setActiviteId(existante.id); return }
        const { data: creee } = await apiClient.post('/activites-per-op', {
          patientId,
          dateOperation: new Date().toISOString().split('T')[0],
          intubationOT: false,
          sArme: false,
          masqueLarynge: false,
        })
        if (!annule) setActiviteId(creee.id)
      })
      .catch(console.error)
    return () => { annule = true }
  }, [patientId])

  const handleSubmit = async () => {
    if (!activiteId) return
    setLoading(true)
    try {
      await apiClient.patch(`/activites-per-op/${activiteId}`, {
        dateOperation: form.dateOperation,
        perfusions: form.perfusions,
        transfusions: form.transfusions,
        journalSorties: form.journalSorties,
        intubationOT: form.intubationOT,
        sArme: form.sArme,
        masqueLarynge: form.masqueLarynge,
        ventilation: {
          spontanee: form.ventilationSpontaneeOn ? (form.ventilationSpontanee || 'Oui') : undefined,
          assistee: form.ventilationAssisteeOn ? (form.ventilationAssistee || 'Oui') : undefined,
          controlee: form.ventilationControleeOn ? (form.ventilationControlee || 'Oui') : undefined,
          peep: form.ventilationPEEPOn ? (form.ventilationPEEP || 'Oui') : undefined,
          circuitFerme: form.ventilationCircuitFermeOn ? (form.ventilationCircuitFerme || 'Oui') : undefined,
        },
      })

      alert('✅ Activité enregistrée ! Passage à la check-list après intervention.')
      router.push(`/bloc/apres-operation?patientId=${patientId}&patientNom=${encodeURIComponent(patientNom)}&intervention=${encodeURIComponent(intervention)}`)
    } catch (err: any) {
      console.error(err)
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-[calc(100vh-6rem)] flex flex-col">
      {/* TopAppBar */}
      <header className="bg-white/80 backdrop-blur-xl z-50 shrink-0 border-b border-surface-container-highest shadow-sm flex justify-between items-center w-full px-6 py-2">
        <div className="flex items-center gap-6">
          <BackButton />
          <div className="h-10 w-px bg-surface-container-highest"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-0.5">Patient en cours</span>
            <h2 className="font-headline font-bold text-lg text-on-surface leading-tight">{patient?.nom || patientNom}{patient?.prenom ? ` ${patient.prenom}` : ''}</h2>
          </div>
          <div className="h-10 w-px bg-surface-container-highest"></div>
          <div className="grid grid-cols-4 gap-x-8 gap-y-1">
            <div><p className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-tighter">N° Dossier</p><p className="font-label text-xs font-bold text-on-surface">{formaterIdDossier(patient?.idDossier) ? `#${formaterIdDossier(patient?.idDossier)}` : '—'}</p></div>
            <div><p className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-tighter">Âge / Sexe</p><p className="font-label text-xs font-bold text-on-surface">{patient?.dateNaissance ? `${Math.max(0, Math.floor((Date.now() - new Date(patient.dateNaissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))} ans` : '—'} / {patient?.sexe || '—'}</p></div>
            <div><p className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-tighter">Opération</p><p className="font-label text-xs font-bold text-on-surface truncate">{intervention || patient?.libelle || '—'}</p></div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 rounded-full flex items-center gap-2 border bg-tertiary/10 text-tertiary border-tertiary/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
            <span className="text-[10px] font-extrabold tracking-wider">PROCÉDURE EN COURS</span>
          </div>
          <VoirDossierButton patientId={patientId} variant="icon" />
        </div>
      </header>

      {/* Body : colonne gauche scrollable (anesthésiste uniquement) + colonne droite fixe
          (boutons de chronologie, ne défile jamais avec la page) — l'IBODE ne voit que les
          boutons, aucun formulaire clinique ni checklist. */}
      <div className="flex-1 min-h-0 flex gap-6 p-6">
        {estAnesthesiste && (
        <div className="flex-1 min-w-0 overflow-y-auto space-y-6">
        {/* Section 1: APPORTS */}
        <section className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
          <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-xl">input</span>
            <h3 className="font-headline font-bold text-emerald-900 uppercase tracking-wide text-sm">Apports (entrées)</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">PERFUSIONS</label><textarea className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" rows={3} placeholder="Saisir les détails..." value={form.perfusions} onChange={e => setForm({...form, perfusions: e.target.value})}></textarea></div>
            <div className="space-y-2"><label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">TRANSFUSIONS</label><textarea className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" rows={3} placeholder="Saisir les détails..." value={form.transfusions} onChange={e => setForm({...form, transfusions: e.target.value})}></textarea></div>
          </div>
        </section>

        {/* Section 2: SORTIES */}
        <section className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
          <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-xl">output</span>
            <h3 className="font-headline font-bold text-amber-900 uppercase tracking-wide text-sm">Sorties</h3>
          </div>
          <div className="p-6"><div className="space-y-2"><label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">JOURNAL DES SORTIES</label><textarea className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-sm focus:ring-2 focus:ring-amber-500 outline-none" rows={4} placeholder="Quantifier et décrire..." value={form.journalSorties} onChange={e => setForm({...form, journalSorties: e.target.value})}></textarea></div></div>
        </section>

        {/* Section 3: SURVEILLANCE DES CONSTANTES */}
        <SurveillancePanel patientId={patientId} activiteId={activiteId} />

        {/* Section 4: VENTILATION */}
        <section className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-xl">ventilator</span>
            <h3 className="font-headline font-bold text-blue-900 uppercase tracking-wide text-sm">Ventilation</h3>
          </div>
          <div className="p-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'intubationOT', label: 'Intub. Orotrachéale (IOT)', icone: 'air' },
              { key: 'sArme', label: 'Intub. Nasotrachéale (INT)', icone: 'health_and_safety' },
              { key: 'masqueLarynge', label: 'Masque Laryngé (M.Laryngé)', icone: 'masks' }
            ].map(item => {
              const actif = form[item.key as keyof typeof form] as boolean
              return (
                <label key={item.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  actif ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-background border-surface-container-highest hover:border-outline-variant'
                }`}>
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={actif}
                    onChange={e => setForm({...form, [item.key]: e.target.checked})}
                  />
                  <span className={`material-symbols-outlined text-2xl ${actif ? 'text-blue-600' : 'text-on-surface-variant/50'}`} style={actif ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    {actif ? 'check_circle' : item.icone}
                  </span>
                  <span className={`text-xs font-bold uppercase ${actif ? 'text-blue-900' : 'text-on-surface'}`}>{item.label}</span>
                </label>
              )
            })}
          </div></div>
        </section>

        {/* Section 5: OPTIONS DE VENTILATION */}
        <section className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-xl">settings_input_component</span>
            <h3 className="font-headline font-bold text-blue-900 uppercase tracking-wide text-sm">Options de ventilation</h3>
          </div>
          <div className="p-6"><div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Spontanée', key: 'ventilationSpontanee', onKey: 'ventilationSpontaneeOn' },
              { label: 'Assistée', key: 'ventilationAssistee', onKey: 'ventilationAssisteeOn' },
              { label: 'Contrôlée', key: 'ventilationControlee', onKey: 'ventilationControleeOn' },
              { label: 'PEEP', key: 'ventilationPEEP', onKey: 'ventilationPEEPOn' },
              { label: 'Circuit fermé', key: 'ventilationCircuitFerme', onKey: 'ventilationCircuitFermeOn' },
            ].map(item => {
              const actif = form[item.onKey as keyof typeof form] as boolean
              return (
                <div key={item.key} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({...form, [item.onKey]: !actif})}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      actif ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-background border-surface-container-highest hover:border-outline-variant'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl ${actif ? 'text-blue-600' : 'text-on-surface-variant/50'}`} style={actif ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                      {actif ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${actif ? 'text-blue-900' : 'text-on-surface'}`}>{item.label}</span>
                  </button>
                  {actif && (
                    <input
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Détail (optionnel)..."
                      type="text"
                      value={form[item.key as keyof typeof form] as string}
                      onChange={e => setForm({...form, [item.key]: e.target.value})}
                    />
                  )}
                </div>
              )
            })}
          </div></div>
        </section>

        {/* VALIDER */}
        <div className="flex justify-end pt-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={loading || !activiteId}
            className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-4 rounded-xl font-headline font-extrabold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">save</span>
            {loading ? 'ENREGISTREMENT...' : 'VALIDER'}
          </button>
        </div>
        </div>
        )}

        {/* Colonne des boutons de chronologie + historique : largeur fixe pour l'anesthésiste
            (à côté du formulaire clinique), pleine largeur pour l'IBODE (seul contenu de l'écran). */}
        <div className={estAnesthesiste ? 'w-[420px] shrink-0 h-full' : 'flex-1 min-w-0 h-full max-w-2xl mx-auto'}>
          <MomentsTimeline patientId={patientId} />
        </div>
      </div>
    </main>
  )
}
