import { apiClient } from './client'

// Aucune donnée simulée ici — voir plus bas.
//
// Ce fichier repliait auparavant sur trois patients fictifs (« Dupont Jean », « Martin Sophie »,
// « Bernard Pierre ») dès que l'appel à /notifications-cpa échouait, ne serait-ce que par
// dépassement du délai. C'est la raison de leur réapparition dans la cloche et dans le fil de
// prescription : ils n'ont jamais existé en base, ils étaient fabriqués par le frontend à chaque
// fois que le backend était lent ou indisponible.
//
// Dans un logiciel de bloc opératoire, c'est inacceptable : rien ne distinguait à l'écran ces
// patients inventés de vrais patients à opérer, et l'un d'eux était même marqué urgent
// (« Martin Sophie », urgence 3), donc susceptible d'être orienté vers une VPA immédiate. Une
// panne doit se voir comme une panne — jamais se déguiser en données cliniques.
export const notificationService = {
  getAll: async (page = 1, limit = 100) => {
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

  // Le repli « simulation » qui renvoyait { success: true, id: 'vpa-simule-…' } est retiré :
  // il faisait croire à l'utilisateur qu'une vérification pré-anesthésique avait été créée alors
  // qu'aucune n'était enregistrée. L'échec doit remonter à l'appelant.
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
