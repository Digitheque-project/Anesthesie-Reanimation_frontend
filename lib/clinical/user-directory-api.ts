import axios from 'axios'

// Port de front-clinique/src/lib/clinical/user-directory-api.ts.
// Résout le nom (Nom Prénom) et le job d'un utilisateur à partir de son id, via le proxy
// même-origine /api/users/:id (voir app/api/users/[id]/route.ts) — pas de CORS.
export interface DirectoryUser {
  id: string
  name: string
  firstname?: string
  job?: string
}

const userDirectoryApi = axios.create({
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  baseURL: '/api/users',
})

userDirectoryApi.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem('centralAccessToken') : null
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

/** Récupère un utilisateur par son id. Renvoie null en cas d'erreur / absence. */
export async function getDirectoryUser(id: string): Promise<DirectoryUser | null> {
  if (!id) return null
  try {
    const res = await userDirectoryApi.get(`/${encodeURIComponent(id)}`)
    const u = res.data as Record<string, unknown> | null
    if (!u || typeof u !== 'object') return null
    return {
      id: typeof u.id === 'string' ? u.id : id,
      name: typeof u.name === 'string' ? u.name : '',
      firstname: typeof u.firstname === 'string' ? u.firstname : '',
      job: typeof u.job === 'string' ? u.job : '',
    }
  } catch {
    return null
  }
}

/** Formate un utilisateur en « Nom Prénom » (ordre nom puis prénom). */
export function formatDirectoryUserName(user: { name?: string; firstname?: string } | null | undefined): string {
  if (!user) return ''
  return [user.name, user.firstname].filter(Boolean).join(' ').trim()
}
