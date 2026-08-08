"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ChecklistData } from "./types";

type RadioValue = "oui" | "non" | null;

function CheckboxYesNo({
  label,
  oui,
  non,
  setOui,
  setNon,
}: {
  label: string;
  oui: boolean;
  non: boolean;
  setOui: (value: boolean) => void;
  setNon: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-outline-variant/10 bg-white p-3">
      <p className="text-sm font-medium leading-relaxed text-on-surface">{label}</p>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface">
          <input
            type="checkbox"
            checked={oui}
            onChange={(event) => setOui(event.target.checked)}
            className="size-4 accent-secondary"
          />
          Oui
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface">
          <input
            type="checkbox"
            checked={non}
            onChange={(event) => setNon(event.target.checked)}
            className="size-4 accent-secondary"
          />
          Non
        </label>
      </div>
    </div>
  );
}

function RadioGroup({
  name,
  value,
  onChange,
}: {
  name: string;
  value: RadioValue;
  onChange: (value: RadioValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface">
        <input
          type="radio"
          name={name}
          value="oui"
          checked={value === "oui"}
          onChange={() => onChange("oui")}
          className="size-4 accent-secondary"
        />
        Oui
      </label>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface">
        <input
          type="radio"
          name={name}
          value="non"
          checked={value === "non"}
          onChange={() => onChange("non")}
          className="size-4 accent-secondary"
        />
        Non
      </label>
    </div>
  );
}

function InformationSection({
  title,
  description,
  radioName,
  value,
  onRadioChange,
  notes,
  onNotesChange,
  placeholder,
  titleClassName = "text-secondary",
  focusClassName = "focus:ring-secondary",
}: {
  title: string;
  description: string;
  radioName: string;
  value: RadioValue;
  onRadioChange: (value: RadioValue) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  placeholder: string;
  titleClassName?: string;
  focusClassName?: string;
}) {
  return (
    <div className="space-y-3 rounded-lg bg-surface p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className={`text-xs font-bold ${titleClassName}`}>{title}</h4>
          <p className="mt-1 text-[9px] italic text-on-surface-variant">
            {description}
          </p>
        </div>
        <RadioGroup name={radioName} value={value} onChange={onRadioChange} />
      </div>
      <textarea
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`w-full resize-none rounded-md border border-outline-variant/20 bg-white p-2 text-sm text-on-surface outline-none transition focus:ring-1 ${focusClassName}`}
      />
    </div>
  );
}

function booleanPairToRadio(value: { oui: boolean | null; non: boolean | null }) {
  if (value.oui) return "oui";
  if (value.non) return "non";
  return null;
}

function radioToBooleanPair(value: RadioValue) {
  return {
    oui: value === "oui" ? true : value === "non" ? false : null,
    non: value === "non" ? true : value === "oui" ? false : null,
  };
}

