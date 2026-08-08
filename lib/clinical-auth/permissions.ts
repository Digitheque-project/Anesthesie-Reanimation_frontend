// Catalogue de permissions & helpers d'autorisation d'AFFICHAGE, porté de
// front-clinique/src/lib/auth/permissions.ts. Les codes reflètent ceux utilisés par les
// back-ends (dossier-patient + hospitalisation) via leurs décorateurs @Permissions('…') —
// la vraie autorisation reste côté back, ici on ne pilote que l'affichage.
//
// INTERFACE_GATES / isInterfaceAccessible / ServiceCode de la version front-clinique ne sont
// pas repris : ce mécanisme gère un menu multi-services (chirurgie/pédiatrie/…) qui n'existe
// pas dans blocope-front (service unique, bloc opératoire).

export const PERMISSIONS = {
  physicalExamination: {
    read: 'physical-examination:read',
    create: 'physical-examination:create',
    update: 'physical-examination:update',
    delete: 'physical-examination:delete',
  },
  antecedent: {
    read: 'antecedent:read',
    create: 'antecedent:create',
    update: 'antecedent:update',
    delete: 'antecedent:delete',
  },
  medicalHistory: {
    read: 'medical-history:read',
    create: 'medical-history:create',
    update: 'medical-history:update',
    delete: 'medical-history:delete',
  },
  observation: {
    read: 'observation:read',
    create: 'observation:create',
    update: 'observation:update',
    delete: 'observation:delete',
  },
  complementaryExamination: {
    read: 'complementary-examination:read',
    create: 'complementary-examination:create',
    update: 'complementary-examination:update',
    delete: 'complementary-examination:delete',
  },
  diagnostic: {
    read: 'diagnostic:read',
    create: 'diagnostic:create',
    update: 'diagnostic:update',
  },
  suivi: {
    read: 'suivi:read',
    create: 'suivi:create',
  },
  sortieMedicale: {
    read: 'sortie-medicale:read',
    create: 'sortie-medicale:create',
    update: 'sortie-medicale:update',
  },
  hospitalisation: {
    read: 'hospitalisation:read',
    create: 'hospitalisation:create',
    update: 'hospitalisation:update',
    close: 'hospitalisation:close',
  },
  prescription: {
    read: 'prescription:read',
    create: 'prescription:create',
    update: 'prescription:update',
    delete: 'prescription:delete',
  },
} as const;

export const ACTION_GATES = {
  observation: {
    create: [PERMISSIONS.observation.create],
    update: [PERMISSIONS.observation.update],
    delete: [PERMISSIONS.observation.delete],
  },
  diagnostic: {
    create: [PERMISSIONS.diagnostic.create],
    update: [PERMISSIONS.diagnostic.update],
  },
  complementaryExamination: {
    create: [PERMISSIONS.complementaryExamination.create],
    update: [PERMISSIONS.complementaryExamination.update],
    delete: [PERMISSIONS.complementaryExamination.delete],
  },
  antecedent: {
    create: [PERMISSIONS.antecedent.create],
    update: [PERMISSIONS.antecedent.update],
    delete: [PERMISSIONS.antecedent.delete],
  },
  medicalHistory: {
    create: [PERMISSIONS.medicalHistory.create],
    update: [PERMISSIONS.medicalHistory.update],
    delete: [PERMISSIONS.medicalHistory.delete],
  },
  physicalExamination: {
    create: [PERMISSIONS.physicalExamination.create],
    update: [PERMISSIONS.physicalExamination.update],
    delete: [PERMISSIONS.physicalExamination.delete],
  },
  suivi: {
    create: [PERMISSIONS.suivi.create],
  },
  sortieMedicale: {
    create: [PERMISSIONS.sortieMedicale.create],
    update: [PERMISSIONS.sortieMedicale.update],
  },
  hospitalisation: {
    create: [PERMISSIONS.hospitalisation.create],
    update: [PERMISSIONS.hospitalisation.update],
    close: [PERMISSIONS.hospitalisation.close],
  },
  prescription: {
    create: [PERMISSIONS.prescription.create],
    update: [PERMISSIONS.prescription.update],
    delete: [PERMISSIONS.prescription.delete],
  },
} as const;

/** Vérifie une permission dans une liste (mode "any" = au moins une, "all" = toutes). */
export function checkPermissions(
  userPermissions: string[],
  required: string[],
  mode: 'any' | 'all' = 'any',
): boolean {
  if (required.length === 0) return true;
  const userSet = new Set(userPermissions);
  if (mode === 'any') return required.some((p) => userSet.has(p));
  return required.every((p) => userSet.has(p));
}

/** Vérifie si une action spécifique est autorisée pour les permissions données. */
export function isActionAllowed(
  resource: keyof typeof ACTION_GATES,
  action: string,
  userPermissions: string[],
): boolean {
  const gate = ACTION_GATES[resource];
  if (!gate) return true;
  const required = (gate as unknown as Record<string, readonly string[] | undefined>)[action];
  if (!required) return true;
  return checkPermissions(userPermissions, [...required], 'any');
}
