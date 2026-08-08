import { apiClient } from './client';
export const cpaService = {
  async getAll(p?: number, l?: number) { const { data } = await apiClient.get('/cpa', { params: { page: p, limite: l } }); return data; },
};
