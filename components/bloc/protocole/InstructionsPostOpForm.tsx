'use client'

import Checkbox from '@/components/ui/Checkbox'

// Instructions post-opératoires — remplies par l'anesthésiste dans la page Protocole anesthésique
// (surveillance, drainages, prescriptions), stockées dans l'enregistrement ProtocoleOperatoire
// côté backend, voir InstructionsPostOpForm utilisé dans cette page.

export type ModeDrainageAspiratif = 'SIPHON' | 'ASPIRATION'
export type ModeDrainageRedon = 'SIPHON' | 'REDON'

export interface InstructionsPostOpData {
  surveillance: {
    ta: { coche: boolean; valeur: string }
    pouls: { coche: boolean; valeur: string }
    fr: { coche: boolean; valeur: string }
    temperature: { coche: boolean; valeur: string }
    diurese: { coche: boolean; valeur: string }
    autres: { coche: boolean; valeur: string }
  }
  drainages: {
    sondeNasoGastrique: { actif: boolean; mode: ModeDrainageAspiratif }
    drainCrane: { actif: boolean; mode: ModeDrainageAspiratif }
    drainThorax: { actif: boolean; mode: ModeDrainageAspiratif }
    drainAbdomenGauche: { actif: boolean; mode: ModeDrainageRedon }
    drainAbdomenDroit: { actif: boolean; mode: ModeDrainageRedon }
    membreSeinAutres: { actif: boolean; mode: ModeDrainageRedon }
  }
  prescriptions: {
    perfusionBrasGauche: { valeur: string; enY: string }
    perfusionBrasDroit: { valeur: string; enY: string }
    voieCentrale: { valeur: string; enY: string }
    antibiotiques: string
    antalgiques: string
    autres: string
  }
}

export const DEFAULT_INSTRUCTIONS_POST_OP: InstructionsPostOpData = {
  surveillance: {
    ta: { coche: false, valeur: '' },
    pouls: { coche: false, valeur: '' },
    fr: { coche: false, valeur: '' },
    temperature: { coche: false, valeur: '' },
    diurese: { coche: false, valeur: '' },
    autres: { coche: false, valeur: '' },
  },
  drainages: {
    sondeNasoGastrique: { actif: false, mode: 'SIPHON' },
    drainCrane: { actif: false, mode: 'SIPHON' },
    drainThorax: { actif: false, mode: 'SIPHON' },
    drainAbdomenGauche: { actif: false, mode: 'SIPHON' },
    drainAbdomenDroit: { actif: false, mode: 'SIPHON' },
    membreSeinAutres: { actif: false, mode: 'SIPHON' },
  },
  prescriptions: {
    perfusionBrasGauche: { valeur: '', enY: '' },
    perfusionBrasDroit: { valeur: '', enY: '' },
    voieCentrale: { valeur: '', enY: '' },
    antibiotiques: '',
    antalgiques: '',
    autres: '',
  },
}

// Conversion vers le payload attendu par POST/PATCH /protocoles-operatoires : le backend stocke
// surveillance/prescriptions tels quels (simple-json) mais les drainages comme une liste plate
// (une ligne par type de drainage réellement actif), voir Drainage entity.
export function versPayloadProtocole(data: InstructionsPostOpData) {
  const drainages: { type: string; mode: string; cote?: string }[] = []
  if (data.drainages.sondeNasoGastrique.actif)
    drainages.push({ type: 'SONDE_NASO_GASTRIQUE', mode: data.drainages.sondeNasoGastrique.mode })
  if (data.drainages.drainCrane.actif)
    drainages.push({ type: 'DRAIN_CRANE', mode: data.drainages.drainCrane.mode })
  if (data.drainages.drainThorax.actif)
    drainages.push({ type: 'DRAIN_THORAX', mode: data.drainages.drainThorax.mode })
  if (data.drainages.drainAbdomenGauche.actif)
    drainages.push({ type: 'DRAIN_ABDOMEN', mode: data.drainages.drainAbdomenGauche.mode, cote: 'GAUCHE' })
  if (data.drainages.drainAbdomenDroit.actif)
    drainages.push({ type: 'DRAIN_ABDOMEN', mode: data.drainages.drainAbdomenDroit.mode, cote: 'DROITE' })
  if (data.drainages.membreSeinAutres.actif)
    drainages.push({ type: 'MEMBRE_SEIN_AUTRES', mode: data.drainages.membreSeinAutres.mode })

  return {
    surveillance: data.surveillance,
    drainages,
    prescriptions: data.prescriptions,
  }
}

