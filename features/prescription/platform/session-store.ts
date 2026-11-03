/**
 * Moteur de session — SANS React, SANS next/navigation.
 *
 * Utilisable partout : composants client, hooks, modules API, et route handlers
 * côté serveur. C'est la source unique de décodage du JWT émis par le service
 * auth et de résolution du service clinique courant.
 *
 * ⚠️ Sécurise l'AFFICHAGE / le contexte, pas les données : la vraie
 * autorisation reste côté backend (JwtAuthGuard + PermissionsGuard).
 */

/* -------------------------------------------------------------------------- */
/*  Types du token (source de vérité : service auth)                          */
/* -------------------------------------------------------------------------- */

export interface TokenChu {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  responsable?: string;
  logo?: string;
  logoUrl?: string;
}

export interface TokenService {
  serviceId: string;
  serviceName: string;
  baseUrl: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  chu: TokenChu;
}

export interface SessionClaims {
  userId: string;
  name: string;
  firstname: string;
  email: string;
  services: TokenService[];
  iat: number;
  exp: number;
}

export interface ActiveSession {
  claims: SessionClaims;
  isExpired: boolean;
  services: TokenService[];

  /** serviceId demandé (URL côté client / query côté serveur). */
  requestedServiceId: string | null;
  /** Vrai si le serviceId demandé appartient bien au token. */
  isServiceAllowed: boolean;

  currentService: TokenService | null;
  serviceId: string | null;
  chuId: string | null;
  roleName: string | null;
  permissions: string[];
}

/* -------------------------------------------------------------------------- */
/*  Décodage JWT (base64url, compatible navigateur + Node/SSR)                */
/* -------------------------------------------------------------------------- */

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(padded);
    try {
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes); // gère les accents (UTF-8)
    } catch {
      return binary;
    }
  }

  // Node / SSR
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const data: unknown = JSON.parse(base64UrlDecode(payload));
    return data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isTokenService(value: unknown): value is TokenService {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.serviceId === "string" &&
    typeof s.serviceName === "string" &&
    typeof s.roleName === "string" &&
    Array.isArray(s.permissions) &&
    !!s.chu &&
    typeof (s.chu as Record<string, unknown>).id === "string"
  );
}

export function claimsFromToken(token: string): SessionClaims | null {
  const raw = decodeJwtPayload(token);
  if (!raw || typeof raw.userId !== "string") return null;

  const services = Array.isArray(raw.services)
    ? (raw.services.filter(isTokenService) as TokenService[])
    : [];

  return {
    userId: raw.userId,
    name: typeof raw.name === "string" ? raw.name : "",
    firstname: typeof raw.firstname === "string" ? raw.firstname : "",
    email: typeof raw.email === "string" ? raw.email : "",
    services,
    iat: typeof raw.iat === "number" ? raw.iat : 0,
    exp: typeof raw.exp === "number" ? raw.exp : 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Résolution du service courant                                             */
/* -------------------------------------------------------------------------- */

export function selectService(
  claims: SessionClaims,
  requestedServiceId?: string | null,
): TokenService | null {
  const services = claims.services;
  if (requestedServiceId) {
    return services.find((s) => s.serviceId === requestedServiceId) ?? null;
  }
  // Aucun serviceId demandé : choix implicite si un seul service.
  return services.length === 1 ? services[0] : null;
}

export function sessionFromToken(
  token: string,
  requestedServiceId?: string | null,
): ActiveSession | null {
  const claims = claimsFromToken(token);
  if (!claims) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired = Boolean(claims.exp && nowSeconds >= claims.exp);

  const currentService = selectService(claims, requestedServiceId);
  const isServiceAllowed = requestedServiceId
    ? claims.services.some((s) => s.serviceId === requestedServiceId)
    : claims.services.length <= 1;

  return {
    claims,
    isExpired,
    services: claims.services,
    requestedServiceId: requestedServiceId ?? null,
    isServiceAllowed,
    currentService,
    serviceId: currentService?.serviceId ?? null,
    chuId: currentService?.chu.id ?? null,
    roleName: currentService?.roleName ?? null,
    permissions: currentService?.permissions ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers CLIENT (garde sur window / localStorage)                          */
/* -------------------------------------------------------------------------- */

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      // Bloc opératoire : jeton du portail rangé par lib/auth/central-session.
      globalThis.localStorage?.getItem("centralAccessToken") ||
      globalThis.localStorage?.getItem("auth_token") ||
      globalThis.localStorage?.getItem("access_token") ||
      null
    );
  } catch {
    return null;
  }
}

/** Cle de persistance du service choisi (repli quand l'URL n'a pas ?serviceId=). */
const SELECTED_SERVICE_KEY = "selectedServiceId";

/** Memorise le service choisi (ex. au retour du portail auth avec ?serviceId=). */
export function setSelectedServiceId(serviceId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (serviceId && serviceId.trim()) {
      globalThis.localStorage?.setItem(SELECTED_SERVICE_KEY, serviceId.trim());
    }
  } catch {
    /* localStorage indisponible : on ignore. */
  }
}

