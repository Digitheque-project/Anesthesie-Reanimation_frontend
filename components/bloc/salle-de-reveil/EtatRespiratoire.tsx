"use client";

import { useState } from "react";

export default function EtatRespiratoire() {
  const [etatRespiratoire, setEtatRespiratoire] = useState({
    initIntub: false,
    initCurar: false,
    respIntub: false,
    respCurar: false,
  });

  const toggle = (field: keyof typeof etatRespiratoire) => {
    setEtatRespiratoire((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-white/40">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary">air</span>
        <h2 className="text-sm uppercase tracking-tight text-primary font-bold">État respiratoire / Neuromusculaire</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <p className="text-sm font-bold text-on-surface">État initial</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center p-3 rounded-lg bg-surface-container-low border border-surface-dim/20">
              <input
                id="init-intub"
                type="checkbox"
                checked={etatRespiratoire.initIntub}
                onChange={() => toggle("initIntub")}
                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
              />
              <label htmlFor="init-intub" className="ml-3 text-sm font-medium text-on-surface">
                Intubation
              </label>
            </div>
            <div className="flex items-center p-3 rounded-lg bg-surface-container-low border border-surface-dim/20">
              <input
                id="init-curar"
                type="checkbox"
                checked={etatRespiratoire.initCurar}
                onChange={() => toggle("initCurar")}
                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
              />
              <label htmlFor="init-curar" className="ml-3 text-sm font-medium text-on-surface">
                Curarisation
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <p className="text-sm font-bold text-on-surface">Réponse</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center p-3 rounded-lg bg-surface-container-low border border-surface-dim/20">
              <input
                id="resp-intub"
                type="checkbox"
                checked={etatRespiratoire.respIntub}
                onChange={() => toggle("respIntub")}
                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
              />
              <label htmlFor="resp-intub" className="ml-3 text-sm font-medium text-on-surface">
                Intubation
              </label>
            </div>
            <div className="flex items-center p-3 rounded-lg bg-surface-container-low border border-surface-dim/20">
              <input
                id="resp-curar"
                type="checkbox"
                checked={etatRespiratoire.respCurar}
                onChange={() => toggle("respCurar")}
                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
              />
              <label htmlFor="resp-curar" className="ml-3 text-sm font-medium text-on-surface">
                Curarisation
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
