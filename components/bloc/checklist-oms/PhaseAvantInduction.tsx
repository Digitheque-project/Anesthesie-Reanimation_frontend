"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ChecklistData } from "./types";

type RadioValue = "oui" | "non" | "na" | null;

function RadioGroup({
  name,
  value,
  onChange,
  options = [
    { value: "oui", label: "Oui" },
    { value: "non", label: "Non" },
  ],
  critical = false,
}: {
  name: string;
  value: RadioValue;
  onChange: (value: RadioValue) => void;
  options?: { value: Exclude<RadioValue, null>; label: string }[];
  critical?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {options.map((option) => (
        <label
          key={option.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className={critical ? "size-4 accent-error" : "size-4 accent-primary"}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function CheckboxYesNo({
  label,
  oui,
  non,
  setOui,
  setNon,
  critical = false,
}: {
  label: string;
  oui: boolean;
  non: boolean;
  setOui: (value: boolean) => void;
  setNon: (value: boolean) => void;
  critical?: boolean;
}) {
  const accentClass = critical ? "accent-error" : "accent-primary";

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant/10 bg-white p-3">
      <p className="text-sm font-medium leading-relaxed text-on-surface">{label}</p>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface">
          <input
            type="checkbox"
            checked={oui}
            onChange={(event) => setOui(event.target.checked)}
            className={`size-4 ${accentClass}`}
          />
          Oui
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-on-surface">
          <input
            type="checkbox"
            checked={non}
            onChange={(event) => setNon(event.target.checked)}
            className={`size-4 ${accentClass}`}
          />
          Non
        </label>
      </div>
    </div>
  );
}

function booleanPairToRadio(value: { oui: boolean | null; non: boolean | null }) {
  if (value.oui) return "oui";
  if (value.non) return "non";
  return null;
}

function nullableBooleanToRadio(value: boolean | null) {
  if (value === true) return "oui";
  if (value === false) return "non";
  return null;
}

function radioToBooleanPair(value: RadioValue) {
  return {
    oui: value === "oui" ? true : value === "non" ? false : null,
    non: value === "non" ? true : value === "oui" ? false : null,
  };
}

function installationToRadio(value: { oui: boolean | null; na: boolean | null }) {
  if (value.oui) return "oui";
  if (value.na) return "na";
  return null;
}

function radioToInstallation(value: RadioValue) {
  return {
    oui: value === "oui" ? true : value === "na" ? false : null,
    na: value === "na" ? true : value === "oui" ? false : null,
  };
}

export default function PhaseAvantInduction({
  data,
  setChecklistData,
}: {
  data: ChecklistData["phase1"];
  setChecklistData: Dispatch<SetStateAction<ChecklistData>>;
}) {
  const updatePhase1 = (phase1: ChecklistData["phase1"]) => {
    setChecklistData((current) => ({ ...current, phase1 }));
  };

  const updateMateriel = (
    field: keyof ChecklistData["phase1"]["materiel"],
    value: boolean,
  ) => {
    const pairField =
      field === "chirOui"
        ? "chirNon"
        : field === "chirNon"
          ? "chirOui"
          : field === "anesOui"
            ? "anesNon"
            : "anesOui";

    updatePhase1({
      ...data,
      materiel: {
        ...data.materiel,
        [field]: value,
        [pairField]: value ? false : data.materiel[pairField],
      },
    });
  };

  const updateVerificationCroisee = (
    id: keyof ChecklistData["phase1"]["verificationCroisee"],
    field: "oui" | "non",
    value: boolean,
  ) => {
    updatePhase1({
      ...data,
      verificationCroisee: {
        ...data.verificationCroisee,
        [id]: {
          ...data.verificationCroisee[id],
          [field]: value,
          [field === "oui" ? "non" : "oui"]: value
            ? false
            : data.verificationCroisee[id][field === "oui" ? "non" : "oui"],
        },
      },
    });
  };

  return (
    <section className="rounded-xl border-t-4 border-primary bg-surface-container-low p-6 shadow-sm">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            timer_10_alt_1
          </span>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wide text-primary">
          Avant Induction Anesthésique
        </h2>
      </div>
      <p className="mb-6 text-xs italic text-on-surface-variant">
        Temps de pause avant anesthésie
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border border-outline-variant/10 bg-white p-4">
          <p className="mb-2 text-sm font-bold text-primary">
            1- Identité du patient :
          </p>
          <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">
            - le patient a décliné son nom. Sinon par défaut, autre moyen de
            vérification de son identité
          </p>
          <RadioGroup
            name="identite-patient"
            value={booleanPairToRadio(data.identite)}
            onChange={(value) =>
              updatePhase1({ ...data, identite: radioToBooleanPair(value) })
            }
          />
        </div>

        <div className="space-y-4 rounded-lg border border-outline-variant/10 bg-white p-4">
          <h3 className="text-sm font-bold text-primary">
            2- L'intervention et site opératoire sont confirmés :
          </h3>
          <div>
            <p className="mb-2 text-xs leading-relaxed text-on-surface-variant">
              - Idéalement par le patient et dans tous les cas, par le dossier
              ou procédure spécifique
            </p>
            <RadioGroup
              name="site-confirme"
              value={nullableBooleanToRadio(data.interventionSite.patientConfirm)}
              onChange={(value) =>
                updatePhase1({
                  ...data,
                  interventionSite: {
                    ...data.interventionSite,
                    patientConfirm: value === "oui" ? true : value === "non" ? false : null,
                  },
                })
              }
            />
          </div>
          <div>
            <p className="mb-2 text-xs leading-relaxed text-on-surface-variant">
              - La documentation clinique et para-clinique nécessaire est
              disponible en salle
            </p>
            <RadioGroup
              name="documentation-disponible"
              value={nullableBooleanToRadio(data.interventionSite.docsDispo)}
              onChange={(value) =>
                updatePhase1({
                  ...data,
                  interventionSite: {
                    ...data.interventionSite,
                    docsDispo: value === "oui" ? true : value === "non" ? false : null,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant/10 bg-white p-4">
          <p className="mb-2 text-sm font-bold text-primary">
            3- Le mode d'installation est :
          </p>
          <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">
            Connu de l'équipe en salle. Caché/réel avec le site /intervention et non
            dangereuse pour le patient
          </p>
          <RadioGroup
            name="mode-installation"
            value={installationToRadio(data.installation)}
            onChange={(value) =>
              updatePhase1({ ...data, installation: radioToInstallation(value) })
            }
            options={[
              { value: "oui", label: "Oui" },
              { value: "na", label: "N/A" },
            ]}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-outline-variant/10 bg-white p-4">
          <h3 className="text-sm font-bold text-primary">
            4- Le matériel nécessaire pour l'intervention est vérifié :
          </h3>
          <CheckboxYesNo
            label="- pour la partie chirurgicale..."
            oui={data.materiel.chirOui}
            non={data.materiel.chirNon}
            setOui={(value) => updateMateriel("chirOui", value)}
            setNon={(value) => updateMateriel("chirNon", value)}
          />
          <CheckboxYesNo
            label="- pour la partie anesthésique"
            oui={data.materiel.anesOui}
            non={data.materiel.anesNon}
            setOui={(value) => updateMateriel("anesOui", value)}
            setNon={(value) => updateMateriel("anesNon", value)}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-error/20 bg-white p-4">
          <h3 className="text-sm font-bold text-error">
            5- Vérification croisée par l'équipe :
          </h3>
          <p className="text-[10px] font-bold uppercase text-on-surface-variant/70">
            Points critiques et mesures adéquates à prendre
          </p>
          <CheckboxYesNo
            label="- Allergie du patient"
            oui={data.verificationCroisee.allergie.oui}
            non={data.verificationCroisee.allergie.non}
            setOui={(value) =>
              updateVerificationCroisee("allergie", "oui", value)
            }
            setNon={(value) =>
              updateVerificationCroisee("allergie", "non", value)
            }
            critical
          />
          <CheckboxYesNo
            label="- Risque d'inhalation, de difficulté d'intubation ou de ventilation au masque"
            oui={data.verificationCroisee.risqueIntubation.oui}
            non={data.verificationCroisee.risqueIntubation.non}
            setOui={(value) =>
              updateVerificationCroisee("risqueIntubation", "oui", value)
            }
            setNon={(value) =>
              updateVerificationCroisee("risqueIntubation", "non", value)
            }
            critical
          />
          <CheckboxYesNo
            label="- Risque de saignement important"
            oui={data.verificationCroisee.risqueSaignement.oui}
            non={data.verificationCroisee.risqueSaignement.non}
            setOui={(value) =>
              updateVerificationCroisee("risqueSaignement", "oui", value)
            }
            setNon={(value) =>
              updateVerificationCroisee("risqueSaignement", "non", value)
            }
            critical
          />
        </div>
      </div>
    </section>
  );
}
