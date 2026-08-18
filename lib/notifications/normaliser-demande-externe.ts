import { formaterNomPatient } from '@/lib/patient'
import { estEchelleUrgente } from '@/lib/urgence'

// Les demandes de CPA/VPA émises par des services externes (ex: Endoscopie) sont un modèle
// distinct des prescriptions internes — normalisées ici au même format que les notifications
// pour pouvoir être affichées dans le même fil (bell TopBar, page Notification CPA). Le backend
// enrichit déjà la demande avec l'identité du service Accueil (nom/prénom) — jamais l'ID en
// remplacement du nom.
export const normaliserDemandeExterne = (d: any) => ({
  id: d.id,
  origineExterne: true,
  patientId: d.patientId,
  patientNom: formaterNomPatient(d),
  intervention: d.motif || d.typeAnesthesie,
  motif: d.motif,
  prescripteur: d.sourceServiceName || d.sourceServiceId,
  sourceServiceName: d.sourceServiceName || d.sourceServiceId,
  heure: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
  // Sans ces deux champs, la cloche de notifications ne pouvait ni trier les demandes externes
  // avec les autres sources (aucune date exploitable), ni afficher "Reçue le" (toujours N/A).
  createdAt: d.createdAt,
  receivedAt: d.createdAt,
  dateIntervention: d.dateExamenSouhaitee,
  urgence: d.urgence,
  estUrgent: estEchelleUrgente(d.urgence),
  statut: 'EN_ATTENTE',
  // Lecture persistée côté backend (voir DemandeCpaExterneService.marquerLu) — sans ça, une
  // demande externe réapparaissait indéfiniment dans la cloche même après avoir été "vue".
  lu: d.lu ?? false,
  luLe: d.luLe ?? null,
})
