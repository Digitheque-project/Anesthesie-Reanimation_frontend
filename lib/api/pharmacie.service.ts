import { apiClient } from './client'

export type ArticlePharmacie = {
  id: string
  dci: string
  dosage: string
  conditionnement: string
  sale_price: number
  stock_total: number
  stock_minimum: number
  stock_safety: number
}

export const pharmacieService = {
  getPrix: async (): Promise<ArticlePharmacie[]> => {
    try {
      const { data } = await apiClient.get('/pharmacie/prix')
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },
}
