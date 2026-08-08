// Miroir de backend_bloc_operatoire/src/central-auth/role-clinique.ts — les 5 rôles cliniques
// du bloc opératoire, résolus depuis le roleName du token SSO par correspondance de mot-clé
// (le libellé exact est saisi librement dans l'admin du SSO central, on ne le maîtrise pas).

export enum RoleClinique {
  RESPONSABLE_CPA = 'RESPONSABLE_CPA',
  ANESTHESISTE = 'ANESTHESISTE',
  CHIRURGIEN = 'CHIRURGIEN',
  IBODE = 'IBODE',
  MAJOR = 'MAJOR',
}

const DIACRITIQUES = new RegExp('[\\u0300-\\u036f]', 'g')

export function matchRoleClinique(roleName: string | undefined | null): RoleClinique | null {
  if (!roleName) return null
  const normalise = roleName.normalize('NFD').replace(DIACRITIQUES, '').toLowerCase()

  if (normalise.includes('responsable') && normalise.includes('cpa')) return RoleClinique.RESPONSABLE_CPA
  if (normalise.includes('anesthesist')) return RoleClinique.ANESTHESISTE
  if (normalise.includes('chirurgien')) return RoleClinique.CHIRURGIEN
  if (normalise.includes('ibode')) return RoleClinique.IBODE
  if (normalise.includes('major')) return RoleClinique.MAJOR
  return null
}
