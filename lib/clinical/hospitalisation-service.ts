import { hospitalisationApi } from '@/lib/clinical/hospitalisation-api'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import type { CloseHospitalisationPayload, Hospitalisation, PlanLitsResponse } from '@/types/hospitalisation.types'

// Port (sous-ensemble utilisé par SortieTab) de
// front-clinique/src/services/services/hospitalisation.service.ts.
function defaultChuId(): string | undefined {
  return obtenirSessionValide()?.acces.chu?.id
}

export const hospitalisationService = {
  getByPatient: (patientId: string, serviceId?: string, chuId?: string) =>
    hospitalisationApi.get<Hospitalisation[]>('/hospitalisations', {
      params: { patientId, serviceIdDest: serviceId, chuId: chuId ?? defaultChuId() },
    }),

  close: (id: string, payload: CloseHospitalisationPayload) =>
    hospitalisationApi.patch<Hospitalisation>(`/hospitalisations/${id}/close`, payload),

  // Plan de lits du service (chambres + lits, avec leur code) — seul moyen de retrouver le vrai
  // numéro de chambre à partir du litCode d'un épisode d'hospitalisation (l'épisode ne porte que
  // le code du lit occupé, pas le numéro de la chambre qui le contient).
  planLits: (serviceId: string, chuId?: string) =>
    hospitalisationApi.get<PlanLitsResponse>('/plan-lits', {
      params: { serviceId, chuId: chuId ?? defaultChuId() },
    }),
}
