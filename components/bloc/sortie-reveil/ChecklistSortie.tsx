"use client";

import { useState } from "react";

export default function ChecklistSortie() {
  const [checks, setChecks] = useState({
    signesVitaux: true,
    douleurControlee: true,
    prescriptionsFaites: false,
    familleInformee: false,
  });

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalValides = Object.values(checks).filter(Boolean).length;

  const items = [
    { key: "signesVitaux" as const, label: "Signes vitaux stables", sublabel: "(dernière prise: 14:00)" },
    { key: "douleurControlee" as const, label: "Douleur contrôlée (EVA < 3)", sublabel: null },
    { key: "prescriptionsFaites" as const, label: "Prescriptions post-op rédigées", sublabel: null },
    { key: "familleInformee" as const, label: "Famille / accompagnant informé(e)", sublabel: null },
  ];

  return (
    <div className="bg-surface-container-low/50 p-8 rounded-xl h-full border border-surface-variant/20">
      <h4 className="text-xs font-bold text-on-surface uppercase tracking-[0.2em] mb-6">
        CHECKLIST DE SORTIE
      </h4>

      <ul className="space-y-6">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-4">
            <span
              className="material-symbols-outlined text-xl cursor-pointer transition-colors flex-shrink-0"
              style={{
                fontVariationSettings: checks[item.key] ? "'FILL' 1" : "'FILL' 0",
                color: checks[item.key] ? "#006a6a" : "#727783",
              }}
              onClick={() => toggleCheck(item.key)}
            >
              {checks[item.key] ? "check_circle" : "radio_button_unchecked"}
            </span>
            <div>
              <p className={`text-sm font-semibold ${checks[item.key] ? "text-on-surface" : "text-on-surface-variant"}`}>
                {item.label}
              </p>
              {item.sublabel && <p className="text-xs text-on-surface-variant mt-0.5">{item.sublabel}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 pt-4 border-t border-surface-variant/30">
        <p className="text-xs text-on-surface-variant font-medium">{totalValides} / 4 éléments validés</p>
        <div className="w-full bg-surface-dim h-1.5 rounded-full mt-2">
          <div
            className="bg-secondary h-full rounded-full transition-all duration-300"
            style={{ width: `${(totalValides / 4) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
