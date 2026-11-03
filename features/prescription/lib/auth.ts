/**
 * Adaptateur d'auth pour la suite Prescription embarquee.
 *
 * Le prescription_front standalone lisait le JWT sous la cle "prescription_jwt"
 * via son propre "@/lib/auth". Dans front-clinique, la source unique du token
 * est le session-store clinique (localStorage "auth_token" / "access_token").
 * Ce shim redirige donc authFetch / getStoredToken / parseJwt vers lui, ce qui
 * permet de porter les composants du prescription_front sans les modifier.
 */
import { getStoredToken as _getStoredToken, decodeJwtPayload } from "@/features/prescription/platform/session-store";

export const getStoredToken = _getStoredToken;

export function parseJwt(token: string): Record<string, unknown> | null {
  return decodeJwtPayload(token);
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, headers });
}
