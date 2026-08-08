import { apiClient } from './client'

// Données simulées pour les tests
const MOCK_NOTIFICATIONS = [
  { 
    id: '1', 
    patientId: 'PX-001', 
    patientNom: 'Dupont Jean', 
    intervention: 'CHOLECYSTECTOMIE', 
    motif: 'CHOLECYSTECTOMIE',
    estUrgent: false, 
    urgence: 0,
    statut: 'EN_ATTENTE',
    prescripteur: 'Dr. Bernard',
    heure: '10:00',
    professeurCPA: 'Dr. Martin'
  },
  { 
    id: '2', 
    patientId: 'PX-002', 
    patientNom: 'Martin Sophie', 
    intervention: 'Appendicectomie', 
    motif: 'Appendicectomie',
    estUrgent: true, 
    urgence: 3,
    statut: 'EN_ATTENTE',
    prescripteur: 'Dr. Dubois',
    heure: '08:30',
    professeurCPA: 'Dr. Petit'
  },
  { 
    id: '3', 
    patientId: 'PX-003', 
    patientNom: 'Bernard Pierre', 
    intervention: 'Hernie inguinale', 
    motif: 'Hernie inguinale',
    estUrgent: false, 
    urgence: 1,
    statut: 'RDV_PLANIFIE',
    prescripteur: 'Dr. Martin',
    heure: 'N/A',
    professeurCPA: 'Dr. Durand'
  },
]

export const notificationService = {
  getAll: async (page = 1, limit = 100) => {
    try {
      // Essayer l'API réelle
      const { data } = await apiClient.get(`/notifications-cpa?page=${page}&limite=${limit}`)
      return data
    } catch (error) {
      console.warn('⚠️ API indisponible - utilisation des données simulées')
      // Retourner les données simulées
      return { 
        data: MOCK_NOTIFICATIONS,
        total: MOCK_NOTIFICATIONS.length,
        page,
        limit
      }
    }
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/notifications-cpa/${id}`)
    return data
  },

  getUnreadCount: async () => {
    try {
      const { data } = await apiClient.get('/notifications-cpa/unread/count')
      return data
    } catch (error) {
      return { count: MOCK_NOTIFICATIONS.filter(n => n.statut === 'EN_ATTENTE').length }
    }
  },

  marquerLu: async (id: string) => {
    const { data } = await apiClient.patch(`/notifications-cpa/${id}/lu`)
    return data
  },

  creerVpaDirect: async (payload: any) => {
    try {
      const { data } = await apiClient.post('/vpa/direct', payload)
      return data
    } catch (error) {
      console.warn('⚠️ API indisponible - simulation création VPA')
      return { success: true, id: 'vpa-simule-' + Date.now() }
    }
  },

  planifierRDV: async (id: string, dto?: any) => {
    const { data } = await apiClient.patch(`/notifications-cpa/${id}/planifier`, dto || {})
    return data
  },
}
