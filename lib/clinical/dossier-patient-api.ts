import axios from 'axios'

// Port de front-clinique/src/lib/clinical/dossier-patient-api.ts.
// Client HTTP pour l'API « dossier patient » (observations, diagnostics, suivi,
// CR opératoire, résultats, sortie, historique). Définir
// NEXT_PUBLIC_DOSSIER_PATIENT_API_URL pour l'activer.

function resolveDossierApiBase(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_DOSSIER_PATIENT_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return null
}

export function isDossierPatientApiConfigured(): boolean {
  return resolveDossierApiBase() != null
}

export const dossierPatientApi = axios.create({
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

dossierPatientApi.interceptors.request.use((config) => {
  const base = resolveDossierApiBase()
  if (!base) {
    return Promise.reject(
      Object.assign(new Error('NEXT_PUBLIC_DOSSIER_PATIENT_API_URL non défini'), {
        code: 'NO_DOSSIER_API',
      }),
    )
  }
  config.baseURL = base

  // Attache le JWT central (le backend en déduit chuId / serviceId / createdBy).
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem('centralAccessToken') : null
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }

  return config
})

export const sortieMedicaleApi = {
  upsert: (data: unknown) => dossierPatientApi.post('/sorties-medicales', data),
  getByEpisode: (episodeId: string, chuId?: string, serviceId?: string) =>
    dossierPatientApi.get(`/sorties-medicales/episode/${episodeId}`, { params: { chuId, serviceId } }),
  validate: (id: string, data: unknown) => dossierPatientApi.patch(`/sorties-medicales/${id}/validate`, data),
}
