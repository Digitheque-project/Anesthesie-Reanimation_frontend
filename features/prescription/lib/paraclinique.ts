/**
 * Chargement DYNAMIQUE des services para-cliniques.
 *
 * Auparavant la liste para-clinique (Laboratoire, Imagerie, EEG, Kine,
 * Endoscopie, Dialyse, Anapath) etait codee en dur dans PrescriptionModule.
 * On la recupere desormais par GET sur le microservice « service-service »
 * (NEXT_PUBLIC_GATEWAY_URL), en ne gardant que les services de
 * type PARACLINIQUE et actifs, filtres sur le CHU courant.
 *
 * Chaque service distant est ensuite mappe (par mot-cle sur son nom) vers le
 * formulaire de saisie correspondant deja present dans l'app.
 */

import axios from "axios";
import { configService } from "@/features/prescription/platform/config";
import { getStoredToken } from "@/features/prescription/platform/session-store";

export type ParaFormKey =
  | "labo"
  | "imag"
  | "eeg"
  | "kine"
  | "endo"
  | "dial"
  | "ana"
  | "ecg"
  | "orl"
  | "poly";

export interface ParacliniqueService {
  /** UUID du service (service-service). */
  serviceId: string;
  /** Libelle affiche a l'utilisateur (nom du service distant). */
  name: string;
  /** Formulaire de saisie associe, deduit du nom. `null` si aucun ne correspond. */
  formKey: ParaFormKey | null;
}

/**
 * Libelles courts d'affichage (parite avec prescription_front). Le nom distant
 * (ex : « Anatomo-pathologique », « Électroencéphalogramme ») est trop long
 * pour les pills ; on affiche a la place le libelle court du formulaire.
 */
export const PARA_SHORT_LABELS: Record<ParaFormKey, string> = {
  labo: "Laboratoire",
  imag: "Imagerie",
  ana: "Anapath",
  endo: "Endoscopie",
  dial: "Dialyse",
  eeg: "EEG",
  ecg: "ECG",
  poly: "Polysomnographie",
  orl: "ORL",
  kine: "Kinésithérapie",
};

interface RawService {
  id: string;
  name: string;
  baseUrl?: string;
  type?: string | null;
  isActive?: boolean;
  chuId?: string;
}

/** Ordre d'affichage des services para-cliniques (parite avec prescription_front). */
const PARA_ORDER: Record<ParaFormKey, number> = {
  labo: 0,
  imag: 1,
  ana: 2,
  endo: 3,
  dial: 4,
  eeg: 5,
  ecg: 6,
  poly: 7,
  orl: 8,
  kine: 9,
};

/** Mots-cles (normalises) reliant un nom de service distant a un formulaire. */
const FORM_MATCHERS: { key: ParaFormKey; matchers: string[] }[] = [
  { key: "labo", matchers: ["LABORATOIRE", "LABO", "ANALYSE", "BIOLOGIE", "BIO"] },
  { key: "imag", matchers: ["IMAGERIE", "IMAG", "RADIO", "SCANNER", "IRM", "ECHO"] },
  { key: "eeg", matchers: ["EEG", "ELECTROENCEPHALO", "NEUROPHYSIO"] },
  { key: "kine", matchers: ["KINE", "REEDUC", "PHYSIOTHERAPIE"] },
  { key: "endo", matchers: ["ENDOSCOPIE", "ENDOSCOP", "FIBROSCOP"] },
  { key: "dial", matchers: ["DIALYSE", "HEMODIAL", "EPURATION"] },
  { key: "ecg", matchers: ["ECG", "ELECTROCARDIO"] },
  { key: "orl", matchers: ["ORL", "OTO-RHINO", "AUDIO"] },
  { key: "poly", matchers: ["POLYSOMNO", "SOMMEIL"] },
  { key: "ana", matchers: ["ANAPATH", "ANATOMOPATHOLOG", "HISTOLOG", "PATHOLOG"] },
];

/**
 * Normalise la base URL du microservice « service-service ».
 *
 * NEXT_PUBLIC_GATEWAY_URL est renseignee de deux facons selon les
 * environnements :
 *   - avec le segment de collection : https://service-service-xxx.onrender.com/services
 *   - sans le segment              : https://service-service-xxx.onrender.com
 *
 * Le premier cas provoquait un appel sur /services/services (HTTP 500), car ce
 * module ajoutait systematiquement /services a la base. On enleve donc le slash
 * final ET un eventuel segment /services final avant de reconstruire l'URL, de
 * sorte que les deux formes d'environnement donnent le meme resultat.
 */
function resolveServicesEndpoint(base: string): string {
  const root = base
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/services$/i, "");
  return `${root}/services`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/** Deduit le formulaire de saisie a partir du nom d'un service para-clinique. */
export function resolveParaFormKey(name: string): ParaFormKey | null {
  const n = normalize(name || "");
  if (!n) return null;
  for (const { key, matchers } of FORM_MATCHERS) {
    if (matchers.some((m) => n.includes(m))) return key;
  }
  return null;
}

/**
 * Recupere (GET) les services para-cliniques actifs du CHU courant.
 * Ne jette pas pour un tableau vide ; renvoie [] si la base n'est pas definie.
 */
export async function fetchParacliniqueServices(
  chuId?: string,
): Promise<ParacliniqueService[]> {
  const base = configService.getServiceChuApiBaseUrl()?.trim();
  if (!base) return [];

  const token = getStoredToken();
  const response = await axios.get<RawService[]>(
    resolveServicesEndpoint(base),
    {
      params: chuId ? { chuId } : {},
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      timeout: 20_000,
    },
  );

  const list = Array.isArray(response.data) ? response.data : [];

  return list
    .filter(
      (s) =>
        normalize(String(s.type ?? "")) === "PARACLINIQUE" &&
        s.isActive !== false,
    )
    .map((s) => ({
      serviceId: s.id,
      name: s.name,
      formKey: resolveParaFormKey(s.name),
    }))
    .sort((a, b) => {
      if (a.formKey === b.formKey) return 0;
      if (a.formKey === null) return 1;
      if (b.formKey === null) return -1;
      return PARA_ORDER[a.formKey] - PARA_ORDER[b.formKey];
    });
}
