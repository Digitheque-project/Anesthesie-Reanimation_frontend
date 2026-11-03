'use client';

import HistoriqueForm from '@/features/prescription/components/HistoriqueForm';
import '@/features/prescription/prescription-suite.css';
import ModulePrescriptionBloc from '@/components/bloc/prescription/ModulePrescriptionBloc';

interface PrescriptionAccueilTabProps {
	patientId: string;
}

// Le dossier patient est un dossier PARTAGÉ (propriété du service Dossier Patient) : le Bloc n'a
// que le droit de le consulter, jamais d'y écrire. Cet onglet ne montre donc plus que
// l'historique des prescriptions — les formulaires d'écriture (Médicamenteuse, Non
// médicamenteuse, Surveillance, Transfusion, portés jusqu'ici par PrescriptionModule) ont été
// retirés, pas seulement désactivés.
// Classe « psx » : les couleurs du module de prescription (fond des fenêtres de détail…) sont
// définies sous elle (prescription-suite.css). Sans elle, la fenêtre de détail était sans fond
// et laissait voir le voile sombre — elle paraissait grise.
export function PrescriptionAccueilTab({ patientId }: PrescriptionAccueilTabProps) {
	return (
		<ModulePrescriptionBloc>
			<div className="psx">
				<HistoriqueForm patient={{ id: patientId, patientType: 'hospitalise' }} />
			</div>
		</ModulePrescriptionBloc>
	);
}

export default PrescriptionAccueilTab;
