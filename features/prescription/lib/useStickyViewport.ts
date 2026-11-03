/**
 * useStickyViewport
 * ---------------------------------------------------------------------------
 * POURQUOI CE HOOK EXISTE
 *
 * Les panneaux lateraux de la suite prescription (menu de gauche, colonnes de
 * droite "recapitulatif / Valider") sont en `position: sticky` et doivent etre
 * bornes a la hauteur VISIBLE pour ne pas defiler brutalement.
 *
 * Le piege : dans le dossier patient, la page NE defile PAS dans la fenetre.
 * Le contenu de l'onglet est rendu dans un panneau interne
 * (`<div className="h-full overflow-y-auto">`) situe sous l'en-tete patient et
 * la barre d'onglets. Ce panneau est donc NETTEMENT plus court que le viewport.
 *
 * Consequence : borner les panneaux avec `calc(100vh - 32px)` les rend plus
 * hauts que la zone reellement visible. Le bas du panneau (le bouton Valider)
 * reste hors ecran et l'utilisateur doit encore faire defiler le panneau parent
 * -> l'effet "ca scrolle toujours brutalement".
 *
 * Ce hook mesure la hauteur reelle du conteneur scrollable qui englobe la suite
 * et l'expose en variable CSS `--psx-vh` sur la racine `.psx`. Toutes les regles
 * sticky de `prescription-suite.css` s'appuient sur cette variable au lieu de
 * `100vh`. La mesure est reevaluee a chaque redimensionnement (fenetre, panneau,
 * ouverture/fermeture de la sidebar de l'app, changement d'onglet).
 */

import { useEffect } from "react";

/**
 * Un conteneur est considere comme scrollable des lors que son `overflow-y`
 * l'autorise -- independamment du fait qu'il debord ou non A CET INSTANT.
 *
 * C'est volontairement plus permissif que le test de `scrollUtils.ts` (qui
 * exige `scrollHeight > clientHeight`) : au premier rendu la suite peut etre
 * vide et ne pas encore deborder, alors que c'est bien ce panneau qui bornera
 * l'affichage. Tester le debordement ici donnerait une mesure fausse au montage.
 */
function isScrollableBox(el: Element): boolean {
	const { overflowY } = window.getComputedStyle(el);
	return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}

function findScrollableAncestor(start: Element | null): HTMLElement | null {
	let current = start?.parentElement ?? null;
	while (current && current !== document.body) {
		if (isScrollableBox(current)) return current;
		current = current.parentElement;
	}
	return null;
}

/** Hauteur plancher : en dessous, borner n'a plus de sens (mobile, panneau replie). */
const MIN_VIEWPORT = 360;

export function useStickyViewport(
	ref: { current: HTMLElement | null },
	/** Marge haute/basse conservee autour des panneaux sticky, en px. */
	offset = 16,
) {
	useEffect(() => {
		const root = ref.current;
		if (!root || typeof window === "undefined") return;

		const scroller = findScrollableAncestor(root);

		const apply = () => {
			// `clientHeight` = hauteur interne visible, hors barres de defilement.
			const raw = scroller ? scroller.clientHeight : window.innerHeight;
			const height = Math.max(MIN_VIEWPORT, Math.round(raw));
			root.style.setProperty("--psx-vh", `${height}px`);
			root.style.setProperty("--psx-sticky-top", `${offset}px`);
		};

		apply();

		// Un ResizeObserver suit le panneau parent : il change de hauteur quand la
		// fenetre bouge, quand l'en-tete patient se replie ou quand la barre
		// d'onglets passe sur deux lignes.
		const observed = scroller ?? root;
		const observer =
			typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
		observer?.observe(observed);

		window.addEventListener("resize", apply);
		window.addEventListener("orientationchange", apply);

		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", apply);
			window.removeEventListener("orientationchange", apply);
		};
	}, [ref, offset]);
}

export default useStickyViewport;
