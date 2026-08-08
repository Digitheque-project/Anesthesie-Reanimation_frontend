/**
 * Adaptateur d'auth pour la suite Prescription portée depuis front-clinique.
 * Redirige getStoredToken/parseJwt/authFetch vers la session centrale de
 * blocope-front (lib/auth/central-session.ts), pour porter les composants
 * sans les modifier.
 */
import { getStoredToken as _getStoredToken } from "@/lib/clinical-auth/token";
import { decoderToken } from "@/lib/auth/central-session";

export const getStoredToken = _getStoredToken;

export function parseJwt(token: string): Record<string, unknown> | null {
  return decoderToken(token) as Record<string, unknown> | null;
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, headers });
}
