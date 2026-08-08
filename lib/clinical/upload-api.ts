import axios from 'axios'

// Client HTTP pour le service externe générique de stockage de fichiers ("CHU Upload API" —
// POST/GET/PUT/DELETE /files/{filename}). Défini NEXT_PUBLIC_UPLOAD_API_URL pour l'activer.
// Le service ne connaît ni patient ni CHU : c'est à l'appelant d'associer chaque nom de fichier
// retourné à l'enregistrement concerné (ex. CPA.piecesJointes) et de conserver ce nom.

function resolveUploadApiBase(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_UPLOAD_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return null
}

export function isUploadApiConfigured(): boolean {
  return resolveUploadApiBase() != null
}

function tokenAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem('centralAccessToken') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// La réponse de POST /files n'est pas documentée dans le Swagger du service (juste "201, pas de
// schéma") — on tente les noms de champ les plus probables plutôt que d'en imposer un seul, avec
// message d'erreur explicite si aucun ne correspond (plus facile à corriger que d'échouer en
// silence).
function extraireNomFichier(data: any): string {
  if (typeof data === 'string') return data
  const nom = data?.filename ?? data?.fileName ?? data?.key ?? data?.name ?? data?.id
  if (!nom) {
    throw new Error(
      `Réponse inattendue du service Upload (champ nom de fichier introuvable) : ${JSON.stringify(data)}`,
    )
  }
  return nom
}

export async function envoyerFichier(fichier: File): Promise<{ nomFichier: string }> {
  const base = resolveUploadApiBase()
  if (!base) throw Object.assign(new Error('NEXT_PUBLIC_UPLOAD_API_URL non défini'), { code: 'NO_UPLOAD_API' })
  const formData = new FormData()
  formData.append('file', fichier)
  const { data } = await axios.post(`${base}/files`, formData, {
    headers: { ...tokenAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  })
  return { nomFichier: extraireNomFichier(data) }
}

// GET /files/{filename} exige un utilisateur connecté (Bearer) : on ne peut donc pas l'utiliser
// directement en src= d'un <img>/<a> (pas d'en-tête possible) — on récupère le blob nous-mêmes
// et l'appelant en fait une URL locale (URL.createObjectURL) pour affichage/téléchargement.
export async function recupererFichier(nomFichier: string): Promise<Blob> {
  const base = resolveUploadApiBase()
  if (!base) throw Object.assign(new Error('NEXT_PUBLIC_UPLOAD_API_URL non défini'), { code: 'NO_UPLOAD_API' })
  const { data } = await axios.get(`${base}/files/${encodeURIComponent(nomFichier)}`, {
    headers: tokenAuthHeaders(),
    responseType: 'blob',
    timeout: 30_000,
  })
  return data
}

export async function supprimerFichier(nomFichier: string): Promise<void> {
  const base = resolveUploadApiBase()
  if (!base) throw Object.assign(new Error('NEXT_PUBLIC_UPLOAD_API_URL non défini'), { code: 'NO_UPLOAD_API' })
  await axios.delete(`${base}/files/${encodeURIComponent(nomFichier)}`, { headers: tokenAuthHeaders(), timeout: 30_000 })
}
