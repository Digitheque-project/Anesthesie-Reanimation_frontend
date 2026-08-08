// Un même patient peut apparaître plusieurs fois dans un fil de notifications (plusieurs
// cycles d'ingestion de prescription, notification interne + demande externe pour le même
// évènement, etc.) — on ne garde qu'une entrée par patient : celle encore actionnable
// (EN_ATTENTE) en priorité, sinon la plus récente.
export function dedupeParPatient<T extends { patientId?: string; id?: string; statut?: string; createdAt?: string; receivedAt?: string; heure?: string }>(
  items: T[]
): T[] {
  const estActionnable = (n: T) => n.statut === 'EN_ATTENTE'
  const horodatage = (n: T) => new Date(n.createdAt || n.receivedAt || 0).getTime()

  const parPatient = new Map<string, T>()
  for (const item of items) {
    const cle = item.patientId || item.id
    if (!cle) continue
    const existant = parPatient.get(cle)
    if (!existant) {
      parPatient.set(cle, item)
      continue
    }
    if (estActionnable(item) !== estActionnable(existant)) {
      if (estActionnable(item)) parPatient.set(cle, item)
      continue
    }
    if (horodatage(item) > horodatage(existant)) parPatient.set(cle, item)
  }
  return Array.from(parPatient.values())
}
