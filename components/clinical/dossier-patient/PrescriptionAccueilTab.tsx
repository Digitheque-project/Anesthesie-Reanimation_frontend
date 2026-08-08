'use client';

import PrescriptionModule from '@/features/prescription/PrescriptionModule';
import type { ServiceDestOverride } from '@/features/prescription/contexts/PrescriptionPanierContext';

interface PrescriptionAccueilTabProps {
	patientId: string;
	/** Service d'origine du patient — sans ça, "surveillance"/"transfusion" partent avec un
	 * serviceIdDest vide (voir PrescriptionPanierContext.SERVICE_DEST_MAP). */
	serviceDestOverride?: ServiceDestOverride;
}

export function PrescriptionAccueilTab({ patientId, serviceDestOverride }: PrescriptionAccueilTabProps) {
	return <PrescriptionModule patientId={patientId} serviceDestOverride={serviceDestOverride} />;
}

export default PrescriptionAccueilTab;
