import { apiClient } from './client'

const MOCK_STATS = {
  totalPatients: 42,
  totalOperations: 156,
  totalUrgences: 8,
  totalMedecins: 12,
  enAttente: 5,
  aujourdhui: 8
}

export const rapportsService = {
  getStatistiques: async (dateDebut?: string, dateFin?: string) => {
    try {
      const { data } = await apiClient.get('/rapports/statistiques', { params: { dateDebut, dateFin } })
      return data
    } catch (error) {
      console.warn('⚠️ API indisponible - utilisation des stats simulées')
      return MOCK_STATS
    }
  },

  getTableauDeBord: async (dateDebut?: string, dateFin?: string) => {
    const { data } = await apiClient.get('/rapports/tableau-de-bord', { params: { dateDebut, dateFin } })
    return data
  },

  getAlertes: async () => {
    try {
      const { data } = await apiClient.get('/alertes')
      return data
    } catch (error) {
      return []
    }
  },

  getRapports: async (params?: any) => {
    try {
      const { data } = await apiClient.get('/rapports', { params })
      return data
    } catch (error) {
      return { data: [], total: 0 }
    }
  }
}
