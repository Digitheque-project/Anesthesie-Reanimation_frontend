import { lireTokenStocke, obtenirSessionValide } from '@/lib/auth/central-session'

// Alias de lireTokenStocke(), pour les fichiers portés de front-clinique qui appellent
// getStoredToken() directement (ex. features/prescription/lib/auth.ts).
export function getStoredToken(): string | null {
  return lireTokenStocke()
}

// Équivalent de getActiveUserId() (session-store.ts de front-clinique).
export function getActiveUserId(): string | undefined {
  return obtenirSessionValide()?.payload.userId
}
