import { apiClient } from './client'

export const rapportsService = {
  getStatistiques: async (dateDebut?: string, dateFin?: string) => {
    // Pas de repli sur des statistiques simulées : des compteurs inventés induisent en erreur.
    const { data } = await apiClient.get('/rapports/statistiques', { params: { dateDebut, dateFin } })
    return data
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
