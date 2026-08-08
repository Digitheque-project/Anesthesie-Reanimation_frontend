'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { patientService } from '@/lib/api'

interface DossierPatientTabsProps {
  patientId: string
}

interface DossierComplet {
  observations: any[]
  diagnostics: any[]
  antecedents: any[]
  histoiresMaladie: any[]
  examensPhysiques: any[]
  examensComplementaires: any[]
  suivis: any[]
  protocolesOperatoires: any[]
  sortie: any[]
}

type OngletId = 'observation' | 'diagnostic' | 'suivi' | 'prescription' | 'compteRendu' | 'paraclinique' | 'sortie' | 'historique'

const ONGLETS: { id: OngletId; label: string; icone: string }[] = [
  { id: 'observation', label: 'Observation médicale', icone: 'stethoscope' },
  { id: 'diagnostic', label: 'Diagnostic', icone: 'fact_check' },
  { id: 'suivi', label: 'Suivi / Évolution', icone: 'monitoring' },
  { id: 'prescription', label: 'Prescription', icone: 'prescriptions' },
  { id: 'compteRendu', label: 'Compte-rendu opératoire', icone: 'content_cut' },
  { id: 'paraclinique', label: 'Résultats paracliniques', icone: 'biotech' },
  { id: 'sortie', label: 'Sortie', icone: 'logout' },
  { id: 'historique', label: 'Historique', icone: 'history' },
]

