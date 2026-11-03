"use client";

/**
 * Adaptateur AuthContext pour la suite Prescription embarquee.
 *
 * Le prescription_front standalone exposait useAuth() via un AuthProvider.
 * Dans front-clinique, l'identite vient du session-store clinique. On fournit
 * donc un useAuth() sans provider qui derive `user` de la session active, afin
 * que les composants portes (ex. DiaryseForm) fonctionnent tels quels.
 */
import React, { createContext } from "react";
import { getActiveSession } from "@/features/prescription/platform/session-store";

export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  service: string;
  poste: string;
  services: unknown[];
  [key: string]: unknown;
}

export function useAuth(): { user: AuthUser | null; logout: () => void; isLoading: boolean } {
  const session = getActiveSession();
  const claims = session?.claims;
  const user: AuthUser | null = claims
    ? {
        id: claims.userId,
        email: claims.email,
        nom: claims.name,
        prenom: claims.firstname,
        service: session?.currentService?.serviceName ?? "",
        poste: session?.currentService?.roleName ?? "",
        services: session?.services ?? [],
      }
    : null;
  return { user, logout: () => {}, isLoading: false };
}

export const AuthContext = createContext<{ user: AuthUser | null } | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
