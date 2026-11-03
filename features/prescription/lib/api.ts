import { getStoredToken } from "@/features/prescription/lib/auth";
import { getActiveSession } from "@/features/prescription/platform/session-store";
import { notifierMajSoins } from "@/features/prescription/platform/soins-realtime";
import { gatewayUrl } from "@/features/prescription/platform/gateway";
export { authFetch } from "@/features/prescription/lib/auth";

// Origine de la passerelle : les routes ajoutent deja "/prescriptions".
const RAW_API_URL = gatewayUrl();
// Chaque endpoint ci-dessous ajoute deja le prefixe "/prescriptions". Si l'URL
// configuree (NEXT_PUBLIC_GATEWAY_URL) se termine deja par
// "/prescriptions" (ou par un "/"), on la normalise pour eviter le doublon
// "/prescriptions/prescriptions" qui provoque des 404.
const API_URL = RAW_API_URL.replace(/\/+$/, "").replace(/\/prescriptions$/, "");

// ── MAPPINGS ─────────────────────────────────────────────────────
const URGENCE_MAP: Record<string, string> = {
  n: "NORMAL",
  u: "URGENT",
  tu: "TRES_URGENT",
};

const TAB_TO_ANAPATH: Record<string, string> = {
  fcv: "FCV_PAP",
  cyto: "CYT0PONCTION",
  liq: "LIQUIDE",
  bio: "BIOPSIE",
  pos: "POS",
  poc: "POC",
  ext: "EXTEMPORANE_STAT",
};

const EEG_TYPE_MAP: Record<string, string> = {
  "EEG standard de repos (20–30 min)": "STANDARD",
  "EEG avec privation de sommeil": "STANDARD",
  "EEG de sommeil": "SOMMEIL",
  "Holter EEG ambulatoire (24–72h)": "AMBULATOIRE",
  "EEG vidéo (Vidéo-EEG)": "VIDEO_EEG",
  "EEG per-opératoire": "STANDARD",
};