// Reconstruction depuis un ProtocoleOperatoire existant (préremplissage quand un protocole a déjà
// été saisi) — tolérant aux formes historiques (surveillance en simples chaînes, prescriptions en
// booléens) pour ne pas planter sur d'anciens enregistrements.
export function depuisProtocole(protocole: any): InstructionsPostOpData {
  const base = DEFAULT_INSTRUCTIONS_POST_OP
  const s = protocole?.surveillance || {}
  const surveillanceLigne = (v: any) =>
    v && typeof v === 'object' ? { coche: !!v.coche, valeur: v.valeur ?? '' } : { coche: !!v, valeur: typeof v === 'string' ? v : '' }
  const p = protocole?.prescriptions || {}
  const perfusionLigne = (v: any) =>
    v && typeof v === 'object' ? { valeur: v.valeur ?? '', enY: v.enY ?? '' } : { valeur: '', enY: '' }

  const drainagesList: any[] = Array.isArray(protocole?.drainages) ? protocole.drainages : []
  const trouver = (type: string, cote?: string) =>
    drainagesList.find((d) => d.type === type && (cote ? d.cote === cote : !d.cote))
  const ligneDrainage = (type: string, cote?: string) => {
    const trouve = trouver(type, cote)
    return trouve ? { actif: true, mode: trouve.mode } : { actif: false, mode: 'SIPHON' as const }
  }

  return {
    surveillance: {
      ta: surveillanceLigne(s.ta) ?? base.surveillance.ta,
      pouls: surveillanceLigne(s.pouls) ?? base.surveillance.pouls,
      fr: surveillanceLigne(s.fr) ?? base.surveillance.fr,
      temperature: surveillanceLigne(s.temperature) ?? base.surveillance.temperature,
      diurese: surveillanceLigne(s.diurese ?? s.diurèse) ?? base.surveillance.diurese,
      autres: surveillanceLigne(s.autres) ?? base.surveillance.autres,
    },
    drainages: {
      sondeNasoGastrique: ligneDrainage('SONDE_NASO_GASTRIQUE') as any,
      drainCrane: ligneDrainage('DRAIN_CRANE') as any,
      drainThorax: ligneDrainage('DRAIN_THORAX') as any,
      drainAbdomenGauche: ligneDrainage('DRAIN_ABDOMEN', 'GAUCHE') as any,
      drainAbdomenDroit: ligneDrainage('DRAIN_ABDOMEN', 'DROITE') as any,
      membreSeinAutres: ligneDrainage('MEMBRE_SEIN_AUTRES') as any,
    },
    prescriptions: {
      perfusionBrasGauche: perfusionLigne(p.perfusionBrasGauche),
      perfusionBrasDroit: perfusionLigne(p.perfusionBrasDroit),
      voieCentrale: perfusionLigne(p.voieCentrale),
      antibiotiques: p.antibiotiques ?? '',
      antalgiques: p.antalgiques ?? '',
      autres: p.autres ?? '',
    },
  }
}

interface Props {
  value: InstructionsPostOpData
  onChange: (value: InstructionsPostOpData) => void
}

const SURVEILLANCE_ITEMS: { key: keyof InstructionsPostOpData['surveillance']; label: string; placeholder: string }[] = [
  { key: 'ta', label: 'TA (Tension)', placeholder: 'Val...' },
  { key: 'pouls', label: 'Pouls', placeholder: 'bpm' },
  { key: 'fr', label: 'FR (Respiration)', placeholder: 'c/min' },
  { key: 'temperature', label: 'Température', placeholder: '°C' },
  { key: 'diurese', label: 'Diurèse', placeholder: 'ml' },
  { key: 'autres', label: 'Autres', placeholder: '...' },
]

const DRAINAGES_ASPIRATIFS: { key: 'sondeNasoGastrique' | 'drainCrane' | 'drainThorax'; label: string }[] = [
  { key: 'sondeNasoGastrique', label: 'Sonde naso-gastrique' },
  { key: 'drainCrane', label: 'Drain crâne' },
  { key: 'drainThorax', label: 'Drain thorax' },
]

