import { apiClient } from './client'

// Même principe que notification.service.ts : plus aucun repli sur des chiffres inventés.
// En cas de panne de l'API, cette fonction renvoyait des statistiques fictives (42 patients,
// 156 opérations, 8 urgences...) affichées telles quelles sur le tableau de bord du bloc, sans
// rien qui les distingue de vrais chiffres. L'appelant (app/bloc/page.tsx) utilise
// `Promise.allSettled` et conserve son état initial à zéro si l'appel échoue : l'absence de
// données se voit, au lieu d'être maquillée.
export const rapportsService = {
  getStatistiques: async (dateDebut?: string, dateFin?: string) => {
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
