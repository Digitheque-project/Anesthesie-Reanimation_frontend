/**
 * Date et heure courantes au format des champs <input type="date"> / "time".
 *
 * [Premier soin] Ces helpers servent a pre-remplir "Date de debut" et "Heure de
 * debut" dans les formulaires de prescription, comme le fait prescription-front.
 * Sans valeur, le back retombe sur "heure de validation + intervalle", et le
 * premier soin s'affiche donc un intervalle plus tard (ex: +3h) dans
 * Soin / Traitement, ce qui surprend le prescripteur.
 */
export function nowDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowHeureStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
