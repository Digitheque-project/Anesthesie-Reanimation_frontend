"use client";

import { useState } from "react";
import { ServiceDestination } from "@/types/bloc";

export default function OrientationPatient({
  services,
}: {
  services: ServiceDestination[];
}) {
  const [versOrigine, setVersOrigine] = useState(false);
  const [autreService, setAutreService] = useState("");
  const [servicesAjoutes, setServicesAjoutes] = useState<string[]>([]);

  return (
    <div className="bg-white p-8 shadow-sm rounded-xl">
      <h4 className="text-lg font-bold text-primary mb-8 flex items-center gap-3 font-headline">
        <span className="material-symbols-outlined">move_item</span>
        ORIENTATION DU PATIENT
      </h4>

      <div className="space-y-4">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => setVersOrigine(!versOrigine)}
        >
          <div
            className={`w-6 h-6 border-2 rounded-sm flex items-center justify-center transition-all ${
              versOrigine
                ? "bg-primary border-primary"
                : "border-outline-variant hover:border-primary"
            }`}
          >
            {versOrigine && (
              <span
                className="material-symbols-outlined text-white text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check
              </span>
            )}
          </div>
          <label className="text-on-surface font-bold text-xl cursor-pointer font-headline">
            Service d'origine
          </label>
        </div>

        {versOrigine && (
          <div className="ml-10 flex items-center gap-2 text-secondary text-sm font-bold">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            Patient orienté vers le service d'origine
          </div>
        )}
      </div>

      <div className="p-8 bg-surface-container-low/50 rounded-xl mt-6">
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-4 block">
          Autres services de destination
        </label>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <select
              value={autreService}
              onChange={(e) => setAutreService(e.target.value)}
              className="w-full bg-white border border-outline-variant py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary appearance-none rounded-sm"
            >
              <option value="">Sélectionner un service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
              expand_more
            </span>
          </div>

          <button
            onClick={() => {
              if (autreService && !servicesAjoutes.includes(autreService)) {
                setServicesAjoutes([...servicesAjoutes, autreService]);
                setAutreService("");
              }
            }}
            className="bg-primary text-white px-8 py-4 font-bold flex items-center gap-3 hover:bg-primary/90 transition-all rounded-sm uppercase tracking-wide"
          >
            <span className="material-symbols-outlined">add</span>
            AJOUTER
          </button>
        </div>

        {servicesAjoutes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {servicesAjoutes.map((service, index) => (
              <span
                key={index}
                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold"
              >
                <span className="material-symbols-outlined text-sm">
                  local_hospital
                </span>
                {service}
                <button
                  onClick={() =>
                    setServicesAjoutes(
                      servicesAjoutes.filter((_, i) => i !== index)
                    )
                  }
                  className="ml-1 hover:text-tertiary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
