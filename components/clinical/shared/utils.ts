// Port (sous-ensemble utilisé par la page dossier patient) de
// front-clinique/src/components/clinical/shared/utils.ts.
export function pickPriseEnChargeId(
  patient: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!patient) return undefined;
  const raw = patient["priseEnChargeId"];
  if (typeof raw !== "string") return undefined;

  const cleanId = raw.trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(cleanId) ? cleanId : undefined;
}
