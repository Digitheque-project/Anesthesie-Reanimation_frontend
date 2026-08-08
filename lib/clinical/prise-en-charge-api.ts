import axios from 'axios'
import { lireTokenStocke } from '@/lib/auth/central-session'

// Port de front-clinique/src/lib/api/instances/prise-en-charge.ts.
export interface PriseEnChargeInfo {
  priseEnChargeId: string
  companyName?: string | null
  nif?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  isActive?: boolean
  chuId?: string | null
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

function priseEnChargeBaseUrl(): string {
  return process.env.NEXT_PUBLIC_PRISE_EN_CHARGE_API_URL?.replace(/\/+$/, '') || ''
}

export async function fetchPriseEnChargeById(priseEnChargeId: string): Promise<PriseEnChargeInfo | null> {
  const cleanId = priseEnChargeId.trim()
  const base = priseEnChargeBaseUrl()
  if (!cleanId || !base) return null

  try {
    const token = lireTokenStocke()
    const response = await axios.get<PriseEnChargeInfo>(
      `${base}/${encodeURIComponent(cleanId)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    return response.data ?? null
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    // 404 = prise en charge absente du référentiel : cas normal, on renvoie null sans bruit.
    if (status !== 404) {
      console.error(`Failed to fetch prise en charge ${cleanId}:`, error)
    }
    return null
  }
}
