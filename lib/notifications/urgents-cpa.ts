import { patientService } from '@/lib/api'

/**
 * Patients URGENTS / TRÈS URGENTS dont la CPA reste à faire. Leur place est le fil de travail
 * (« Faire la VPA », pas de créneau à réserver) : la Prescription et son compteur du tableau
 * de bord les retirent — uniquement ceux-là, pour qu'aucun patient ne disparaisse des deux
 * listes à la fois.
 */
export async function patientsUrgentsEnAttenteCpa(): Promise<any[]> {
  const listes = await Promise.all(['TRES_URGENT', 'URGENT'].map((niveau) =>
    patientService.getAll({ statut: 'EN_ATTENTE_CPA', niveauUrgence: niveau, limite: 200 })
      .then((r: any) => (Array.isArray(r?.data) ? r.data : []))
      .catch(() => []),
  ))
  return listes.flat()
}

/** Identifiant patient d'une prescription ou d'une demande externe normalisée. */
export const patientIdDe = (n: any): string | undefined => n?.patient?.id || n?.patientId

/** Retire les prescriptions des patients déjà dans le fil de travail en tant qu'urgents. */
export function sansUrgentsDuFil<T>(prescriptions: T[], urgents: any[]): T[] {
  const ids = new Set(urgents.map((p) => p.patientId || p.id).filter(Boolean))
  return ids.size ? prescriptions.filter((n) => !ids.has(patientIdDe(n) as string)) : prescriptions
}
