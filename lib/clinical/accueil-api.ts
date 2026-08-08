import { obtenirSessionValide } from '@/lib/auth/central-session'

// Port de front-clinique/src/lib/api/instances/accueil.ts.
export interface PatientInfoAccueil {
  id: string
  nom: string
  prenom: string
  dateNaissance: string
  sexe: string
  adresse?: string
  telephone?: string
  email?: string
  [key: string]: unknown
}

export const accueilApiService = {
  /**
   * Récupère un patient auprès du back "accueil", via la route Next même-origine
   * /api/accueil/patients/:id (relais serveur-à-serveur, pas de CORS côté navigateur).
   */
  getPatientById: async (patientId: string, chuId?: string): Promise<PatientInfoAccueil | null> => {
    const resolvedChuId = chuId || obtenirSessionValide()?.acces.chu?.id
    if (!resolvedChuId) {
      console.warn('getPatientById: chuId is missing')
      return null
    }

    try {
      const token = obtenirSessionValide()?.token
      const response = await fetch(
        `/api/accueil/patients/${encodeURIComponent(patientId)}?chuId=${encodeURIComponent(resolvedChuId)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )

      if (!response.ok) {
        console.error(`Failed to fetch patient ${patientId}: HTTP ${response.status}`)
        return null
      }

      return (await response.json()) as PatientInfoAccueil
    } catch (error) {
      console.error(`Failed to fetch patient ${patientId}:`, error)
      return null
    }
  },
}
