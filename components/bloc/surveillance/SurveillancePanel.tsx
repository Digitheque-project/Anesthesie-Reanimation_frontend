'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { useOperationRealtime } from '@/lib/hooks/useOperationRealtime'
import { useSurveillanceAlarm } from '@/lib/hooks/useSurveillanceAlarm'

type Constante = {
  id: string
  fc: number
  ta: string
  spo2: number
  temperature: number
  capnie: number
  score: number
  horodatage: string | null
  heure: string
}

const CHAMPS = [
  { label: 'FC (BPM)', key: 'fc' },
  { label: 'TA (MMHG)', key: 'ta' },
  { label: 'SPO2 (%)', key: 'spo2' },
  { label: 'CAPNIE', key: 'capnie' },
  { label: 'SCORE', key: 'score' },
  { label: 'TEMPÉRATURE (°C)', key: 'temperature' },
] as const

const PRESETS_MIN = [1, 2, 3, 5, 10, 15, 30]

const formatHeure = (c: Constante) =>
  c.horodatage ? new Date(c.horodatage).toLocaleTimeString('fr-FR', { hour12: false }) : c.heure

// Surveillance périodique pendant l'opération : alarme locale au poste, configurable (défaut
// 5 min), démarrable/arrêtable — distincte des constantes elles-mêmes, qui sont, elles,
// synchronisées en temps réel à tous les postes connectés sur ce patient via le gateway.
export default function SurveillancePanel({ patientId, activiteId }: { patientId: string; activiteId: string | null }) {
  const [constantes, setConstantes] = useState<Constante[]>([])
  const [champs, setChamps] = useState({ fc: '', ta: '', spo2: '', capnie: '', score: '', temperature: '' })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const alarme = useSurveillanceAlarm(5)
  const { on } = useOperationRealtime(patientId)

  // Sans ce chargement initial, l'historique paraissait vide à chaque rechargement de page ou en
  // passant de l'écran per-opératoire à la salle de réveil (même activiteId réutilisé pour une
  // chronologie continue) — alors que des mesures existaient déjà en base pour ce patient.
  useEffect(() => {
    if (!activiteId) { setConstantes([]); return }
    let annule = false
    apiClient.get(`/activites-per-op/${activiteId}`)
      .then(({ data }) => { if (!annule) setConstantes(Array.isArray(data?.constantes) ? data.constantes : []) })
      .catch(console.error)
    return () => { annule = true }
  }, [activiteId])

  useEffect(() => on('constante:ajoutee', (payload: any) => {
    if (payload?.patientId !== patientId || !payload?.constante) return
    setConstantes(prev => (prev.some(c => c.id === payload.constante.id) ? prev : [...prev, payload.constante]))
  }), [on, patientId])

  const ajouterConstante = async () => {
    if (!activiteId) return
    setEnvoiEnCours(true)
    try {
      const { data } = await apiClient.post(`/activites-per-op/${activiteId}/constantes`, {
        fc: Number(champs.fc) || 0,
        ta: champs.ta || '0/0',
        spo2: Number(champs.spo2) || 0,
        temperature: Number(champs.temperature) || 0,
        capnie: Number(champs.capnie) || 0,
        score: Number(champs.score) || 0,
        horodatage: new Date().toISOString(),
      })
      setConstantes(prev => (prev.some(c => c.id === data.id) ? prev : [...prev, data]))
      setChamps({ fc: '', ta: '', spo2: '', capnie: '', score: '', temperature: '' })
      alarme.acquitter()
    } catch (err) {
      console.error(err)
    } finally {
      setEnvoiEnCours(false)
    }
  }

  return (
    <section id="constantes-form" className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
      <div className="bg-surface-container-low px-6 py-3 border-b border-surface-container-highest flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-xl">monitoring</span>
          <h3 className="font-headline font-bold text-on-surface uppercase tracking-wide text-sm">Surveillance des constantes</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant">Alerte toutes les</label>
          <select
            value={alarme.intervalMin}
            onChange={(e) => alarme.setIntervalMin(Number(e.target.value))}
            className="bg-white border border-outline-variant rounded-lg text-xs font-bold px-2 py-1"
          >
            {PRESETS_MIN.map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
          <button
            type="button"
            onClick={alarme.actif ? alarme.arreter : alarme.demarrer}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${alarme.actif ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'}`}
          >
            {alarme.actif ? 'Surveillance active' : 'Surveillance arrêtée'}
          </button>
        </div>
      </div>

      {alarme.sonne && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-bold text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined">notifications_active</span>
            Surveillance : ajoutez une nouvelle mesure de constantes.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => document.getElementById('constantes-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg"
            >
              Ajouter maintenant
            </button>
            <button type="button" onClick={alarme.acquitter} className="px-4 py-1.5 bg-white border border-red-300 text-red-700 text-xs font-bold rounded-lg">
              Silencer
            </button>
          </div>
        </div>
      )}

      {constantes.length > 0 && (
        <div className="px-6 pt-4">
          <p className="text-xs font-bold text-on-surface-variant mb-2">Mesures enregistrées ({constantes.length})</p>
          <div className="max-h-48 overflow-y-auto border border-outline-variant/20 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-surface-container-low sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">Heure</th>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">FC</th>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">TA</th>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">SPO2</th>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">Capnie</th>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">Score</th>
                  <th className="px-2 py-1.5 text-left font-bold text-on-surface-variant">Temp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {constantes.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/50">
                    <td className="px-2 py-1.5 font-mono">{formatHeure(c)}</td>
                    <td className="px-2 py-1.5">{c.fc}</td>
                    <td className="px-2 py-1.5">{c.ta}</td>
                    <td className="px-2 py-1.5">{c.spo2}</td>
                    <td className="px-2 py-1.5">{c.capnie}</td>
                    <td className="px-2 py-1.5">{c.score}</td>
                    <td className="px-2 py-1.5">{c.temperature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CHAMPS.map((champ) => (
            <div key={champ.key} className="space-y-1.5">
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase">{champ.label}</label>
              <input
                className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                placeholder="--"
                type="text"
                value={champs[champ.key]}
                onChange={(e) => setChamps({ ...champs, [champ.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={ajouterConstante}
            disabled={!activiteId || envoiEnCours}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            {envoiEnCours ? 'Enregistrement...' : 'Ajouter une surveillance'}
          </button>
        </div>
      </div>
    </section>
  )
}
