import { apiClient } from './client'

export const notificationService = {
  getAll: async (page = 1, limit = 100) => {
    // Pas de repli sur des données simulées : afficher de faux patients ("fantômes") est pire
    // que d'afficher une liste vide. L'erreur remonte à l'appelant qui gère l'état de chargement.
    const { data } = await apiClient.get(`/notifications-cpa?page=${page}&limite=${limit}`)
    return data
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/notifications-cpa/${id}`)
    return data
  },

  getUnreadCount: async () => {
    const { data } = await apiClient.get('/notifications-cpa/unread/count')
    return data
  },

  marquerLu: async (id: string) => {
    const { data } = await apiClient.patch(`/notifications-cpa/${id}/lu`)
    return data
  },

  creerVpaDirect: async (payload: any) => {
    // Pas de simulation : la création doit passer par l'API réelle, sinon on crée des VPA
    // "fantômes" qui n'existent pas côté serveur.
    const { data } = await apiClient.post('/vpa/direct', payload)
    return data
  },

  planifierRDV: async (id: string, dto?: any) => {
    const { data } = await apiClient.patch(`/notifications-cpa/${id}/planifier`, dto || {})
    return data
  },
}
