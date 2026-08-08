import { apiClient } from './client';
export const medecinService = {
  async getAll(f?: any) { const { data } = await apiClient.get('/medecins', { params: f }); return data; },
};
