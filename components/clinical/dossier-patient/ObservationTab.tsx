'use client';

import React from 'react';
import type { ObservationPatientInfo } from '@/components/clinical/dossier-patient/ObservationForm';
import { ObservationHistoryList } from '@/components/clinical/dossier-patient/ObservationHistoryList';

interface Props {
  patientId: string;
  hydratedPatientInfo?: ObservationPatientInfo | null;
  chuId?: string;
  serviceId?: string;
}

// Le dossier patient est un dossier PARTAGÉ, propriété du service Dossier Patient — le Bloc n'a
// que le droit de le consulter, jamais d'y écrire (observation, diagnostic, suivi...). Cet onglet
// ne montre donc plus que l'historique en lecture seule ; le formulaire de saisie d'une nouvelle
// observation (ObservationForm) a été retiré, pas seulement désactivé.
export function ObservationTab({ patientId, chuId, serviceId }: Props) {
  return <ObservationHistoryList patientId={patientId} chuId={chuId} serviceId={serviceId} />;
}
