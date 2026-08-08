"use client";

import { useState } from "react";
import type { ScoreSCCRE } from "@/types/bloc";

const criteria: Array<{
  key: keyof ScoreSCCRE;
  label: string;
  subLabel?: string;
  options: Array<{ value: number; label: string }>;
}> = [
  {
    key: "motricite",
    label: "Motricité",
    options: [
      { value: 2, label: "Bouge 4 membres" },
      { value: 1, label: "Bouge 2 membres" },
      { value: 0, label: "Immobile" },
    ],
  },
  {
    key: "respiration",
    label: "Respiration",
    options: [
      { value: 2, label: "Respire prof. + tousse" },
      { value: 1, label: "Dyspnée / respiration lim." },
      { value: 0, label: "Apnée" },
    ],
  },
  {
    key: "pression",
    label: "Pression artérielle",
    subLabel: "vs pré-op",
    options: [
      { value: 2, label: "≤ 20 mmHg" },
      { value: 1, label: "20–50 mmHg" },
      { value: 0, label: "≥ 50 mmHg" },
    ],
  },
  {
    key: "conscience",
    label: "État de conscience",
    options: [
      { value: 2, label: "Réveillé" },
      { value: 1, label: "Réveille à la demande" },
      { value: 0, label: "Ne répond pas" },
    ],
  },
  {
    key: "coloration",
    label: "Coloration",
    options: [
      { value: 2, label: "Normale" },
      { value: 1, label: "Pâle / grisâtre" },
      { value: 0, label: "Cyanose" },
    ],
  },
];

export default function ScoreSCCRE() {
  const [scores, setScores] = useState<ScoreSCCRE>({
    motricite: 2,
    respiration: 2,
    pression: 2,
    conscience: 2,
    coloration: 1,
  });

  const scoreTotal = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const scoreClass = scoreTotal >= 9 ? "text-secondary" : "text-tertiary";

  const handleSelect = (key: keyof ScoreSCCRE, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-white/40">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined">clinical_notes</span>
          </div>
          <div>
            <h2 className="font-manrope font-bold text-lg text-primary">Score de réveil (SCCRE)</h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">monitoring</span>
            Surveillance
          </button>
          <div className="text-right">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Score total</div>
            <div className={`text-3xl font-black ${scoreClass}`}>
              {scoreTotal}
              <span className="text-sm text-outline">/10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {criteria.map((criterion, index) => {
          const isLast = index === criteria.length - 1;
          return (
            <div
              key={criterion.key}
              className={`grid grid-cols-12 items-center py-3 ${!isLast ? "border-b border-surface-container-low" : ""}`}
            >
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-on-surface">{criterion.label}</p>
                  {criterion.subLabel ? (
                    <span className="text-[11px] italic text-on-surface-variant">{criterion.subLabel}</span>
                  ) : null}
                </div>
              </div>
              <div className="col-span-8 flex space-x-2">
                {criterion.options.map((option) => {
                  const selected = scores[criterion.key] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(criterion.key, option.value)}
                      className={`flex-1 py-3 px-1 rounded-lg text-[10px] font-bold transition-all ${
                        selected
                          ? "bg-primary text-white shadow-md"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