export default function PhaseAvantIntervention({
  data,
  setChecklistData,
}: {
  data: ChecklistData["phase2"];
  setChecklistData: Dispatch<SetStateAction<ChecklistData>>;
}) {
  const updatePhase2 = (phase2: ChecklistData["phase2"]) => {
    setChecklistData((current) => ({ ...current, phase2 }));
  };

  const setVerification = (
    id: keyof ChecklistData["phase2"]["verificationUltime"],
    field: "oui" | "non",
    value: boolean,
  ) => {
    updatePhase2({
      ...data,
      verificationUltime: {
        ...data.verificationUltime,
        [id]: {
          ...data.verificationUltime[id],
          [field]: value,
          [field === "oui" ? "non" : "oui"]: value
            ? false
            : data.verificationUltime[id][field === "oui" ? "non" : "oui"],
        },
      },
    });
  };

  const updatePartageInfos = (
    id: keyof ChecklistData["phase2"]["partageInfos"],
    value: Partial<ChecklistData["phase2"]["partageInfos"][typeof id]>,
  ) => {
    updatePhase2({
      ...data,
      partageInfos: {
        ...data.partageInfos,
        [id]: {
          ...data.partageInfos[id],
          ...value,
        },
      },
    });
  };

  return (
    <section className="rounded-xl border-t-4 border-secondary bg-surface-container-low p-6 shadow-sm">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            pause_circle
          </span>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wide text-secondary">
          Avant Intervention Chirurgicale
        </h2>
      </div>
      <p className="mb-6 text-xs italic text-on-surface-variant">
        Temps de pause avant incision
      </p>

      <div className="space-y-4">
        <div className="space-y-4 rounded-lg border border-outline-variant/10 bg-white p-4">
          <h3 className="text-sm font-bold text-secondary">
            6- Vérification « ultime » croisée au sein de l'équipe :
          </h3>
          <CheckboxYesNo
            label="- Identité patient correct"
            oui={data.verificationUltime.identitePatient.oui}
            non={data.verificationUltime.identitePatient.non}
            setOui={(value) => setVerification("identitePatient", "oui", value)}
            setNon={(value) => setVerification("identitePatient", "non", value)}
          />
          <CheckboxYesNo
            label="- Intervention prévue confirmée"
            oui={data.verificationUltime.interventionPrevue.oui}
            non={data.verificationUltime.interventionPrevue.non}
            setOui={(value) =>
              setVerification("interventionPrevue", "oui", value)
            }
            setNon={(value) =>
              setVerification("interventionPrevue", "non", value)
            }
          />
          <CheckboxYesNo
            label="- Site opératoire"
            oui={data.verificationUltime.siteOperatoire.oui}
            non={data.verificationUltime.siteOperatoire.non}
            setOui={(value) => setVerification("siteOperatoire", "oui", value)}
            setNon={(value) => setVerification("siteOperatoire", "non", value)}
          />
          <CheckboxYesNo
            label="- Installation correct"
            oui={data.verificationUltime.installation.oui}
            non={data.verificationUltime.installation.non}
            setOui={(value) => setVerification("installation", "oui", value)}
            setNon={(value) => setVerification("installation", "non", value)}
          />
          <CheckboxYesNo
            label="- Documents nécessaires disponibles"
            oui={data.verificationUltime.documentsDisponibles.oui}
            non={data.verificationUltime.documentsDisponibles.non}
            setOui={(value) =>
              setVerification("documentsDisponibles", "oui", value)
            }
            setNon={(value) =>
              setVerification("documentsDisponibles", "non", value)
            }
          />
        </div>

        <div className="space-y-4 rounded-lg border border-outline-variant/10 bg-white p-4">
          <div>
            <h3 className="text-sm font-bold text-secondary">
              7- Partage des informations
            </h3>
            <p className="mt-1 text-xs italic leading-relaxed text-on-surface-variant">
              Essentielles dans l'équipe sur des éléments à risque/points
              critiques de l'intervention
            </p>
          </div>

          <InformationSection
            title="- Sur le plan chirurgical"
            description="(temps opération difficile, points spécifiques de l'intervention......)"
            radioName="plan-chirurgical"
            value={booleanPairToRadio(data.partageInfos.planChirurgical)}
            onRadioChange={(value) =>
              updatePartageInfos("planChirurgical", radioToBooleanPair(value))
            }
            notes={data.partageInfos.planChirurgical.notes}
            onNotesChange={(notes) =>
              updatePartageInfos("planChirurgical", { notes })
            }
            placeholder="Notes chirurgie..."
            titleClassName="text-primary"
            focusClassName="focus:ring-primary"
          />
          <InformationSection
            title="- Sur le plan anesthésique"
            description="(risques potentiels liés au terrain ou à des traitements éventuellement maintenus)"
            radioName="plan-anesthesique"
            value={booleanPairToRadio(data.partageInfos.planAnesthesique)}
            onRadioChange={(value) =>
              updatePartageInfos("planAnesthesique", radioToBooleanPair(value))
            }
            notes={data.partageInfos.planAnesthesique.notes}
            onNotesChange={(notes) =>
              updatePartageInfos("planAnesthesique", { notes })
            }
            placeholder="Notes anesthésie..."
          />
          <InformationSection
            title="- IDE / IBODE"
            description="(stérilité confirmée, matériel disponible, préoccupations ?)"
            radioName="plan-ide-ibode"
            value={booleanPairToRadio(data.partageInfos.ideIbode)}
            onRadioChange={(value) =>
              updatePartageInfos("ideIbode", radioToBooleanPair(value))
            }
            notes={data.partageInfos.ideIbode.notes}
            onNotesChange={(notes) => updatePartageInfos("ideIbode", { notes })}
            placeholder="Notes IDE/IBODE..."
            titleClassName="text-on-surface-variant"
            focusClassName="focus:ring-outline-variant"
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-secondary">
            8- Antibioprophylaxie effectuée
          </p>
          <RadioGroup
            name="antibioprophylaxie"
            value={booleanPairToRadio(data.antibio)}
            onChange={(value) =>
              updatePhase2({ ...data, antibio: radioToBooleanPair(value) })
            }
          />
        </div>
      </div>
    </section>
  );
}
