import { apiClient } from './client'

export const planningService = {
  reserverCreneau: async (dto: {
    patientId: string;
    chirurgienId?: string;
    date: string;
    heureDebut: string;
    heureFin: string;
    salle?: string;
    estUrgence?: boolean;
    type?: 'CPA' | 'VERIFICATION_VEILLE';
    responsable?: string;
  }) => {
    const { data } = await apiClient.post('/planning/reserver', dto)
    return data
  },

  getJour: async (date: string, type?: 'CPA' | 'VERIFICATION_VEILLE') => {
    const { data } = await apiClient.get('/planning/jour', { params: { date, type } })
    return data
  },

  getPlanningJour: async (date: string, type?: 'CPA' | 'VERIFICATION_VEILLE') => {
    const { data } = await apiClient.get('/planning/jour', { params: { date, type } })
    return data
  },

  annuler: async (id: string) => {
    const { data } = await apiClient.delete(`/planning/${id}`)
    return data
  },

  getCpaAVenir: async () => {
    const { data } = await apiClient.get('/planning/cpa-a-venir')
    return data
  },

  getPlanningSemaine: async (debut: string, fin: string, type?: 'CPA' | 'VERIFICATION_VEILLE') => {
    const { data } = await apiClient.get('/planning/semaine', { params: { debut, fin, type } })
    return data
  },
}