// ── HEADERS ───────────────────────────────────────────────────
function headers() {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getStoredToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ── PRESCRIPTIONS ─────────────────────────────────────────────
function getRoutePath(endpoint: string): string {
  return endpoint.replace(/^\/+/, "").toLowerCase();
}

function isRoute(endpointPath: string, route: string): boolean {
  return endpointPath === route || endpointPath.startsWith(`${route}/`);
}

function resolveImagerieEndpoint(
  payload: Record<string, unknown>,
  fallback = "prescriptions/imagerie",
) {
  return fallback;
}

/**
 * Destination imposée — bloc opératoire : une prescription faite pendant la CPA part au
 * service d'origine du patient (celui qui l'administrera), pas à la Pharmacie ni au
 * service par défaut. Seulement pour ces quatre types : un examen (laboratoire,
 * imagerie…) part toujours au service qui le réalise.
 */
let destinationImposee: { serviceId: string; serviceName: string } | null = null;
const ROUTES_DESTINATION_IMPOSEE = new Set([
  "prescriptions/medicale",
  "prescriptions/non-medicale",
  "prescriptions/surveillance",
  "prescriptions/transfusion",
]);
export function definirDestinationImposee(d: { serviceId: string; serviceName: string } | null) {
  destinationImposee = d;
}

export function normalizePayloadForEndpoint(endpoint: string, data: unknown) {
  const input = (data as Record<string, unknown>) || {};
  const session = getActiveSession();
  const activeService = session?.currentService;
  const body: Record<string, unknown> = {
    ...input,
    chuId: input.chuId ?? activeService?.chu?.id,
    chuNom: input.chuNom ?? activeService?.chu?.name,
    serviceIdSource: input.serviceIdSource ?? activeService?.serviceId,
    serviceNameSource: input.serviceNameSource ?? activeService?.serviceName,
  };
  if (destinationImposee && ROUTES_DESTINATION_IMPOSEE.has(getRoutePath(endpoint))) {
    body.serviceIdDest = destinationImposee.serviceId;
    body.serviceNameDest = destinationImposee.serviceName;
  }
  if (
    getRoutePath(endpoint) === "prescriptions/medicale" &&
    !body.serviceIdDest
  ) {
    body.serviceIdDest =
      process.env.NEXT_PUBLIC_PHARMACY_SERVICE_ID || undefined;
    body.serviceNameDest = body.serviceNameDest ?? "Pharmacie";
  }
  const endpointPath = getRoutePath(endpoint);

  if (isRoute(endpointPath, "prescriptions/eeg")) {
    return {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      demandes: Array.isArray(body.demandes)
        ? (body.demandes as Array<Record<string, unknown>>).map((d) => ({
            ...d,
            typeEEG: EEG_TYPE_MAP[String(d.typeEEG)] ?? d.typeEEG,
          }))
        : body.demandes,
    };
  }

  if (isRoute(endpointPath, "prescriptions/anapath")) {
    return {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      demandes: Array.isArray(body.demandes)
        ? (body.demandes as Array<Record<string, unknown>>).map((d) => ({
            ...d,
            typeExamen: TAB_TO_ANAPATH[String(d.typeExamen)] ?? d.typeExamen,
          }))
        : body.demandes,
    };
  }

  // Dedicated imagerie routes - flat payloads for single exam
  if (endpointPath === "prescriptions/imagerie/scanner") {
    const normalized: Record<string, unknown> = {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      estHospitalise:
        typeof body.estHospitalise === "boolean"
          ? body.estHospitalise
          : body.statutPatient === "HOSPITALISE",
      serviceIdSource: body.serviceIdSource ?? body.serviceId,
      renseignements: body.renseignements ?? body.renseignement,
      notes: body.notes ?? body.remarques,
      questionRadio: body.questionRadio,
      lieuHosp: body.lieuHosp,
      serviceHosp: body.serviceHosp,
      moyenDeplacement: body.moyenDeplacement,
      // Scanner-specific fields (flat)
      type: body.scanType || body.type,
      glasgow: body.scanGlasgow || body.glasgow,
      agite: body.scanAgite || body.agite,
      allergie: body.scanAllergie || body.allergie,
      allergieDetail: body.scanAllergieDetail || body.allergieDetail,
      creatinine: body.scanCreatinine || body.creatinine,
      clearance: body.scanClearance || body.clearance,
      diabete: body.scanDiabete || body.diabete,
      precisions: body.scanPrecisions || body.precisions,
    };
    delete normalized.examens;
    delete normalized.statutPatient;
    delete normalized.serviceId;
    delete normalized.remarques;
    delete normalized.renseignement;
    delete normalized.scanType;
    delete normalized.scanGlasgow;
    delete normalized.scanAgite;
    delete normalized.scanAllergie;
    delete normalized.scanAllergieDetail;
    delete normalized.scanCreatinine;
    delete normalized.scanClearance;
    delete normalized.scanDiabete;
    delete normalized.scanPrecisions;
    return normalized;
  }

  if (endpointPath === "prescriptions/imagerie/echographie") {
    const normalized: Record<string, unknown> = {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      estHospitalise:
        typeof body.estHospitalise === "boolean"
          ? body.estHospitalise
          : body.statutPatient === "HOSPITALISE",
      serviceIdSource: body.serviceIdSource ?? body.serviceId,
      renseignements: body.renseignements ?? body.renseignement,
      notes: body.notes ?? body.remarques,
      questionRadio: body.questionRadio,
      lieuHosp: body.lieuHosp,
      serviceHosp: body.serviceHosp,
      moyenDeplacement: body.moyenDeplacement,
      // Échographie-specific fields (flat)
      type: body.echoType || body.type,
      doppler: body.echoDoppler || body.doppler,
      precisions: body.echoPrecisions || body.precisions,
    };
    delete normalized.examens;
    delete normalized.statutPatient;
    delete normalized.serviceId;
    delete normalized.remarques;
    delete normalized.renseignement;
    delete normalized.echoType;
    delete normalized.echoDoppler;
    delete normalized.echoPrecisions;
    return normalized;
  }

  if (endpointPath === "prescriptions/imagerie/radiographie") {
    const normalized: Record<string, unknown> = {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      estHospitalise:
        typeof body.estHospitalise === "boolean"
          ? body.estHospitalise
          : body.statutPatient === "HOSPITALISE",
      serviceIdSource: body.serviceIdSource ?? body.serviceId,
      renseignements: body.renseignements ?? body.renseignement,
      notes: body.notes ?? body.remarques,
      questionRadio: body.questionRadio,
      lieuHosp: body.lieuHosp,
      serviceHosp: body.serviceHosp,
      moyenDeplacement: body.moyenDeplacement,
      // Radiographie-specific fields (flat)
      type: body.rxType || body.type,
      incidences: body.rxIncidences || body.incidences,
      precisions: body.rxPrecisions || body.precisions,
    };
    delete normalized.examens;
    delete normalized.statutPatient;
    delete normalized.serviceId;
    delete normalized.remarques;
    delete normalized.renseignement;
    delete normalized.rxType;
    delete normalized.rxIncidences;
    delete normalized.rxPrecisions;
    return normalized;
  }

  if (endpointPath === "prescriptions/imagerie/geste-interventionnel") {
    const normalized: Record<string, unknown> = {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      estHospitalise:
        typeof body.estHospitalise === "boolean"
          ? body.estHospitalise
          : body.statutPatient === "HOSPITALISE",
      serviceIdSource: body.serviceIdSource ?? body.serviceId,
      renseignements: body.renseignements ?? body.renseignement,
      notes: body.notes ?? body.remarques,
      questionRadio: body.questionRadio,
      lieuHosp: body.lieuHosp,
      serviceHosp: body.serviceHosp,
      moyenDeplacement: body.moyenDeplacement,
      // Geste interventionnel-specific fields (flat)
      type: body.gesteType || body.type,
      precisions: body.gestePrecisions || body.precisions,
    };
    delete normalized.examens;
    delete normalized.statutPatient;
    delete normalized.serviceId;
    delete normalized.remarques;
    delete normalized.renseignement;
    delete normalized.gesteType;
    delete normalized.gestePrecisions;
    return normalized;
  }

  if (endpointPath === "prescriptions/imagerie/radio-speciale") {
    const normalized: Record<string, unknown> = {
      ...body,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      estHospitalise:
        typeof body.estHospitalise === "boolean"
          ? body.estHospitalise
          : body.statutPatient === "HOSPITALISE",
      serviceIdSource: body.serviceIdSource ?? body.serviceId,
      renseignements: body.renseignements ?? body.renseignement,
      notes: body.notes ?? body.remarques,
      questionRadio: body.questionRadio,
      lieuHosp: body.lieuHosp,
      serviceHosp: body.serviceHosp,
      moyenDeplacement: body.moyenDeplacement,
      // Radio spéciale-specific fields (flat)
      type: body.rxspType || body.type,
      preparation: body.rxspPrep || body.preparation,
      precisions: body.rxspPrecisions || body.precisions,
    };
    delete normalized.examens;
    delete normalized.statutPatient;
    delete normalized.serviceId;
    delete normalized.remarques;
    delete normalized.renseignement;
    delete normalized.rxspType;
    delete normalized.rxspPrep;
    delete normalized.rxspPrecisions;
    return normalized;
  }

  if (isRoute(endpointPath, "prescriptions/imagerie")) {
    const examens = Array.isArray(body.examens) ? body.examens : [];
    const firstExamen =
      (examens[0] as Record<string, unknown> | undefined) ?? body;
    const normalized: Record<string, unknown> = {
      ...body,
      ...firstExamen,
      urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
      estHospitalise:
        typeof body.estHospitalise === "boolean"
          ? body.estHospitalise
          : body.statutPatient === "HOSPITALISE",
      serviceIdSource: body.serviceIdSource ?? body.serviceId,
      renseignements: body.renseignements ?? body.renseignement,
      notes: body.notes ?? body.remarques,
      questionRadio: body.questionRadio,
      lieuHosp: body.lieuHosp,
      serviceHosp: body.serviceHosp,
      moyenDeplacement: body.moyenDeplacement,
    };

    delete normalized.examens;
    delete normalized.statutPatient;
    delete normalized.serviceId;
    delete normalized.remarques;
    delete normalized.renseignement;

    const groupedExamens: Record<string, unknown[]> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    examens.forEach((ex: any) => {
      const modality = String(ex.typeExamen ?? "").toLowerCase();
      let key = "radio";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let item: any = {
        type:
          ex.type ||
          ex.rxType ||
          ex.scanType ||
          ex.echoType ||
          ex.gesteType ||
          ex.rxspType,
      };

      const extractedType =
        ex.type ||
        ex.scanType ||
        ex.echoType ||
        ex.rxType ||
        ex.gesteType ||
        ex.rxspType;

      if (modality === "scan" || modality === "scanner") {
        key = "scanner";
        item = {
          type: extractedType,
          precisions: ex.scanPrecisions,
          glasgow: ex.scanGlasgow,
          agite: ex.scanAgite,
          allergie: ex.scanAllergie,
          allergieDetail: ex.scanAllergieDetail,
          creatinine: ex.scanCreatinine,
          clearance: ex.scanClearance,
          diabete: ex.scanDiabete,
        };
      } else if (modality === "echo" || modality === "echographie") {
        key = "echographie";
        item = {
          type: extractedType,
          doppler: ex.echoDoppler,
          precisions: ex.echoPrecisions,
        };
      } else if (modality === "rx" || modality === "radiographie") {
        key = "radio";
        item = {
          type: extractedType,
          incidences: ex.rxIncidences,
          precisions: ex.rxPrecisions,
        };
      } else if (modality === "geste" || modality === "geste-interventionnel") {
        key = "geste";
        item = {
          type: extractedType,
          precisions: ex.gestePrecisions,
        };
      } else if (modality === "rxsp" || modality === "radio-speciale") {
        key = "radioSpeciale";
        item = {
          type: extractedType,
          preparation: ex.rxspPrep,
          precisions: ex.rxspPrecisions,
        };
      }

      if (!groupedExamens[key]) groupedExamens[key] = [];
      groupedExamens[key].push(item);
    });

    if (examens.length === 0 && firstExamen.typeExamen) {
      const modality = String(firstExamen.typeExamen).toLowerCase();
      let key = "radio";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item: any = { type: firstExamen.type };
      if (modality === "scan" || modality === "scanner") {
        key = "scanner";
        item.glasgow = firstExamen.scanGlasgow;
        item.agite = firstExamen.scanAgite;
        item.allergie = firstExamen.scanAllergie;
        item.creatinine = firstExamen.scanCreatinine;
        item.clearance = firstExamen.scanClearance;
        item.diabete = firstExamen.scanDiabete;
      } else if (modality === "echo" || modality === "echographie") {
        key = "echographie";
        item.doppler = firstExamen.echoDoppler;
      } else if (modality === "geste" || modality === "geste-interventionnel") {
        key = "geste";
      } else if (modality === "rxsp" || modality === "radio-speciale") {
        key = "radioSpeciale";
        item.preparation = firstExamen.rxspPrep;
      }
      groupedExamens[key] = [item];
    }

    normalized.examens = groupedExamens;

    return normalized;
  }

  return {
    ...body,
    urgence: URGENCE_MAP[String(body.urgence)] ?? body.urgence,
  };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = "Erreur lors de la création de la prescription.";
    try {
      const error = await res.json();
      message = error.message || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export async function creerPrescriptionMedicale(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/medicale",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/medicale`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerOrdonnanceMedicale(
  prescriptionId: string,
  medicaments?: unknown[],
  kitId?: string,
  serviceIdDest?: string,
) {
  const payload: Record<string, unknown> = {};
  if (medicaments) payload.medicaments = medicaments;
  if (kitId) payload.kitId = kitId;
  if (serviceIdDest) payload.serviceIdDest = serviceIdDest;
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/${prescriptionId}/ordonnance`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(res);
}

export async function creerPrescriptionNonMedicale(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/non-medicale",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/non-medicale`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionSurveillance(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/surveillance",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/surveillance`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function getTypesParametreSurveillance(
  chuId?: string,
  serviceId?: string,
) {
  const params = new URLSearchParams();
  if (chuId) params.set("chuId", chuId);
  if (serviceId) params.set("serviceId", serviceId);
  const qs = params.toString();
  const res = await fetch(
    `${API_URL}/prescriptions/surveillance/types${qs ? "?" + qs : ""}`,
    {
      method: "GET",
      headers: headers(),
    },
  );
  return handleResponse(res);
}

export async function addTypeParametreSurveillance(
  valeur: string,
  prescripteurId?: string,
  chuId?: string,
  serviceId?: string,
) {
  const res = await fetch(`${API_URL}/prescriptions/surveillance/types`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ valeur, prescripteurId, chuId, serviceId }),
  });
  return handleResponse(res);
}

export async function removeTypeParametreSurveillance(id: string) {
  const res = await fetch(`${API_URL}/prescriptions/surveillance/types/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return handleResponse(res);
}

export async function creerPrescriptionTransfusion(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/transfusion",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/transfusion`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function fetchTypesProduitTransfusion(
  chuId?: string,
  serviceId?: string,
) {
  const params = new URLSearchParams();
  if (chuId) params.set("chuId", chuId);
  if (serviceId) params.set("serviceId", serviceId);
  const qs = params.toString();
  const res = await fetch(
    `${API_URL}/prescriptions/transfusion/types${qs ? "?" + qs : ""}`,
    {
      method: "GET",
      headers: headers(),
    },
  );
  return handleResponse(res);
}

export async function addTypeProduitTransfusion(
  valeur: string,
  prescripteurId?: string,
  chuId?: string,
  serviceId?: string,
) {
  const res = await fetch(`${API_URL}/prescriptions/transfusion/types`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ valeur, prescripteurId, chuId, serviceId }),
  });
  return handleResponse(res);
}

