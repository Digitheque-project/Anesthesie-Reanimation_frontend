'use client';

import HistoriqueForm from '@/features/prescription/components/HistoriqueForm';
import '@/features/prescription/prescription-suite.css';

interface PrescriptionAccueilTabProps {
	patientId: string;
}

// Le dossier patient est un dossier PARTAGÉ (propriété du service Dossier Patient) : le Bloc n'a
// que le droit de le consulter, jamais d'y écrire. Cet onglet ne montre donc plus que
// l'historique des prescriptions — les formulaires d'écriture (Médicamenteuse, Non
// médicamenteuse, Surveillance, Transfusion, portés jusqu'ici par PrescriptionModule) ont été
// retirés, pas seulement désactivés.
export function PrescriptionAccueilTab({ patientId }: PrescriptionAccueilTabProps) {
	return <HistoriqueForm patient={{ id: patientId, patientType: 'hospitalise' }} />;
}

export default PrescriptionAccueilTab;
