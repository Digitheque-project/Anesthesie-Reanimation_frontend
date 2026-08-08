"use client";

import { useState } from "react";

export default function EvaluationDouleur() {
  const [evs, setEvs] = useState<number>(2);
  const [eqa, setEqa] = useState<number>(1);
  const [eva, setEva] = useState<number>(3);

  const buttonClass = (selected: boolean) =>
    selected
      ? "flex-1 py-2 px-3 rounded-lg border-2 border-primary bg-primary/10 text-xs font-bold text-primary"
      : "flex-1 py-2 px-3 rounded-lg border border-surface-dim/30 bg-surface-container-low text-xs font-bold hover:bg-primary/10 hover:border-primary/50";

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-white/40">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary">thermostat</span>
        <h2 className="text-sm uppercase text-primary font-bold">Évaluation de la Douleur</h2>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">EVS (Échelle Verbale Simple)</label>
          <div className="flex space-x-2">
            <button type="button" onClick={() => setEvs(1)} className={buttonClass(evs === 1)}>
              Aucune (1)
            </button>
            <button type="button" onClick={() => setEvs(2)} className={buttonClass(evs === 2)}>
              Modérée (2)
            </button>
            <button type="button" onClick={() => setEvs(3)} className={buttonClass(evs === 3)}>
              Intense (3)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">EQA (Qualité analgésie)</label>
          <div className="flex space-x-2">
            <button type="button" onClick={() => setEqa(1)} className={buttonClass(eqa === 1)}>
              Calme (1)
            </button>
            <button type="button" onClick={() => setEqa(2)} className={buttonClass(eqa === 2)}>
              Agité (2)
            </button>
            <button type="button" onClick={() => setEqa(3)} className={buttonClass(eqa === 3)}>
              Plaintes (3)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">EVA (Échelle Visuelle Analogique)</label>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/20">
              Score: {eva}/10
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={eva}
            onChange={(event) => setEva(Number(event.target.value))}
            className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between px-1 text-[10px] text-on-surface-variant font-medium">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>
    </div>
  );
}