/** Efface le service memorise (deconnexion ou changement de service). */
export function clearSelectedServiceId(): void {
  if (typeof window === "undefined") return;
  try {
    globalThis.localStorage?.removeItem(SELECTED_SERVICE_KEY);
  } catch {
    /* localStorage indisponible : on ignore. */
  }
}

/**
 * Lit le dernier service explicitement choisi et memorise (localStorage),
 * SANS tenir compte de l'URL. Repli utilise par les consommateurs (ex.
 * useSession / header) lors des navigations sans `?serviceId=`.
 */
export function getStoredSelectedServiceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = globalThis.localStorage?.getItem(SELECTED_SERVICE_KEY);
    return stored && stored.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

export function getRequestedServiceIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("serviceId");
  if (fromUrl && fromUrl.trim()) {
    // Un serviceId dans l'URL (retour du choix de service) fait autorite :
    // on le memorise pour les navigations suivantes (retour sur "/", reload...).
    setSelectedServiceId(fromUrl.trim());
    return fromUrl.trim();
  }
  // Repli : dernier service explicitement choisi et memorise.
  try {
    const stored = globalThis.localStorage?.getItem(SELECTED_SERVICE_KEY);
    return stored && stored.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

/** Session active côté client (token localStorage + serviceId de l'URL ou memorise). */
export function getActiveSession(): ActiveSession | null {
  const token = getStoredToken();
  if (!token) return null;

  let requestedServiceId = getRequestedServiceIdFromUrl();

  // Securite : si le service demande/memorise n'appartient pas (ou plus) au
  // token courant (autre compte, service retire...), on l'ignore et on purge
  // le repli pour ne pas rester bloque sur un mauvais contexte.
  if (requestedServiceId) {
    const claims = claimsFromToken(token);
    const belongs = !!claims?.services.some(
      (s) => s.serviceId === requestedServiceId,
    );
    if (!belongs) {
      requestedServiceId = null;
      clearSelectedServiceId();
    }
  }

  return sessionFromToken(token, requestedServiceId);
}

export function getActiveServiceId(): string {
  return getActiveSession()?.serviceId ?? "";
}

export function getActiveChuId(): string {
  return getActiveSession()?.chuId ?? "";
}

/** UUID de l'utilisateur connecte (issu du token). Sert d'auteur pour createdBy/updatedBy. */
export function getActiveUserId(): string {
  return getActiveSession()?.claims.userId ?? "";
}

/* -------------------------------------------------------------------------- */
/*  Helper SERVEUR (route handlers)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Construit la session à partir d'un header Authorization ("Bearer <jwt>").
 * À utiliser dans les route handlers, où il n'y a ni localStorage ni window.
 */
export function sessionFromAuthHeader(
  authorization: string | null | undefined,
  requestedServiceId?: string | null,
): ActiveSession | null {
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return sessionFromToken(token, requestedServiceId ?? null);
}

/**
 * Repli de resolution du CHU (cote serveur).
 *  - serviceId demande present dans le token  -> CHU de ce service.
 *  - sinon, si tous les services partagent le meme CHU -> ce CHU.
 *  - sinon (plusieurs CHU, aucun serviceId) -> null (impossible de trancher).
 *
 * Utile pour un compte MULTI-SERVICES : sans serviceId, selectService() renvoie
 * null (donc chuId null -> 400). Ici on recupere quand meme le CHU tant qu'il
 * n'y a pas d'ambiguite.
 */
export function chuIdFromClaimsFallback(
  claims: SessionClaims,
  requestedServiceId?: string | null,
): string | null {
  if (requestedServiceId) {
    const svc = claims.services.find(
      (s) => s.serviceId === requestedServiceId,
    );
    if (svc) return svc.chu.id;
  }
  const chuIds = Array.from(
    new Set(claims.services.map((s) => s.chu.id).filter(Boolean)),
  );
  return chuIds.length === 1 ? chuIds[0] : null;
}

/**
 * Resout le chuId a partir d'un header Authorization, avec repli.
 * A utiliser dans les route handlers du dashboard pour eviter un 400 lorsque le
 * client (multi-services) n'a pas transmis le serviceId.
 */
export function resolveChuIdFromAuthHeader(
  authorization: string | null | undefined,
  requestedServiceId?: string | null,
): string | null {
  const session = sessionFromAuthHeader(authorization, requestedServiceId);
  if (session?.chuId) return session.chuId;
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const claims = claimsFromToken(token);
  return claims ? chuIdFromClaimsFallback(claims, requestedServiceId) : null;
}
