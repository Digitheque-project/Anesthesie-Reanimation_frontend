// Reconstitution partagée du dossier patient complet (chronologie + équipe intervenue) à
// partir de la réponse GET /archives/dossier/:patientId — utilisée par la page détail archives
// et par l'export PDF/Excel/CSV depuis la liste des archives.

export const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')
export const fmtDateHeure = (v: any) => (v ? new Date(v).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const fmtHeure = (v: any) => (v ? new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—')
export const nomPersonne = (rel: any, fallback?: string | null) => (rel ? `${rel.prenom || ''} ${rel.nom || ''}`.trim() : (fallback || null))

export type Personne = { nom: string; role: string; etapes: Set<string> }
export type LigneChronologie = { etape: string; date: string; dateTri: string; detail: string; personnel: string }

// Libellé complet du type d'anesthésie : la catégorie seule (AG/ALR/AL) ne dit pas grand-chose
// sans la technique précise choisie au sein de cette catégorie (Sédation/Intubation/Masque
// Laryngé pour l'AG, Rachianesthésie/APD/Blocage pour l'ALR...), voir cpa.entity.ts.
export const libelleAnesthesie = (cpa: any) =>
  cpa ? [cpa.typeAnesthesie, cpa.sousTypeAnesthesie].filter(Boolean).join(' — ') || '—' : '—'

// Reconstitue la liste des personnels ayant réellement pris en charge le patient, à partir de
// chaque étape du parcours (aucune donnée inventée : uniquement ce qui a été enregistré).
export function collecterEquipe(d: any): Personne[] {
  const carte = new Map<string, Personne>()
  const ajouter = (nom: string | null | undefined, role: string | null | undefined, etape: string) => {
    if (!nom || !nom.trim()) return
    const cle = `${nom}::${role || ''}`
    const existant = carte.get(cle)
    if (existant) existant.etapes.add(etape)
    else carte.set(cle, { nom, role: role || '—', etapes: new Set([etape]) })
  }

  d.notifications?.forEach((n: any) => ajouter(nomPersonne(n.chirurgien, n.chirurgienNom), 'Chirurgien', 'Prescription'))
  d.notifications?.forEach((n: any) => ajouter(n.professeurCPA, 'Professeur CPA', 'Prescription'))
  if (d.cpa) ajouter(nomPersonne(d.cpa.anesthesiste), 'Anesthésiste', 'CPA')
  if (d.verificationVeille) ajouter(nomPersonne(d.verificationVeille.anesthesiste), 'Anesthésiste', 'Vérification veille')
  d.bonsCommande?.forEach((b: any) => { ajouter(nomPersonne(b.chirurgien), 'Chirurgien', 'Commande anesthésie'); ajouter(nomPersonne(b.anesthesiste), 'Anesthésiste', 'Commande anesthésie') })
  d.checklistsAvantOp?.forEach((c: any) => ajouter(c.validateurNom, 'Anesthésiste', 'Check-list Sign In'))
  d.checklistsPendantOp?.forEach((c: any) => ajouter(c.validateurNom, 'Anesthésiste', 'Check-list Time Out'))
  d.momentsOperatoires?.forEach((m: any) => ajouter(m.auteurNom, m.auteurRole, 'Chronologie opératoire'))
  d.activitesPerOp?.forEach((a: any) => { ajouter(nomPersonne(a.chirurgien), 'Chirurgien', 'Surveillance per-opératoire'); ajouter(nomPersonne(a.anesthesiste), 'Anesthésiste', 'Surveillance per-opératoire') })
  d.checklistsApresOp?.forEach((c: any) => ajouter(c.validateurNom, 'Anesthésiste', 'Check-list Sign Out'))
  d.protocolesOperatoires?.forEach((p: any) => {
    ajouter(nomPersonne(p.chirurgien), 'Chirurgien', 'Protocole opératoire')
    ajouter(nomPersonne(p.anesthesiste), 'Anesthésiste', 'Protocole opératoire')
    ajouter(nomPersonne(p.infirmiere), 'Infirmière', 'Protocole opératoire')
    ajouter(nomPersonne(p.aideOperatoire), 'Aide opératoire', 'Protocole opératoire')
  })
  d.scoresSCCRE?.forEach((s: any) => ajouter(nomPersonne(s.anesthesiste), 'Anesthésiste', 'Score de réveil'))
  d.sortiesReveil?.forEach((s: any) => ajouter(nomPersonne(s.medecin), 'Anesthésiste', 'Sortie de réveil'))

  return Array.from(carte.values()).sort((a, b) => a.nom.localeCompare(b.nom))
}

// Construit la chronologie complète (une ligne par événement) dans l'ordre réel du parcours,
// utilisée à la fois pour l'affichage et pour les exports (CSV/Excel/PDF).
export function construireChronologie(d: any): LigneChronologie[] {
  const lignes: LigneChronologie[] = []
  // dateTri porte la valeur brute (ISO ou comparable lexicographiquement) utilisée uniquement
  // pour le tri — `date` est la version déjà formatée pour l'affichage (fr-FR, jamais triable
  // telle quelle : "5 janv." > "12 déc." alphabétiquement alors qu'elle lui est antérieure).
  const dateTri = (v: any) => (v ? new Date(v).toISOString() : '')

  d.notifications?.forEach((n: any) => lignes.push({
    etape: 'Prescription reçue', date: fmtDateHeure(n.createdAt), dateTri: dateTri(n.createdAt),
    detail: `${n.intervention || 'Intervention'}${n.estUrgent ? ' (urgent)' : ''} — statut ${n.statut}`,
    personnel: nomPersonne(n.chirurgien, n.chirurgienNom) || '—',
  }))
  d.demandesCpaExternes?.forEach((e: any) => lignes.push({
    etape: 'Prescription externe reçue', date: fmtDateHeure(e.createdAt), dateTri: dateTri(e.createdAt),
    detail: `${e.motif || e.typeAnesthesie || 'Demande'} — service ${e.sourceServiceName || e.sourceServiceId} — statut ${e.statut}`,
    personnel: '—',
  }))
  if (d.cpa) lignes.push({
    etape: 'CPA', date: fmtDate(d.cpa.dateConsultation), dateTri: dateTri(d.cpa.dateConsultation),
    detail: `Décision : ${d.cpa.decision}${d.cpa.motifRefus ? ` (${d.cpa.motifRefus})` : ''} — ASA ${d.cpa.scoreASA} — ${libelleAnesthesie(d.cpa)}`,
    personnel: nomPersonne(d.cpa.anesthesiste) || '—',
  })
  if (d.verificationVeille) lignes.push({
    etape: 'Vérification veille', date: fmtDate(d.verificationVeille.dateVisite), dateTri: dateTri(d.verificationVeille.dateVisite),
    detail: `Jeûne respecté : ${d.verificationVeille.jeuneRespected ? 'oui' : 'non'} — statut ${d.verificationVeille.statut}`,
    personnel: nomPersonne(d.verificationVeille.anesthesiste) || '—',
  })
  d.checklistsAvantOp?.forEach((c: any) => lignes.push({
    etape: 'Check-list avant opération (Sign In)', date: fmtDate(c.dateCreation), dateTri: dateTri(c.dateCreation),
    detail: `Statut ${c.statut}`, personnel: c.validateurNom || '—',
  }))
  d.checklistsPendantOp?.forEach((c: any) => lignes.push({
    etape: 'Check-list avant incision (Time Out)', date: fmtDate(c.dateCreation), dateTri: dateTri(c.dateCreation),
    detail: `Statut ${c.statut}`, personnel: c.validateurNom || '—',
  }))
  d.momentsOperatoires?.forEach((m: any) => lignes.push({
    etape: `Chronologie — ${m.label}`, date: fmtDateHeure(m.horodatage), dateTri: dateTri(m.horodatage),
    detail: `Catégorie ${m.categorie}${m.annule ? ' (annulé)' : ''}`, personnel: m.auteurNom || '—',
  }))
  d.activitesPerOp?.forEach((a: any) => lignes.push({
    etape: 'Surveillance per-opératoire', date: fmtDate(a.dateOperation), dateTri: dateTri(a.dateOperation),
    detail: `${a.constantes?.length || 0} mesure(s) de constantes`, personnel: nomPersonne(a.anesthesiste) || nomPersonne(a.chirurgien) || '—',
  }))
  d.checklistsApresOp?.forEach((c: any) => lignes.push({
    etape: 'Check-list après intervention (Sign Out)', date: fmtDate(c.dateCreation), dateTri: dateTri(c.dateCreation),
    detail: `Statut ${c.statut}`, personnel: c.validateurNom || '—',
  }))
  d.protocolesOperatoires?.forEach((p: any) => lignes.push({
    etape: 'Protocole opératoire', date: fmtDate(p.dateOperation), dateTri: dateTri(p.dateOperation),
    detail: p.compteRenduIntervention?.substring(0, 80) || p.compteRenduAnesthesique?.substring(0, 80) || '—',
    personnel: nomPersonne(p.chirurgien) || nomPersonne(p.anesthesiste) || '—',
  }))
  d.scoresSCCRE?.forEach((s: any) => lignes.push({
    etape: 'Score de réveil (SCCRE)', date: fmtDate(s.dateEvaluation), dateTri: dateTri(s.dateEvaluation),
    detail: `Score total ${s.scoreTotal}/10`, personnel: nomPersonne(s.anesthesiste) || '—',
  }))
  d.sortiesReveil?.forEach((s: any) => lignes.push({
    etape: 'Sortie de salle de réveil', date: fmtDateHeure(s.dateHeureSortie), dateTri: dateTri(s.dateHeureSortie),
    detail: s.versServiceOrigine ? 'Retour service d\'origine' : (s.autresServicesDestination || []).join(', '),
    personnel: nomPersonne(s.medecin) || '—',
  }))

  return lignes.sort((a, b) => a.dateTri.localeCompare(b.dateTri))
}
