// Passerelle unique du CHU : toutes les API appelées par ce front (clinique,
// prescriptions, accueil, users, services, dossier-patient, stomato, ORL,
// bloc, notifications...) passent par elle ; seul le préfixe de route change
// et il est ajouté par chaque appelant. Une seule variable à changer pour
// déplacer la plateforme (Render, serveur de l'hôpital...) — aucune valeur
// par défaut dans le code.
//
// NEXT_PUBLIC_* est inliné au build : la variable doit être fournie comme
// argument de build (voir Dockerfile).
export const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/**
 * Adresse complète d'un préfixe de la passerelle, ex. gatewayUrl("/clinique").
 * Chaîne vide si la passerelle n'est pas configurée, pour que les appelants
 * détectent la configuration manquante au lieu d'appeler une URL relative.
 */
export function gatewayUrl(prefix = ""): string {
  return GATEWAY_URL ? `${GATEWAY_URL}${prefix}` : "";
}
