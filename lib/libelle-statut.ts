// Libellé lisible d'un statut venu d'un backend (« EN_ATTENTE », « termine »,
// « delivree »…) : jamais de code technique à l'écran. Même fichier dans tous
// les fronts du CHU ; les statuts propres à un service gardent leur table
// locale et passent ici en dernier recours.

const LIBELLES: Record<string, string> = {
  ACTIF: 'Actif',
  ANNULE: 'Annulé',
  ANNULEE: 'Annulée',
  A_VALIDER: 'À valider',
  ABSENT: 'Absent',
  ARCHIVE: 'Archivé',
  ARCHIVEE: 'Archivée',
  BROUILLON: 'Brouillon',
  COMMANDEE: 'Commandée',
  CONFIRME: 'Confirmé',
  CONFIRMEE: 'Confirmée',
  DELIVRE: 'Délivré',
  DELIVREE: 'Délivrée',
  DISPONIBLE: 'Disponible',
  EFFECTUE: 'Effectué',
  EFFECTUEE: 'Effectuée',
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  EN_PANNE: 'En panne',
  ENREGISTRE: 'Enregistré',
  ENREGISTREE: 'Enregistrée',
  ENVOYE: 'Envoyé',
  ENVOYEE: 'Envoyée',
  EXPIRE: 'Expiré',
  EXPIREE: 'Expirée',
  LIVRE: 'Livré',
  LIVREE: 'Livrée',
  NON_FAIT: 'Non fait',
  OCCUPE: 'Occupé',
  OPERATIONNEL: 'Opérationnel',
  PARTIEL: 'Partiel',
  PARTIELLE: 'Partielle',
  PERIME: 'Périmé',
  PERIMEE: 'Périmée',
  PLANIFIE: 'Planifié',
  PLANIFIEE: 'Planifiée',
  PRESENT: 'Présent',
  PRET: 'Prêt',
  PREVU: 'Prévu',
  REALISE: 'Réalisé',
  REALISEE: 'Réalisée',
  RECU: 'Reçu',
  RECUE: 'Reçue',
  REFUSE: 'Refusé',
  REFUSEE: 'Refusée',
  REPORTE: 'Reporté',
  REPORTEE: 'Reportée',
  RESERVE: 'Réservé',
  RESERVEE: 'Réservée',
  SIGNED: 'Validé',
  TERMINE: 'Terminé',
  TERMINEE: 'Terminée',
  TRAITE: 'Traité',
  TRAITEE: 'Traitée',
  URGENT: 'Urgent',
  VALIDE: 'Validé',
  VALIDEE: 'Validée',
  // Anglais (anciens écrans, pharmacie)
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  CANCELED: 'Annulé',
  APPROVED: 'Validé',
  REJECTED: 'Refusé',
  DELIVERED: 'Livré',
  RECEIVED: 'Reçu',
  ORDERED: 'Commandé',
  SENT: 'Envoyé',
  DRAFT: 'Brouillon',
}

const cle = (s: string) =>
  s.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[\s-]+/g, '_')

export function libelleStatut(statut?: string | null, propres?: Record<string, string>): string {
  if (!statut) return '—'
  const brut = String(statut)
  if (propres?.[brut]) return propres[brut]
  const k = cle(brut)
  if (propres?.[k]) return propres[k]
  if (LIBELLES[k]) return LIBELLES[k]
  // Inconnu : « EN_ATTENTE_CPA » → « En attente cpa », « Confirmé » reste tel quel.
  const texte = /[a-zà-ÿ]/.test(brut) && !brut.includes('_') ? brut : brut.replace(/_/g, ' ').toLowerCase()
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}
