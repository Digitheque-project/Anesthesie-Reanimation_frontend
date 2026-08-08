import { apiClient } from './client';

export const salleReveilService = {
  // Patients actuellement en salle de réveil (PatientBloc.statut), pas les sorties déjà
  // validées — dès que le statut passe à SORTI, ils disparaissent naturellement de cette liste.
  getPatientsEnReveil: async () => {
    const { data } = await apiClient.get('/patients', { params: { statut: 'EN_SALLE_REVEIL', limite: 100 } });
    return data?.data ?? [];
  },

  getPatientSuivi: async (id: string) => {
    const { data } = await apiClient.get(`/sorties-reveil/${id}`);
    return data;
  },

  enregistrerScore: async (payload: any) => {
    const { data } = await apiClient.post('/scores-sccre', payload);
    return data;
  },

  validerSortie: async (payload: any) => {
    const { data } = await apiClient.post('/sorties-reveil', payload);
    return data;
  },
};
