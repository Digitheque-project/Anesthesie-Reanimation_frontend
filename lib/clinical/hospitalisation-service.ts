import { hospitalisationApi } from '@/lib/clinical/hospitalisation-api'
import { obtenirSessionValide } from '@/lib/auth/central-session'
import type { CloseHospitalisationPayload, Hospitalisation } from '@/types/hospitalisation.types'

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
}
