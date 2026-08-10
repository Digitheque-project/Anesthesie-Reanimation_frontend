'use client'
import { Suspense } from "react";

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { patientService } from '@/lib/api'
import { useRole } from '@/lib/hooks/useRole'
import Checkbox from '@/components/ui/Checkbox'
import RoleGate from '@/components/bloc/auth/RoleGate'
import { RoleClinique } from '@/lib/auth/role-clinique'
import PatientIdentityHeader from '@/components/bloc/patient/PatientIdentityHeader'
import BackButton from '@/components/bloc/layout/BackButton'
import { libelleAnesthesie } from '@/lib/export/dossier-patient'
import { useDraftAutosave, chargerBrouillon, effacerBrouillon, type Brouillon } from '@/lib/hooks/useDraftAutosave'

export default function VerificationVeillePage() {
  return (
    <RoleGate allowedRoles={[RoleClinique.ANESTHESISTE, RoleClinique.MAJOR]} message="Vous n'avez pas accès à la vérification de la veille.">
      <Suspense fallback={<div>Chargement...</div>}>
        <VerificationVeillePageContent />
      </Suspense>
    </RoleGate>
  );
}

type ReponseSecurite = boolean | null

function VerificationVeillePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get('patientId') || ''
  const patientNom = searchParams.get('patientNom') || 'Patient'
  const [patient, setPatient] = useState<any>(null)
  const [cpa, setCpa] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { estAnesthesiste, roleName } = useRole()
  const [form, setForm] = useState<{
    dateVisite: string
    identiteConfirmee: ReponseSecurite
    jeuneRespected: ReponseSecurite
    instructionsRespectees: ReponseSecurite
    premedicationFaite: ReponseSecurite
    jeune: string
    examensComplementaires: string
    heureDepart: string
  }>({
    dateVisite: new Date().toISOString().split('T')[0],
    // Aucune réponse pré-cochée : chaque item de sécurité doit être choisi explicitement par
    // l'anesthésiste (le vert n'apparaît qu'après un clic), pas de "OUI" par défaut.
    identiteConfirmee: null, jeuneRespected: null, instructionsRespectees: null, premedicationFaite: null,
    jeune: '', examensComplementaires: '', heureDepart: '09:00',
  })
  const [medicamentsVerifies, setMedicamentsVerifies] = useState<string[]>([])

  useEffect(() => {
    if (patientId) {
      patientService.getById(patientId).then(setPatient).catch(console.error)
      apiClient.get(`/cpa?patientId=${patientId}`).then(res => {
        if (res.data?.data?.length > 0) setCpa(res.data.data[0])
      }).catch(() => {})
    }
  }, [patientId])

  // Filet de sécurité coupure de courant / fermeture accidentelle — même mécanique que la CPA
  // (voir consultation-cpa/page.tsx) : sauvegarde locale debouncée, restauration sur confirmation
  // uniquement, effacée dès la validation réussie.
  const brouillonKey = patientId ? `verif-veille-brouillon:${patientId}` : null
  const brouillonSnapshot = { form, medicamentsVerifies }
  useDraftAutosave(brouillonKey, brouillonSnapshot)

  const [brouillonTrouve, setBrouillonTrouve] = useState<Brouillon<typeof brouillonSnapshot> | null>(null)
  useEffect(() => {
    if (!brouillonKey) return
    const brouillon = chargerBrouillon<typeof brouillonSnapshot>(brouillonKey)
    if (brouillon) setBrouillonTrouve(brouillon)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brouillonKey])

  const restaurerBrouillon = () => {
    if (!brouillonTrouve) return
    setForm(brouillonTrouve.data.form)
    setMedicamentsVerifies(brouillonTrouve.data.medicamentsVerifies)
    setBrouillonTrouve(null)
  }

  const ignorerBrouillon = () => {
    if (brouillonKey) effacerBrouillon(brouillonKey)
    setBrouillonTrouve(null)
  }

  const cpaId = cpa?.id || ''
  const medicamentsAnesthesie: { categorie: string; nom: string; mode?: string; dosage?: string; nombre?: number }[] =
    cpa?.medicamentsAnesthesieReanimation || []

  const toggleMedicamentVerifie = (nom: string) => {
    setMedicamentsVerifies(prev => prev.includes(nom) ? prev.filter(n => n !== nom) : [...prev, nom])
  }

  const securiteIncomplete = form.identiteConfirmee === null || form.jeuneRespected === null
    || form.instructionsRespectees === null || form.premedicationFaite === null

  const handleSubmit = async () => {
    if (!estAnesthesiste) {
      alert('❌ La vérification veille est réservée à l\'anesthésiste' + (roleName ? ` (votre rôle : ${roleName})` : ''))
      return
    }
    if (!cpaId) {
      alert('⚠️ Aucune CPA trouvée pour ce patient. Veuillez d\'abord réaliser une CPA.')
      return
    }
    if (securiteIncomplete) {
      alert('❌ Répondez à chaque item de vérification de sécurité (OUI/NON) avant de valider.')
      return
    }
    setLoading(true)
    try {
      await apiClient.post('/verification-veille', {
        patientId: patientId || patient?.id,
        cpaId,
        ...form,
        medicamentsVerifies,
      })
      if (brouillonKey) effacerBrouillon(brouillonKey)
      alert('✅ Vérification veille validée avec succès ! Le patient est basculé dans la liste des patients à opérer.')
      router.push('/bloc/rendez-vous')
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || 'Erreur inconnue'
      alert('❌ Erreur : ' + (Array.isArray(message) ? message.join(', ') : message))
    }
    finally { setLoading(false) }
  }

  return (
    <main className="p-6">
      <BackButton className="mb-3" />
      <PatientIdentityHeader patient={patient || { nom: patientNom }} patientId={patientId} />
      <div className="flex justify-end -mt-2 mb-3">
        {cpaId ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase tracking-wider">✅ CPA validée</span>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider">⚠️ CPA non réalisée</span>
        )}
      </div>

      <p className="mt-2 text-sm text-on-surface-variant">Contrôle final réalisé la veille de l'intervention, avant le passage au bloc.</p>
      {!estAnesthesiste && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          La validation de la vérification veille est réservée à l'anesthésiste{roleName ? ` (votre rôle : ${roleName})` : ''}. Vous pouvez consulter les informations, mais pas valider.
        </div>
      )}

      {/* Saisie non enregistrée retrouvée localement (coupure de courant, fermeture accidentelle
          de l'onglet...) — jamais appliquée automatiquement, uniquement sur confirmation. */}
      {brouillonTrouve && (
        <div className="mt-3 rounded-xl px-4 py-3 text-sm font-bold flex flex-wrap items-center gap-3 bg-amber-50 text-amber-900 border border-amber-200">
          <span className="material-symbols-outlined text-lg">restore</span>
          <span className="flex-1 min-w-[220px]">
            Une saisie non enregistrée du {new Date(brouillonTrouve.savedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} a été retrouvée pour ce patient.
          </span>
          <button type="button" onClick={restaurerBrouillon}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">
            Restaurer
          </button>
          <button type="button" onClick={ignorerBrouillon}
            className="px-3 py-1.5 bg-white text-amber-800 border border-amber-300 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
            Ignorer
          </button>
        </div>
      )}

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Vérification de sécurité */}
        <section className="lg:col-span-8 rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary-fixed/20 to-white shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-primary/10 border-b border-primary/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
            <h3 className="text-lg font-extrabold text-on-surface uppercase tracking-wide">Vérification de sécurité</h3>
            <span className="ml-auto px-2 py-0.5 bg-primary text-on-primary text-[10px] font-extrabold uppercase rounded-full">Obligatoire</span>
          </div>
          <div className="p-6 space-y-4">
            {[
              { icon: 'badge', titre: 'Identité du patient confirmée', desc: 'Vérification du bracelet et de l\'interrogatoire', key: 'identiteConfirmee' as const },
              { icon: 'fastfood', titre: 'Jeûne pré-opératoire respecté', desc: 'Dernière ingestion solide > 6h / Liquide > 2h', key: 'jeuneRespected' as const },
              { icon: 'assignment_turned_in', titre: 'Instructions pré-anesthésiques respectées', desc: 'Arrêt des traitements (Anticoagulants, etc.)', key: 'instructionsRespectees' as const },
            ].map(item => {
              const valeur = form[item.key]
              return (
                <div key={item.key} className="p-5 bg-surface-container-low rounded-xl flex items-center justify-between group hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">{item.titre}</p>
                      <p className="text-[11px] text-on-surface-variant">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex bg-white/80 p-1.5 rounded-lg border border-outline-variant/30">
                    <button onClick={() => setForm({...form, [item.key]: true})}
                      className={`px-7 py-3 rounded-lg font-bold text-sm transition-all ${valeur === true ? 'bg-emerald-500 text-white' : 'text-on-surface-variant hover:bg-white'}`}>OUI</button>
                    <button onClick={() => setForm({...form, [item.key]: false})}
                      className={`px-7 py-3 rounded-lg font-bold text-sm transition-all ${valeur === false ? 'bg-red-500 text-white' : 'text-on-surface-variant hover:bg-white'}`}>NON</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Décision CPA (rappel) */}
        <section className="lg:col-span-4 bg-surface-container-high rounded-xl p-8 flex flex-col shadow-sm border border-outline-variant/30">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">history_edu</span>
            <h3 className="text-lg font-bold text-on-surface">CPA de référence</h3>
          </div>
          {cpa ? (
            <div className="flex-1 space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-secondary shadow-sm">
                <p className="text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">Score ASA</p>
                <p className="text-2xl font-black text-on-surface">{cpa.scoreASA ?? '—'}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm">
                <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest mb-2">Protocole retenu</p>
                <p className="text-sm font-semibold text-on-surface leading-relaxed">{libelleAnesthesie(cpa)}{cpa.techniqueIntubation ? ` — ${cpa.techniqueIntubation}` : ''}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm">
                <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest mb-2">Décision</p>
                <p className="text-sm font-semibold text-on-surface">{cpa.decision || '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant italic">Aucune CPA trouvée pour ce patient.</p>
          )}
        </section>

        {/* Prémédication & Préparation */}
        <section className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-outline-variant/30">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary text-2xl">medication_liquid</span>
              <h3 className="text-lg font-bold text-on-surface">Prémédication</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.premedicationFaite === false} onChange={() => setForm({...form, premedicationFaite: false})} />
                <span className="text-sm font-semibold">Non-faite</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.premedicationFaite === true} onChange={() => setForm({...form, premedicationFaite: true})} />
                <span className="text-sm font-semibold">Faite</span>
              </label>
            </div>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary text-2xl">clinical_notes</span>
              <h3 className="text-lg font-bold text-on-surface">Préparation</h3>
            </div>
            <div className="space-y-4 flex-1">
              <label className="text-sm font-semibold">Jeûne complet à partir de...</label>
              <input className="w-full bg-surface-container-low border border-outline-variant/30 rounded text-sm px-3 py-2" placeholder="Heure ou instructions..." type="text" value={form.jeune} onChange={e => setForm({...form, jeune: e.target.value})} />
            </div>
            {/* Heure de départ au bloc — en bas à gauche de la section Préparation */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex justify-start">
              <div className="flex flex-col items-start">
                <label className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest mb-2">Heure de départ au bloc</label>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-primary">schedule</span>
                  <input
                    type="time"
                    value={form.heureDepart}
                    onChange={e => setForm({...form, heureDepart: e.target.value})}
                    className="bg-surface-container-low border border-primary/30 rounded-lg px-3 py-1.5 text-lg font-black text-primary focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    style={{ width: '120px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Médicaments d'anesthésie/réanimation — re-vérification de ce qui a été coché en CPA */}
        {medicamentsAnesthesie.length > 0 && (
          <section className="lg:col-span-12 bg-white rounded-xl p-8 shadow-sm border border-outline-variant/30">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary text-2xl">medication</span>
              <h3 className="text-lg font-bold text-on-surface">Médicaments d'anesthésie et de réanimation — re-vérification</h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-5">Liste cochée pendant la CPA. Recochez chaque médicament pour confirmer sa disponibilité la veille de l'opération.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {medicamentsAnesthesie.map((m, i) => {
                const verifie = medicamentsVerifies.includes(m.nom)
                return (
                  <label key={`${m.nom}-${i}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${verifie ? 'bg-emerald-50 border-emerald-300' : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container'}`}>
                    <Checkbox checked={verifie} onChange={() => toggleMedicamentVerifie(m.nom)} />
                    <span>
                      <span className="block text-sm font-bold text-on-surface">{m.nom}</span>
                      <span className="block text-[11px] text-on-surface-variant">{m.categorie}{m.dosage ? ` • ${m.dosage}` : ''}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="mt-4 text-xs font-bold text-on-surface-variant">{medicamentsVerifies.length}/{medicamentsAnesthesie.length} médicaments reconfirmés</p>
          </section>
        )}

        {/* Footer Actions */}
        <section className="lg:col-span-12 flex items-center justify-end gap-4 p-6 bg-surface-container text-on-surface rounded-xl shadow-sm border border-outline-variant/30">
          <button
            onClick={handleSubmit}
            disabled={loading || !cpaId || securiteIncomplete}
            title={securiteIncomplete ? 'Répondez à chaque item de vérification de sécurité avant de valider' : undefined}
            className={`px-10 py-4 rounded-lg font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap ${
              cpaId && !securiteIncomplete ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined font-bold">check_circle</span>
            {!cpaId ? 'CPA REQUISE' : securiteIncomplete ? 'VÉRIFICATION INCOMPLÈTE' : loading ? 'VALIDATION...' : 'VALIDER LA VÉRIFICATION'}
          </button>
        </section>
      </div>
    </main>
  )
}
