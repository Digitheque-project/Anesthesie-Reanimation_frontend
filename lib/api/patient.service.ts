import { apiClient } from './client';

const cleanPatientId = (id: string) => encodeURIComponent(id.trim().replace(/^#/, ''));

const isAxiosError = (error: unknown): error is { response?: { status?: number } } => {
  return typeof error === 'object' && error !== null && 'response' in error;
};

export const patientService = {
  async getAll(f?: any) {
    const { data } = await apiClient.get('/patients', { params: f });
    return data;
  },

  async getById(id: string) {
    const normalizedId = cleanPatientId(id);
    try {
      const { data } = await apiClient.get(`/patients/${normalizedId}`);
      return data;
    } catch (error: unknown) {
      if (isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) {
        const searchTerm = id.trim().replace(/^#/, '');
        const { data } = await apiClient.get('/patients', { params: { recherche: searchTerm, limite: 1 } });
        if (Array.isArray(data?.data) && data.data.length > 0) return data.data[0];
      }
      throw error;
    }
  },

  async marquerApteCpa(id: string) {
    const { data } = await apiClient.patch(`/patients/${cleanPatientId(id)}/apte-cpa`);
    return data;
  },

  async marquerInapteCpa(id: string, motifRefus: string) {
    const { data } = await apiClient.patch(`/patients/${cleanPatientId(id)}/inapte-cpa`, { motifRefus });
    return data;
  },

  async modifierDateIntervention(id: string, dateIntervention: string) {
    const { data } = await apiClient.patch(`/patients/${cleanPatientId(id)}/date-intervention`, { dateIntervention });
    return data;
  },

  async getDossierMedical(id: string) {
    const { data } = await apiClient.get(`/patients/${cleanPatientId(id)}/dossier-medical`);
    return data;
  },

  async getDossierComplet(id: string) {
    const { data } = await apiClient.get(`/patients/${cleanPatientId(id)}/dossier-complet`);
    return data;
  },
};
