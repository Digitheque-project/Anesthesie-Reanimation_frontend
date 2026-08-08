'use client';

/**
 * PrescriptionModule — sous-ensemble porté depuis front-clinique pour la CPA du bloc
 * opératoire : Médicamenteuse, Non médicamenteuse, Surveillance, Transfusion, Historique.
 * Pas de Bloc opératoire (ça sert à *demander* une CPA, pas à en faire une) ni de
 * Para-clinique (labo/imagerie/etc., hors sujet ici et dépendant d'un registre de services
 * externe non configuré côté bloc).
 */

import { useEffect, useMemo, useState } from 'react';
import { getActiveSession } from '@/lib/clinical-auth/session';
import { useRole } from '@/lib/hooks/useRole';
import { cn } from '@/lib/utils';
import {
	PrescriptionPanierProvider,
	usePrescriptionPanier,
	type ServiceDestOverride,
} from '@/features/prescription/contexts/PrescriptionPanierContext';
import MedicaleForm from '@/features/prescription/components/medicale/MedicaleForm';
import NonMedicaleForm from '@/features/prescription/components/NonMedicaleForm';
import SurveillanceForm from '@/features/prescription/components/SurveillanceForm';
import TransfusionForm from '@/features/prescription/components/TransfusionForm';
import HistoriqueForm from '@/features/prescription/components/HistoriqueForm';
import '@/features/prescription/prescription-suite.css';

type MainSection = 'med' | 'nm' | 'surv' | 'trans' | 'hist';

interface PrescriptionModuleProps {
	patientId: string;
	/** Statut du patient dans le dossier (hospitalisation par defaut). */
	patientType?: 'hospitalise' | 'consultation_externe' | 'accueil';
	/**
	 * Service destinataire à imposer pour toute prescription créée ici — utilisé depuis la CPA
	 * du bloc pour router vers le service d'origine du patient plutôt que la Pharmacie.
	 */
	serviceDestOverride?: ServiceDestOverride;
}

const MAIN_ITEMS: { id: MainSection; icon: string; label: string; hint: string }[] = [
	{ id: 'med', icon: 'medication', label: 'Médicamenteuse', hint: 'Ordonnance de médicaments' },
	{ id: 'nm', icon: 'self_care', label: 'Non médicamenteuse', hint: 'Soins et mesures non médicamenteux' },
	{ id: 'surv', icon: 'monitor_heart', label: 'Surveillance', hint: 'Paramètres à surveiller' },
	{ id: 'trans', icon: 'bloodtype', label: 'Transfusion', hint: 'Produits sanguins labiles' },
	{ id: 'hist', icon: 'history', label: 'Historique', hint: 'Prescriptions antérieures' },
];

function PrescriptionModuleInner({ patientId, patientType = 'hospitalise', serviceDestOverride }: PrescriptionModuleProps) {
	const { setPatientId, setServiceDestOverride } = usePrescriptionPanier();
	const [main, setMain] = useState<MainSection>('med');
	// Seuls l'anesthésiste, le responsable CPA ou le major prescrivent réellement (même règle
	// que le bouton "Prescrire" de la CPA, jusqu'ici non appliquée sur ce second point d'entrée
	// — n'importe quel rôle du bloc pouvait créer une prescription depuis le dossier patient).
	// La consultation (dont l'historique) reste ouverte à tous.
	const { peutDeciderAptitudeCpa, roleName } = useRole();

	const session = useMemo(() => getActiveSession(), []);

	const prescripteur = useMemo(() => {
		const claims = session?.claims;
		return {
			id: claims?.userId ?? '',
			nom: claims?.name ?? '',
			prenom: claims?.firstname ?? '',
			service: session?.currentService?.serviceName ?? '',
			poste: session?.currentService?.roleName ?? '',
		};
	}, [session]);

	const patient = useMemo(() => ({ id: patientId, patientType }), [patientId, patientType]);

	// Keep the shared panier context in sync with the current patient.
	useEffect(() => {
		if (patientId) setPatientId(patientId);
	}, [patientId, setPatientId]);

	useEffect(() => {
		setServiceDestOverride(serviceDestOverride ?? null);
	}, [serviceDestOverride, setServiceDestOverride]);

	function renderSection() {
		if (main !== 'hist' && !peutDeciderAptitudeCpa) {
			return (
				<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
					La prescription est réservée à l'anesthésiste, au responsable CPA ou au major
					{roleName ? ` (votre rôle actuel est : ${roleName})` : ''}. Vous pouvez consulter l'historique.
				</div>
			);
		}
		switch (main) {
			case 'med':
				return <MedicaleForm patient={patient} prescripteur={prescripteur} patientType={patientType} />;
			case 'nm':
				return <NonMedicaleForm patient={patient} prescripteur={prescripteur} patientType={patientType} />;
			case 'surv':
				return <SurveillanceForm patient={patient} prescripteur={prescripteur} patientType={patientType} />;
			case 'trans':
				return <TransfusionForm patient={patient} prescripteur={prescripteur} />;
			case 'hist':
				return <HistoriqueForm patient={patient} prescripteur={prescripteur} />;
			default:
				return null;
		}
	}

	// --- derived, presentation-only values (no business logic) ---------------
	const activeMain = MAIN_ITEMS.find((i) => i.id === main) ?? MAIN_ITEMS[0];

	return (
		<div className="psx flex items-start gap-3 sm:gap-4 lg:gap-5">
			{/* ── Left icon rail : prescription modules (fixed width) ──── */}
			<aside
				aria-label="Types de prescription"
				className="sticky top-4 max-h-[calc(100vh-2rem)] w-40 shrink-0 self-start overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-2 sm:w-44 lg:w-48"
			>
				<p className="px-2 pb-1.5 pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
					Prescriptions
				</p>
				<div className="flex flex-col gap-1">
					{MAIN_ITEMS.map((item) => {
						const active = main === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setMain(item.id)}
								aria-current={active ? 'page' : undefined}
								title={item.label}
								className={cn(
									'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors',
									active
										? 'bg-[#05668D] text-white shadow-sm'
										: 'text-slate-600 hover:bg-white hover:text-[#05668D]',
								)}
							>
								<span className="flex-1 truncate">{item.label}</span>
							</button>
						);
					})}
				</div>
			</aside>

			{/* ── Right column : section header + form  */}
			<div className="min-w-0 flex-1 @container">
				<header className="mb-4 flex items-center gap-3.5 border-b border-slate-200 pb-4">
					<span className="ms flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FB] text-[24px] leading-none text-[#05668D]">
						{activeMain.icon}
					</span>
					<div className="min-w-0">
						<h3 className="text-[18px] font-extrabold tracking-tight text-slate-800">
							{activeMain.label}
						</h3>
						<p className="mt-0.5 text-[13px] text-slate-500">
							{activeMain.hint}
						</p>
					</div>
				</header>

				{serviceDestOverride && (
					<div className="mb-4 rounded-xl border border-[#05668D]/20 bg-[#EBF5FB] px-4 py-3 text-[13px] font-semibold text-[#05668D]">
						Cette prescription sera envoyée à : {serviceDestOverride.serviceName}
					</div>
				)}

				{/* Active section */}
				<div>{renderSection()}</div>
			</div>

		</div>
	);
}

export default function PrescriptionModule({ patientId, patientType, serviceDestOverride }: PrescriptionModuleProps) {
	return (
		<PrescriptionPanierProvider>
			<PrescriptionModuleInner patientId={patientId} patientType={patientType} serviceDestOverride={serviceDestOverride} />
		</PrescriptionPanierProvider>
	);
}
