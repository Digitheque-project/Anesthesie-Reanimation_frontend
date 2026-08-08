"use client";

import { FiltresPatient } from "@/types/bloc";
import { useState } from "react";

interface PatientFiltersProps {
  onFilterChange: (filtres: FiltresPatient) => void;
  date: string;
  onDateChange: (date: string) => void;
}

// Liste courante de spécialités chirurgicales pour le filtre "Type d'intervention" — le champ
// typeChirurgie est du texte libre côté backend (pas d'enum), ce filtre reste donc indicatif
// et compare une correspondance exacte sur les valeurs les plus fréquentes.
const SPECIALITES = [
  'Chirurgie générale',
  'Chirurgie digestive',
  'Chirurgie orthopédique',
  'Chirurgie urologique',
  'Chirurgie gynécologique',
  'Chirurgie ORL',
  'Chirurgie ophtalmologique',
  'Neurochirurgie',
  'Chirurgie cardiaque',
  'Chirurgie thoracique',
  'Chirurgie vasculaire',
  'Chirurgie plastique et réparatrice',
  'Chirurgie pédiatrique',
  'Chirurgie maxillo-faciale',
  'Stomatologie',
  'Chirurgie dentaire',
];

export default function PatientFilters({ onFilterChange, date, onDateChange }: PatientFiltersProps) {
  const [filtres, setFiltres] = useState<FiltresPatient>({
    statut: '', specialite: '', recherche: '', sexe: '', heureDebut: '', heureFin: '',
  });

  const patch = (next: Partial<FiltresPatient>) => {
    const merged = { ...filtres, ...next };
    setFiltres(merged);
    onFilterChange(merged);
  };

  return (
    <div className="flex flex-col gap-4 bg-surface-container-low p-5 rounded-2xl mb-6 border border-outline-variant/10 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Sélecteur de date — navigation dans le programme opératoire, pas figé sur "aujourd'hui" */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">
            Date du programme
          </label>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-outline-variant/20 shadow-sm min-w-[200px]">
            <span className="material-symbols-outlined text-primary text-xl">
              calendar_month
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-sm font-bold text-on-surface bg-transparent border-none outline-none cursor-pointer"
            />
            {date !== new Date().toISOString().split('T')[0] && (
              <button
                type="button"
                onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-bold text-primary uppercase hover:underline whitespace-nowrap"
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>

        {/* Plage horaire */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-outline uppercase tracking-widest px-1">
            Heure (de / à)
          </label>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-outline-variant/20 shadow-sm">
            <input type="time" value={filtres.heureDebut} onChange={(e) => patch({ heureDebut: e.target.value })}
              className="text-sm font-medium text-on-surface bg-transparent border-none outline-none w-[92px]" />
            <span className="text-outline-variant">—</span>
            <input type="time" value={filtres.heureFin} onChange={(e) => patch({ heureFin: e.target.value })}
              className="text-sm font-medium text-on-surface bg-transparent border-none outline-none w-[92px]" />
          </div>
        </div>

        {/* Statut Filter */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold text-outline uppercase tracking-widest px-1">
            Niveau d'urgence
          </label>
          <select
            value={filtres.statut}
            onChange={(e) => patch({ statut: e.target.value })}
            className="w-full px-4 py-2 bg-white rounded-lg border border-outline-variant/20 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer shadow-sm"
          >
            <option value="">Tous les niveaux</option>
            <option value="NORMAL">NORMAL</option>
            <option value="URGENT">URGENT</option>
            <option value="TRES_URGENT">TRÈS URGENT</option>
          </select>
        </div>

        {/* Specialite Filter */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <label className="text-[10px] font-bold text-outline uppercase tracking-widest px-1">
            Type d'intervention
          </label>
          <select
            value={filtres.specialite}
            onChange={(e) => patch({ specialite: e.target.value })}
            className="w-full px-4 py-2 bg-white rounded-lg border border-outline-variant/20 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer shadow-sm"
          >
            <option value="">Toutes les spécialités</option>
            {SPECIALITES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Sexe Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-outline uppercase tracking-widest px-1">
            Sexe
          </label>
          <div className="flex bg-white rounded-lg border border-outline-variant/20 shadow-sm overflow-hidden">
            {[{ v: '', l: 'Tous' }, { v: 'H', l: 'H' }, { v: 'F', l: 'F' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => patch({ sexe: v })}
                className={`px-3 py-2 text-xs font-bold transition-colors ${filtres.sexe === v ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Recherche par nom/prénom */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
        <input
          type="text"
          value={filtres.recherche}
          onChange={(e) => patch({ recherche: e.target.value })}
          placeholder="Rechercher un patient par nom ou prénom..."
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-outline-variant/20 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
        />
      </div>
    </div>
  );
}
