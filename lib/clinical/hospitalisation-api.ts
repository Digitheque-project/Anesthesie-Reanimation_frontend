import axios from 'axios'
import { lireTokenStocke } from '@/lib/auth/central-session'

// Port de front-clinique/src/services/api.ts. Base distincte de NEXT_PUBLIC_API_URL (déjà
// utilisée par blocope-front pour son propre backend) : cette instance parle au service
// hospitalisation de front-clinique.
export const hospitalisationApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_HOSPITALISATION_API_URL,
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
