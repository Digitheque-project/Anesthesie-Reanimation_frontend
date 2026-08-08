export interface ChecklistData {
  phase1: {
    identite: { oui: boolean | null; non: boolean | null };
    interventionSite: {
      patientConfirm: boolean | null;
      docsDispo: boolean | null;
    };
    installation: { oui: boolean | null; na: boolean | null };
    materiel: {
      chirOui: boolean;
      chirNon: boolean;
      anesOui: boolean;
      anesNon: boolean;
    };
    verificationCroisee: {
      allergie: { oui: boolean; non: boolean };
      risqueIntubation: { oui: boolean; non: boolean };
      risqueSaignement: { oui: boolean; non: boolean };
    };
  };
  phase2: {
    verificationUltime: {
      identitePatient: { oui: boolean; non: boolean };
      interventionPrevue: { oui: boolean; non: boolean };
      siteOperatoire: { oui: boolean; non: boolean };
      installation: { oui: boolean; non: boolean };
      documentsDisponibles: { oui: boolean; non: boolean };
    };
    partageInfos: {
      planChirurgical: { oui: boolean | null; non: boolean | null; notes: string };
      planAnesthesique: { oui: boolean | null; non: boolean | null; notes: string };
      ideIbode: { oui: boolean | null; non: boolean | null; notes: string };
    };
    antibio: { oui: boolean | null; non: boolean | null };
  };
}

export const DEFAULT_CHECKLIST_DATA: ChecklistData = {
  phase1: {
    identite: { oui: null, non: null },
    interventionSite: {
      patientConfirm: null,
      docsDispo: null,
    },
    installation: { oui: null, na: null },
    materiel: {
      chirOui: false,
      chirNon: false,
      anesOui: false,
      anesNon: false,
    },
    verificationCroisee: {
      allergie: { oui: false, non: false },
      risqueIntubation: { oui: false, non: false },
      risqueSaignement: { oui: false, non: false },
    },
  },
  phase2: {
    verificationUltime: {
      identitePatient: { oui: false, non: false },
      interventionPrevue: { oui: false, non: false },
      siteOperatoire: { oui: false, non: false },
      installation: { oui: false, non: false },
      documentsDisponibles: { oui: false, non: false },
    },
    partageInfos: {
      planChirurgical: { oui: null, non: null, notes: "" },
      planAnesthesique: { oui: null, non: null, notes: "" },
      ideIbode: { oui: null, non: null, notes: "" },
    },
    antibio: { oui: null, non: null },
  },
};
