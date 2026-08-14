// Un même patient peut apparaître plusieurs fois dans un fil de notifications (plusieurs
// cycles d'ingestion de prescription, notification interne + demande externe pour le même
// évènement, etc.) — on ne garde qu'une entrée par patient. Le choix de la ligne retenue ne doit
// jamais faire "repartir" un patient déjà pris en charge en nouvelle notification : on trie par
// maturité de la ligne, puis par fraîcheur à maturité égale.
export type NotificationFilaire = {
  patientId?: string
  id?: string
  statut?: string
  processed?: boolean
  createdAt?: string
  receivedAt?: string
  heure?: string
}

// Priorité de rétention (plus petit = conservée) :
//   1. notification interne encore actionnable (EN_ATTENTE) — à traiter en premier ;
//   2. notification interne déjà avancée (RDV_PLANIFIE, REALISE...) — porte un `statut` ;
//   3. ligne webhook pas encore traitée (processed: false) ;
//   4. ligne webhook déjà traitée (processed: true).
// Sans cette hiérarchie, une fois le RDV planifié (la ligne interne passe d'EN_ATTENTE à
// RDV_PLANIFIE), le doublon webhook de la même prescription devenait la ligne retenue : la cloche
// la recomptait "non lue" et le fil la traitait comme une nouvelle notification (carillon), alors
// que rien de nouveau n'était arrivé.
const prioriteLigne = (n: NotificationFilaire): number => {
  if (n.statut === 'EN_ATTENTE') return 1
  if (n.statut) return 2
  if (n.processed === false) return 3
  return 4
}

export function dedupeParPatient<T extends NotificationFilaire>(
  items: T[]
): T[] {
  const horodatage = (n: NotificationFilaire) =>
    new Date(n.createdAt || n.receivedAt || 0).getTime()

  const parPatient = new Map<string, T>()
  for (const item of items) {
    const cle = item.patientId || item.id
    if (!cle) continue
    const existant = parPatient.get(cle)
    if (!existant) {
      parPatient.set(cle, item)
      continue
    }
    if (prioriteLigne(item) !== prioriteLigne(existant)) {
      if (prioriteLigne(item) < prioriteLigne(existant)) parPatient.set(cle, item)
      continue
    }
    if (horodatage(item) > horodatage(existant)) parPatient.set(cle, item)
  }
  return Array.from(parPatient.values())
}