const formaterDate = (v?: string | null, avecHeure = false) => {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return avecHeure
    ? d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'red' | 'green' | 'amber' | 'blue' }) {
  const classes: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${classes[tone]}`}>{children}</span>
}

function Constante({ icone, label, valeur, unite }: { icone: string; label: string; valeur: any; unite?: string }) {
  if (valeur === undefined || valeur === null || valeur === '') return null
  return (
    <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1.5 rounded-lg border border-outline-variant/20">
      <span className="material-symbols-outlined text-sm text-primary">{icone}</span>
      <div className="leading-tight">
        <p className="text-[9px] font-bold text-on-surface-variant uppercase">{label}</p>
        <p className="text-xs font-extrabold text-on-surface">{valeur}{unite}</p>
      </div>
    </div>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p className="text-sm text-on-surface-variant italic py-6 text-center">{texte}</p>
}

function CarteBase({ enTete, children }: { enTete: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-4 space-y-3">
      {enTete}
      {children}
    </div>
  )
}

export default function DossierPatientTabs({ patientId }: DossierPatientTabsProps) {
  const [onglet, setOnglet] = useState<OngletId>('observation')
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(false)
  const [dossier, setDossier] = useState<DossierComplet | null>(null)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    setErreur(false)
    patientService.getDossierComplet(patientId)
      .then(setDossier)
      .catch(() => setErreur(true))
      .finally(() => setLoading(false))
  }, [patientId])

  const renderObservation = () => {
    const items = dossier?.observations || []
    if (!items.length) return <Vide texte="Aucune observation médicale enregistrée." />
    return (
      <div className="space-y-3">
        {items.map((o: any, i: number) => (
          <CarteBase key={o.id || i} enTete={
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">{o.observationType || 'Observation'}</p>
                <p className="text-xs text-on-surface-variant">{formaterDate(o.createdAt, true)}</p>
              </div>
              {o.urgencyLevel && <Badge tone={o.urgencyLevel <= 2 ? 'red' : 'amber'}>Niveau {o.urgencyLevel}</Badge>}
            </div>
          }>
            <div className="flex flex-wrap gap-2">
              <Constante icone="monitor_heart" label="TA" valeur={o.systolicBP && o.diastolicBP ? `${o.systolicBP}/${o.diastolicBP}` : null} unite=" mmHg" />
              <Constante icone="favorite" label="FC" valeur={o.heartRate} unite=" bpm" />
              <Constante icone="thermostat" label="Temp" valeur={o.temperature} unite="°C" />
              <Constante icone="air" label="FR" valeur={o.respiratoryRate} unite=" /min" />
              <Constante icone="water_drop" label="SpO2" valeur={o.oxygenSaturation} unite="%" />
              <Constante icone="scale" label="Poids" valeur={o.weight} unite=" kg" />
              <Constante icone="straighten" label="Taille" valeur={o.height} unite=" cm" />
            </div>
            {o.symptoms && <p className="text-sm"><span className="font-bold text-on-surface-variant">Symptômes : </span>{o.symptoms}</p>}
            {o.physicalExamination && <p className="text-sm"><span className="font-bold text-on-surface-variant">Examen physique : </span>{o.physicalExamination}</p>}
            {o.clinicalImpressions && <p className="text-sm"><span className="font-bold text-on-surface-variant">Impressions cliniques : </span>{o.clinicalImpressions}</p>}
          </CarteBase>
        ))}
      </div>
    )
  }

  const renderDiagnostic = () => {
    const items = dossier?.diagnostics || []
    if (!items.length) return <Vide texte="Aucun diagnostic renseigné." />
    return (
      <div className="space-y-3">
        {items.map((d: any, i: number) => (
          <CarteBase key={d.id || i} enTete={
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">{d.icdLabel || d.diagnosticPrincipal || 'Diagnostic'}</p>
                {d.icdCode && <p className="text-xs text-on-surface-variant font-mono">{d.icdCode}</p>}
              </div>
              <div className="flex gap-1">
                {d.isPrimary && <Badge tone="blue">Principal</Badge>}
                <Badge tone={d.type === 'RETENU' ? 'green' : 'amber'}>{d.type === 'RETENU' ? 'Retenu' : 'Suspicion'}</Badge>
              </div>
            </div>
          }>
            {d.diagnosticSecondaire && <p className="text-sm"><span className="font-bold text-on-surface-variant">Secondaire : </span>{d.diagnosticSecondaire}</p>}
            {d.justification && <p className="text-sm"><span className="font-bold text-on-surface-variant">Justification : </span>{d.justification}</p>}
            {d.diagnosticDifferentielle && <p className="text-sm"><span className="font-bold text-on-surface-variant">Diagnostic différentiel : </span>{d.diagnosticDifferentielle}</p>}
            {d.severityScore && <p className="text-sm"><span className="font-bold text-on-surface-variant">Sévérité : </span>{d.severityScore}</p>}
          </CarteBase>
        ))}
      </div>
    )
  }

  const renderSuivi = () => {
    const items = dossier?.suivis || []
    if (!items.length) return <Vide texte="Aucun suivi enregistré." />
    return (
      <div className="space-y-3">
        {items.map((s: any, i: number) => (
          <CarteBase key={s.id || i} enTete={
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-on-surface">{formaterDate(s.createdAt || s.date, true)}</p>
                  {s.signesAlerte && <Badge tone="red">Alerte</Badge>}
                  {s.jourHospitalisation && <Badge tone="gray">{s.jourHospitalisation}</Badge>}
                </div>
                <p className="text-xs text-on-surface-variant">{s.auteur || ''}</p>
              </div>
              {s.etatGeneral && <Badge tone={/stable|bon|améliora/i.test(s.etatGeneral) ? 'green' : 'red'}>{s.etatGeneral}</Badge>}
            </div>
          }>
            <div className="flex flex-wrap gap-2">
              <Constante icone="thermostat" label="Temp" valeur={s.temperature} unite="°C" />
              <Constante icone="monitor_heart" label="TA" valeur={s.taSystolique && s.taDiastolique ? `${s.taSystolique}/${s.taDiastolique}` : null} />
              <Constante icone="favorite" label="FC" valeur={s.frequenceCardiaque} unite=" bpm" />
              <Constante icone="air" label="FR" valeur={s.frequenceRespiratoire} unite=" /min" />
              <Constante icone="psychology" label="Glasgow" valeur={s.glasgow} unite="/15" />
              <Constante icone="sentiment_dissatisfied" label="EVA" valeur={s.evaDouleur} unite="/10" />
            </div>
            {s.examenClinique && <p className="text-sm"><span className="font-bold text-on-surface-variant">Examen clinique : </span>{s.examenClinique}</p>}
            {s.evolution && (
              <div className="bg-surface-container-lowest rounded-lg p-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Évolution / Note</p>
                <p className="text-sm">{s.evolution}</p>
              </div>
            )}
          </CarteBase>
        ))}
      </div>
    )
  }

  const renderCompteRendu = () => {
    const items = dossier?.protocolesOperatoires || []
    if (!items.length) return <Vide texte="Aucun compte-rendu opératoire enregistré." />
    return (
      <div className="space-y-3">
        {items.map((p: any, i: number) => (
          <CarteBase key={p.id || i} enTete={
            <div className="flex items-start justify-between">
              <p className="text-sm font-bold text-on-surface">{formaterDate(p.dateOperation)}</p>
              {p.chirurgien && <Badge tone="blue">{p.chirurgien.prenom} {p.chirurgien.nom}</Badge>}
            </div>
          }>
            <p className="text-sm whitespace-pre-line">{p.compteRenduIntervention || 'Compte-rendu non renseigné.'}</p>
          </CarteBase>
        ))}
      </div>
    )
  }

  const renderParaclinique = () => {
    const items = dossier?.examensComplementaires || []
    if (!items.length) return <Vide texte="Aucun résultat paraclinique enregistré." />
    return (
      <div className="space-y-3">
        {items.map((e: any, i: number) => (
          <CarteBase key={e.id || i} enTete={
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">{e.titre || e.examinationType}</p>
                <p className="text-xs text-on-surface-variant">{formaterDate(e.dateExamen)} {e.laboratoire ? `· ${e.laboratoire}` : ''}</p>
              </div>
              <div className="flex gap-1">
                {e.isUrgent && <Badge tone="red">Urgent</Badge>}
                <Badge tone="gray">{e.examinationType}</Badge>
              </div>
            </div>
          }>
            {e.resultats && <p className="text-sm"><span className="font-bold text-on-surface-variant">Résultats : </span>{e.resultats}</p>}
            {e.interpretation && <p className="text-sm"><span className="font-bold text-on-surface-variant">Interprétation : </span>{e.interpretation}</p>}
            {e.conclusion && <p className="text-sm"><span className="font-bold text-on-surface-variant">Conclusion : </span>{e.conclusion}</p>}
          </CarteBase>
        ))}
      </div>
    )
  }

  const renderSortie = () => {
    const items = dossier?.sortie || []
    if (!items.length) return <Vide texte="Aucune sortie médicale enregistrée pour ce séjour." />
    return (
      <div className="space-y-3">
        {items.map((s: any, i: number) => (
          <CarteBase key={s.id || i} enTete={
            <div className="flex items-start justify-between">
              <p className="text-sm font-bold text-on-surface">{s.etatSortie || 'Sortie'}</p>
              <Badge tone={s.modeSortie === 'DECES' ? 'red' : s.modeSortie === 'SORTIE_AUTORISEE' ? 'green' : 'amber'}>{s.modeSortie?.replace(/_/g, ' ')}</Badge>
            </div>
          }>
            {s.motifSortie && <p className="text-sm"><span className="font-bold text-on-surface-variant">Motif : </span>{s.motifSortie}</p>}
            {s.diagnosticFinal && <p className="text-sm"><span className="font-bold text-on-surface-variant">Diagnostic final : </span>{s.diagnosticFinal}</p>}
            {s.traitementSortie && <p className="text-sm"><span className="font-bold text-on-surface-variant">Traitement de sortie : </span>{s.traitementSortie}</p>}
            {s.conduiteATenir && <p className="text-sm"><span className="font-bold text-on-surface-variant">Conduite à tenir : </span>{s.conduiteATenir}</p>}
            {s.rendezVousControle && <p className="text-sm"><span className="font-bold text-on-surface-variant">RDV de contrôle : </span>{s.rendezVousControle}</p>}
          </CarteBase>
        ))}
      </div>
    )
  }

  const renderHistorique = () => {
    const antecedents = dossier?.antecedents || []
    const histoires = dossier?.histoiresMaladie || []
    const examens = dossier?.examensPhysiques || []
    if (!antecedents.length && !histoires.length && !examens.length) return <Vide texte="Aucun historique renseigné." />
    return (
      <div className="space-y-6">
        {antecedents.length > 0 && (
          <div>
            <h4 className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wide mb-2">Antécédents</h4>
            <div className="space-y-2">
              {antecedents.map((a: any, i: number) => (
                <CarteBase key={a.id || i} enTete={
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold text-on-surface">{a.title || a.category}</p>
                    {a.isActive === false && <Badge tone="gray">Inactif</Badge>}
                  </div>
                }>
                  {a.description && <p className="text-sm">{a.description}</p>}
                  {a.allergySeverity && <Badge tone="red">Allergie {a.allergySeverity}</Badge>}
                </CarteBase>
              ))}
            </div>
          </div>
        )}
        {histoires.length > 0 && (
          <div>
            <h4 className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wide mb-2">Histoire de la maladie</h4>
            <div className="space-y-2">
              {histoires.map((h: any, i: number) => (
                <CarteBase key={h.id || i} enTete={
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold text-on-surface">{formaterDate(h.createdAt, true)}</p>
                    {h.isEmergency && <Badge tone="red">Urgence</Badge>}
                  </div>
                }>
                  {h.chronologicalNarrative && <p className="text-sm">{h.chronologicalNarrative}</p>}
                </CarteBase>
              ))}
            </div>
          </div>
        )}
        {examens.length > 0 && (
          <div>
            <h4 className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wide mb-2">Derniers examens physiques</h4>
            <div className="space-y-2">
              {examens.map((e: any, i: number) => (
                <CarteBase key={e.id || i} enTete={<p className="text-sm font-bold text-on-surface">{e.category?.replace(/_/g, ' ')}</p>}>
                  {e.notes && <p className="text-sm">{e.notes}</p>}
                </CarteBase>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPrescription = () => (
    <div className="text-sm text-on-surface-variant italic py-6 text-center">
      Intégration avec le service Prescription en cours — les prescriptions apparaîtront ici prochainement.
    </div>
  )

  const renderContenu = () => {
    if (loading) return <p className="text-sm text-on-surface-variant py-6 text-center">Chargement du dossier...</p>
    if (erreur) return <p className="text-sm text-on-surface-variant italic py-6 text-center">Dossier patient indisponible pour le moment.</p>
    switch (onglet) {
      case 'observation': return renderObservation()
      case 'diagnostic': return renderDiagnostic()
      case 'suivi': return renderSuivi()
      case 'prescription': return renderPrescription()
      case 'compteRendu': return renderCompteRendu()
      case 'paraclinique': return renderParaclinique()
      case 'sortie': return renderSortie()
      case 'historique': return renderHistorique()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="flex items-center justify-end px-3 py-2 border-b border-outline-variant/20 bg-surface-container-lowest">
        <Link
          href={`/bloc/dossier-patient/${patientId}/complet`}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-base">open_in_new</span>
          Ouvrir le dossier complet (édition + prescription)
        </Link>
      </div>
      <div className="flex overflow-x-auto border-b border-outline-variant/20 bg-surface-container-lowest">
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
              onglet === o.id ? 'border-primary text-primary bg-white' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
            }`}>
            <span className="material-symbols-outlined text-base">{o.icone}</span>
            {o.label}
          </button>
        ))}
      </div>
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {renderContenu()}
      </div>
    </div>
  )
}
