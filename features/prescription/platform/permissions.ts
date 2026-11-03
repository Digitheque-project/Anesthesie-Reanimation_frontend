// En Consultation externe, le médecin connecté peut toujours prescrire ; le
// contrôle réel des droits est fait par le service Prescription (backend).
export function usePermissions() {
  return {
    canDo: (_resource: string, _action: string) => true,
  };
}
