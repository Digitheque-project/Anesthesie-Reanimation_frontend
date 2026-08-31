import axios from 'axios'
import { lireTokenStocke } from '@/lib/auth/central-session'
import { SERVICE_CHU_API_BASE_URL } from '@/lib/gateway'

// Port de front-clinique/src/lib/services/service-chu-api.ts.
// Client HTTP pour le registre des services du CHU, via la gateway (voir lib/gateway.ts).
// Corrigé le 31/08/2026 : pointait vers une page Swagger (/chu/api/docs) au lieu d'une vraie
// donnée — cette route ne renvoyait donc jamais une vraie liste de services.
export type ServiceChu = {
  id: string
  name: string
  baseUrl?: string
  isActive: boolean
  chuId: string
}

function resolveServiceApiBase(): string {
  return SERVICE_CHU_API_BASE_URL
}

export const serviceChuApi = axios.create({
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

serviceChuApi.interceptors.request.use((config) => {
  config.baseURL = resolveServiceApiBase()
  const token = lireTokenStocke()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

/** Liste les services, filtrable par CHU. Renvoie toujours un tableau. */
export async function listServices(chuId?: string): Promise<ServiceChu[]> {
  if (!resolveServiceApiBase()) return []
  const response = await serviceChuApi.get<ServiceChu[]>('', { params: chuId ? { chuId } : {} })
  return Array.isArray(response.data) ? response.data : []
}
