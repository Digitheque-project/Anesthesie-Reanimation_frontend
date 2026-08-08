// Session SSO centrale : le token est émis par le service d'authentification central
// (auth-service) au login sur https://auth-client-dun.vercel.app/login, qui redirige
// ensuite vers notre baseUrl avec ?accessToken=... . On ne fait ici que décoder/stocker ce
// token — la vérification de signature a lieu côté backend (CentralAuthGuard).

const STORAGE_KEY = 'centralAccessToken'
const SERVICE_ID = process.env.NEXT_PUBLIC_SERVICE_ID || ''

export interface ServiceAcces {
  serviceId: string
  serviceName: string
  baseUrl: string
  roleId: string
  roleName: string
  permissions: string[]
  chu: {
    id: string
    name: string
    address?: string
    phone?: string
    email?: string
    responsable?: string
    logoUrl?: string
  }
}

export interface CentralTokenPayload {
  userId: string
  name: string
  firstname: string
  email: string
  services: ServiceAcces[]
  iat: number
  exp: number
}

export function decoderToken(token: string): CentralTokenPayload | null {
  try {
    const [, payloadB64] = token.split('.')
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return null
  }
}

export function estExpire(payload: CentralTokenPayload): boolean {
  return !payload.exp || Date.now() >= payload.exp * 1000
}

export function trouverAccesService(payload: CentralTokenPayload): ServiceAcces | null {
  return payload.services?.find(s => s.serviceId === SERVICE_ID) || null
}

export function lireTokenStocke(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function stockerToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, token)
}

export function effacerSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

// Renvoie la session valide (token + payload + accès à notre service) si elle existe,
// null sinon — sans effet de bord (ne redirige pas, ne modifie pas le storage).
export function obtenirSessionValide(): { token: string; payload: CentralTokenPayload; acces: ServiceAcces } | null {
  const token = lireTokenStocke()
  if (!token) return null
  const payload = decoderToken(token)
  if (!payload || estExpire(payload)) return null
  const acces = trouverAccesService(payload)
  if (!acces) return null
  return { token, payload, acces }
}

export function redirigerVersLogin() {
  if (typeof window === 'undefined') return
  const loginUrl = process.env.NEXT_PUBLIC_CENTRAL_LOGIN_URL
  if (!loginUrl) {
    console.error('NEXT_PUBLIC_CENTRAL_LOGIN_URL non configuré — impossible de rediriger vers la connexion')
    return
  }
  window.location.href = loginUrl
}
