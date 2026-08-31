import axios from 'axios'
import { lireTokenStocke } from '@/lib/auth/central-session'
import { HOSPITALISATION_API_URL } from '@/lib/gateway'

// Port de front-clinique/src/services/api.ts. Base distincte de l'API de ce backend (Bloc
// opératoire, voir lib/api/client.ts) : cette instance parle au service hospitalisation
// (clinique), via la gateway (voir lib/gateway.ts).
export const hospitalisationApi = axios.create({
  baseURL: HOSPITALISATION_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

hospitalisationApi.interceptors.request.use(
  (config) => {
    const token = lireTokenStocke()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// Comme côté front-clinique : on déballe response.data pour que les appelants reçoivent
// directement le corps de la réponse.
hospitalisationApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Hospitalisation API Error:', error?.response?.data?.message || error.message)
    return Promise.reject(error)
  },
)
