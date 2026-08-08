// Port (sous-ensemble utilisé par SortieTab) de front-clinique/src/types/hospitalisation.types.ts

export type StatutHospitalisation = 'ADMIS' | 'EN_COURS' | 'TRANSFERE' | 'SORTIE' | 'DECEDE' | 'EVADE'

export type ModeSortie =
  | 'SORTIE_AUTORISEE'
  | 'SORTIE_CONTRE_AVIS'
  | 'TRANSFERT_INTERNE'
  | 'TRANSFERT_EXTERNE'
  | 'EVACUATION_SANITAIRE'
  | 'DECES'
  | 'EVASION'

export type StatutPaiementSortie = 'NON_VERIFIE' | 'REGLE' | 'NON_REGLE' | 'EXONERE' | 'PRISE_EN_CHARGE' | 'REGLEMENT_DIFFERE'

export interface Hospitalisation {
  id: string
  patientId: string
  serviceId: string
  chuId?: string
  dateAdmission?: string
  dateEntrer?: string
  dateSortie?: string | null
  motifAdmission?: string
  motifHospitalisation?: string
  statut?: StatutHospitalisation
  litId?: string | null
  litCode?: string | null
  type?: string
  commentaire?: string
}

export interface CloseHospitalisationPayload {
  chuId: string
  updatedBy: string
  modeSortie: ModeSortie
  statutFinal?: StatutHospitalisation
  dateSortie?: string
  commentaireSortie?: string
  etatSortie?: string
  motifSortie?: string
  resumeSortie?: string
  diagnosticFinal?: string
  traitementSortie?: string
  conduiteATenir?: string
  rendezVousControle?: string
  destinationServiceId?: string
  destinationEtablissement?: string
  moyenTransport?: string
  dateDeces?: string
  causeDeces?: string
  certificatDecesNumero?: string
  motifContreAvis?: string
  risquesExpliques?: string
  signaturePatient?: boolean
  fraisRegles?: boolean
  statutPaiementSortie?: StatutPaiementSortie
  referencePaiement?: string
  commentairePaiement?: string
}
