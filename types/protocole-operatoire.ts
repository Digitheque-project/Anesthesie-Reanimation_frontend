export interface SurveillanceItem {
  checked: boolean;
  value: string;
}

export interface ProtocoleData {
  protocole: string;
  surveillance: {
    ta: SurveillanceItem;
    pouls: SurveillanceItem;
    fr: SurveillanceItem;
    temperature: SurveillanceItem;
    diurese: SurveillanceItem;
    autres: SurveillanceItem;
  };
  drainages: {
    naso: string | null;
    crane: string | null;
    thorax: string | null;
    abdomenG: string | null;
    abdomenD: string | null;
  };
  perfusions: {
    brasG: boolean;
    brasD: boolean;
    voieCentrale: boolean;
  };
  traitements: {
    antibiotiques: string;
    antalgiques: string;
    autres: string;
  };
  timestamp: string;
}