export default function InstructionsPostOpForm({ value, onChange }: Props) {
  const setSurveillance = (key: keyof InstructionsPostOpData['surveillance'], patch: Partial<{ coche: boolean; valeur: string }>) =>
    onChange({ ...value, surveillance: { ...value.surveillance, [key]: { ...value.surveillance[key], ...patch } } })

  const setDrainage = (key: keyof InstructionsPostOpData['drainages'], patch: Partial<{ actif: boolean; mode: string }>) =>
    onChange({ ...value, drainages: { ...value.drainages, [key]: { ...value.drainages[key], ...patch } } })

  const setPerfusion = (key: 'perfusionBrasGauche' | 'perfusionBrasDroit' | 'voieCentrale', patch: Partial<{ valeur: string; enY: string }>) =>
    onChange({ ...value, prescriptions: { ...value.prescriptions, [key]: { ...value.prescriptions[key], ...patch } } })

  return (
    <div className="space-y-4">
      {/* 1. Surveillance */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm ring-1 ring-black/5">
        <div className="flex items-center space-x-2 mb-4"><span className="material-symbols-outlined text-primary text-xl">monitor_heart</span><h3 className="font-headline font-bold uppercase text-xs tracking-widest">1. Surveillance</h3></div>
        <div className="space-y-2">
          {SURVEILLANCE_ITEMS.map((item) => (
            <label key={item.key} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <Checkbox size="lg" checked={value.surveillance[item.key].coche} onChange={(e) => setSurveillance(item.key, { coche: e.target.checked })} />
              <span className="text-sm font-medium text-on-surface-variant flex-1">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 2. Drainages */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm ring-1 ring-black/5">
        <div className="flex items-center space-x-2 mb-4"><span className="material-symbols-outlined text-primary text-xl">water_drop</span><h3 className="font-headline font-bold uppercase text-xs tracking-widest">2. Drainages</h3></div>
        <div className="space-y-2">
          {DRAINAGES_ASPIRATIFS.map((item) => (
            <label key={item.key} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <Checkbox size="lg" checked={value.drainages[item.key].actif} onChange={(e) => setDrainage(item.key, { actif: e.target.checked })} />
              <span className="text-sm font-medium text-on-surface-variant flex-1">{item.label}</span>
            </label>
          ))}
          {(['drainAbdomenGauche', 'drainAbdomenDroit'] as const).map((key) => (
            <label key={key} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <Checkbox size="lg" checked={value.drainages[key].actif} onChange={(e) => setDrainage(key, { actif: e.target.checked })} />
              <span className="text-sm font-medium text-on-surface-variant flex-1">Drain abdomen — {key === 'drainAbdomenGauche' ? 'Gauche' : 'Droite'}</span>
            </label>
          ))}
          <label className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <Checkbox size="lg" checked={value.drainages.membreSeinAutres.actif} onChange={(e) => setDrainage('membreSeinAutres', { actif: e.target.checked })} />
            <span className="text-sm font-medium text-on-surface-variant flex-1">Membre - Sein - Autres</span>
          </label>
        </div>
      </div>

      {/* 3. Prescription à suivre */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm ring-1 ring-black/5">
        <div className="flex items-center space-x-2 mb-4"><span className="material-symbols-outlined text-primary text-xl">prescriptions</span><h3 className="font-headline font-bold uppercase text-xs tracking-widest">3. Prescription à suivre</h3></div>
        <div className="space-y-4">
          <div>
            <h4 className="text-[10px] font-black text-outline uppercase tracking-wider mb-2">Perfusion</h4>
            {([
              { key: 'perfusionBrasGauche', label: 'Bras gauche' },
              { key: 'perfusionBrasDroit', label: 'Bras droit' },
              { key: 'voieCentrale', label: 'Voie centrale' },
            ] as const).map((item) => (
              <div key={item.key} className="bg-surface-container-low p-2 rounded-lg mb-1">
                <span className="text-xs font-medium block mb-1">{item.label}</span>
                <div className="flex gap-2">
                  <input className="flex-1 bg-white border-none rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary/30" placeholder="Valeur..." type="text"
                    value={value.prescriptions[item.key].valeur} onChange={(e) => setPerfusion(item.key, { valeur: e.target.value })} />
                  <input className="flex-1 bg-white border-none rounded px-2 py-1 text-xs focus:ring-1 focus:ring-secondary/30" placeholder="En Y..." type="text"
                    value={value.prescriptions[item.key].enY} onChange={(e) => setPerfusion(item.key, { enY: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-[10px] font-black text-outline uppercase tracking-wider mb-2">Traitement</h4>
            {[
              { placeholder: 'Antibiotiques...', key: 'antibiotiques' as const, icon: 'vaccines', color: 'border-l-secondary' },
              { placeholder: 'Antalgiques...', key: 'antalgiques' as const, icon: 'pill', color: 'border-l-primary' },
              { placeholder: 'Autres...', key: 'autres' as const, icon: 'more_horiz', color: 'border-l-outline' },
            ].map((item) => (
              <div key={item.key} className={`flex items-center bg-surface-container-low p-3 rounded-lg ${item.color} border-l-4 mb-2`}>
                <span className="material-symbols-outlined text-outline mr-2 text-sm">{item.icon}</span>
                <input className="bg-transparent border-none text-xs w-full focus:ring-0 placeholder:text-slate-400" placeholder={item.placeholder} type="text"
                  value={value.prescriptions[item.key]} onChange={(e) => onChange({ ...value, prescriptions: { ...value.prescriptions, [item.key]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