export async function removeTypeProduitTransfusion(id: string) {
  const res = await fetch(`${API_URL}/prescriptions/transfusion/types/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return handleResponse(res);
}

export async function creerPrescriptionBloc(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...normalizePayloadForEndpoint("/prescriptions/bloc", data),
    actes: body.actes,
  };
  const res = await fetch(`${API_URL}/prescriptions/bloc`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionLabo(data: unknown) {
  const mappedData = normalizePayloadForEndpoint("/prescriptions/labo", data);
  const res = await fetch(`${API_URL}/prescriptions/labo`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionImagerie(data: unknown) {
  const body = data as Record<string, unknown>;
  const endpoint = resolveImagerieEndpoint(body, "prescriptions/imagerie");
  const mappedData = normalizePayloadForEndpoint(endpoint, data);
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

// New dedicated imagerie routes
export async function creerPrescriptionScanner(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/imagerie/scanner",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/imagerie/scanner`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionEchographie(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/imagerie/echographie",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/imagerie/echographie`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionRadiographie(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/imagerie/radiographie",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/imagerie/radiographie`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionGesteInterventionnel(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/imagerie/geste-interventionnel",
    data,
  );
  const res = await fetch(
    `${API_URL}/prescriptions/imagerie/geste-interventionnel`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(mappedData),
    },
  );
  return handleResponse(res);
}

export async function creerPrescriptionRadioSpeciale(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/imagerie/radio-speciale",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/imagerie/radio-speciale`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapath(data: unknown) {
  const mappedData = normalizePayloadForEndpoint(
    "/prescriptions/anapath",
    data,
  );
  const res = await fetch(`${API_URL}/prescriptions/anapath`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

// New dedicated anapath routes
export async function creerPrescriptionAnapathFcvPap(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/fcv-pap`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapathCytoponction(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/cytoponction`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapathLiquide(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/liquide`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapathBiopsie(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/biopsie`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapathPos(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/pos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapathPoc(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/poc`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionAnapathExtemporane(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/anapath/extemporane-stat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionEEG(data: unknown) {
  const mappedData = normalizePayloadForEndpoint("/prescriptions/eeg", data);
  const res = await fetch(`${API_URL}/prescriptions/eeg`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionKine(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
    demandes: body.demandes,
  };
  const res = await fetch(`${API_URL}/prescriptions/kine`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function creerPrescriptionDialyse(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
  };
  const res = await fetch(`${API_URL}/prescriptions/dialyse`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function getCreneauxDialyse(date: string, chuId?: string) {
  const params = new URLSearchParams({ date });
  if (chuId) params.append("chuId", chuId);
  const res = await fetch(
    `${API_URL}/prescriptions/dialyse/creneaux?${params.toString()}`,
    { headers: headers() },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function creerPrescriptionEndoscopie(data: unknown) {
  const body = data as Record<string, unknown>;
  const mappedData = {
    ...body,
    urgence: URGENCE_MAP[body.urgence as string] ?? body.urgence,
    demandes: body.demandes,
  };
  const res = await fetch(`${API_URL}/prescriptions/endoscopie`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mappedData),
  });
  return handleResponse(res);
}

export async function getPrescriptionsPatient(type: string, patientId: string) {
  const res = await fetch(
    `${API_URL}/prescriptions/${type}/patient/${patientId}`,
    {
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur récupération prescriptions");
  return res.json();
}

export async function notifierInfirmierMedicale(prescriptionId: string) {
  const res = await fetch(
    `${API_URL}/notifications/medicale/${prescriptionId}`,
    {
      method: "POST",
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur notification");
  return res.json();
}

export async function notifierInfirmierNonMedicale(prescriptionId: string) {
  const res = await fetch(
    `${API_URL}/notifications/non-medicale/${prescriptionId}`,
    {
      method: "POST",
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur notification");
  return res.json();
}

export async function notifierInfirmierSurveillance(prescriptionId: string) {
  const res = await fetch(
    `${API_URL}/notifications/surveillance/${prescriptionId}`,
    {
      method: "POST",
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur notification");
  return res.json();
}

export async function updateStatutPrescription(
  type: string,
  id: string,
  statut: string,
) {
  const res = await fetch(`${API_URL}/prescriptions/${type}/${id}/statut`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ statut }),
  });
  if (!res.ok) throw new Error("Erreur mise à jour statut");
  return res.json();
}

export async function supprimerPrescription(type: string, id: string) {
  const res = await fetch(`${API_URL}/prescriptions/${type}/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Erreur suppression prescription");
  return res.json();
}

export type ArretKind =
  | "medicament"
  | "cocktail"
  | "itemNonMedical"
  | "parametreSurveillance"
  | "itemSoinInfirmier";

export async function arreterPlanningItem(
  kind: ArretKind,
  id: string,
  actionParId?: string,
  motif?: string,
) {
  const body = JSON.stringify({ actionParId, motif });
  const base = `${API_URL}/prescriptions`;
  let url: string;
  let method = "PUT";
  switch (kind) {
    case "medicament":
      url = `${base}/prises/medicament/${id}/arreter`;
      method = "POST";
      break;
    case "cocktail":
      url = `${base}/prises/cocktail/${id}/arreter`;
      method = "POST";
      break;
    case "itemNonMedical":
      url = `${base}/non-medicale/item/${id}/arreter`;
      break;
    case "parametreSurveillance":
      url = `${base}/surveillance/parametre/${id}/arreter`;
      break;
    case "itemSoinInfirmier":
      url = `${base}/soins-infirmier/item/${id}/arreter`;
      break;
  }
  const res = await fetch(url, { method, headers: headers(), body });
  if (!res.ok) throw new Error("Erreur lors de l'arrêt");
  const resultat = await res.json();
  notifierMajSoins({ reason: "arret-prescription" });
  return resultat;
}

export async function searchMedicaments(query: string) {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/medicaments/recherche?q=${encodeURIComponent(query)}`,
    {
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur recherche médicaments");
  return res.json();
}

export async function searchKits() {
  try {
    const res = await fetch(
      `${API_URL}/prescriptions/medicale/kits/recherche`,
      {
        headers: headers(),
      },
    );
    if (!res.ok) throw new Error("Erreur recherche kits");
    return res.json();
  } catch {
    return [];
  }
}

export async function getKitItems(kitId: string) {
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/kits/${kitId}/items`,
    {
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur récupération des items du kit");
  return res.json();
}

export async function updateEcgInterpretation(
  id: string,
  interpretation: string,
) {
  const res = await fetch(`${API_URL}/prescriptions/ecg/${id}/interpretation`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ interpretation }),
  });
  if (!res.ok) throw new Error("Erreur mise à jour de l'interprétation");
  return res.json();
}

export async function verifierEligibilitePremierSoin(prescriptionId: string) {
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/${prescriptionId}/premier-soin/eligibilite`,
    {
      headers: headers(),
    },
  );
  if (!res.ok) throw new Error("Erreur vérification éligibilité Premier Soin");
  return res.json();
}

export async function checkPremierSoinEligibility(
  patientId: string,
  chuId?: string,
  serviceId?: string,
) {
  const params = new URLSearchParams();
  params.append("patientId", patientId);
  if (chuId) params.append("chuId", chuId);
  if (serviceId) params.append("serviceId", serviceId);
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/premier-soin/eligible-patient?${params.toString()}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error("Erreur vérification éligibilité Premier Soin");
  return res.json() as Promise<{ eligible: boolean; motif?: string }>;
}

export async function creerPremierSoin(
  prescriptionId: string,
  medicamentIds?: string[],
) {
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/${prescriptionId}/premier-soin`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ medicamentIds }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Erreur création Premier Soin");
  }
  return res.json();
}

export async function getQuotaPremierSoin(
  patientId: string,
  chuId?: string,
  serviceId?: string,
) {
  const params = new URLSearchParams();
  if (chuId) params.append("chuId", chuId);
  if (serviceId) params.append("serviceId", serviceId);
  const qs = params.toString();
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/premier-soin/statut/${encodeURIComponent(patientId)}${qs ? `?${qs}` : ""}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error("Erreur récupération quota Premier Soin");
  const data = await res.json();
  return {
    used: data.montantConsomme ?? 0,
    remaining: data.montantRestant ?? 0,
    max: data.plafondTotal ?? 79000,
    eligible: data.eligible ?? true,
  } as { used: number; remaining: number; max: number; eligible: boolean };
}

export async function getHistoriquePremierSoin(patientId: string) {
  const res = await fetch(
    `${API_URL}/prescriptions/medicale/premier-soin/historique/${encodeURIComponent(patientId)}`,
    {
      headers: headers(),
    },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function getHistoriquePatient(
  patientId: string,
  filters?: {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    medicament?: string;
    examen?: string;
    periode?: string;
  },
) {
  const params = new URLSearchParams();
  if (filters?.type) params.append("type", filters.type);
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.medicament) params.append("medicament", filters.medicament);
  if (filters?.examen) params.append("examen", filters.examen);
  if (filters?.periode) params.append("periode", filters.periode);
  const qs = params.toString();
  const url = `${API_URL}/prescriptions/historique/patient/${encodeURIComponent(patientId)}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error("Erreur récupération historique");
  return res.json();
}

export async function fetchServicesByChu(chuId: string, type?: string) {
  const params = new URLSearchParams({ chuId });
  if (type) params.set("type", type);
  const res = await fetch(`${API_URL}/services?${params.toString()}`, {
    method: "GET",
    headers: headers(),
  });
  return handleResponse(res);
}

// ── LABO : ruptures de réactif ───────────────────────────────
export async function getAnalysesLaboEnRupture(chuId: string): Promise<string[]> {
  try {
    const params = new URLSearchParams();
    if (chuId) params.set('chuId', chuId);
    const res = await fetch(`${API_URL}/prescriptions/labo/ruptures?${params.toString()}`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Impossible de charger les ruptures de réactif:', error);
    return [];
  }
}
