'use client';

import { useEffect, useRef, useState } from 'react';

export interface SommaireSection {
  id: string;
  label: string;
  icon: string;
}

const SECTIONS: SommaireSection[] = [
  { id: 'cpa-antecedents', label: 'Antécédents', icon: 'history_edu' },
  { id: 'cpa-examen', label: 'Examen clinique', icon: 'stethoscope' },
  { id: 'cpa-voies-aeriennes', label: 'Voies aériennes', icon: 'air' },
  { id: 'cpa-conclusion', label: 'Conclusion', icon: 'summarize' },
  { id: 'cpa-traitement', label: 'Traitement médicamenteux', icon: 'pill' },
  { id: 'cpa-instructions', label: 'Instructions & médicaments', icon: 'assignment' },
  { id: 'cpa-protocole', label: 'Protocole', icon: 'vaccines' },
  { id: 'cpa-decision', label: 'Décision finale', icon: 'gavel' },
];

// Sommaire de sections cliquable, collant sous la barre du haut — la CPA compte ~80 champs sur
// plusieurs écrans de défilement, sans aucun repère jusqu'ici pour savoir où on en est ni pour
// sauter directement à une section (ex: revenir corriger le Score ASA sans tout re-parcourir).
// Le suivi de la section active se fait par IntersectionObserver plutôt que par un calcul de
// scroll manuel — moins coûteux, et robuste aux sections de hauteurs très différentes.
export default function SommaireCpa() {
  const [actif, setActif] = useState<string>(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const cibles = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (cibles.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entrees) => {
        // Parmi les sections actuellement visibles, la plus haute à l'écran fait foi — évite que
        // la dernière section (souvent plus courte) reste "active" trop longtemps en fin de page.
        const visibles = entrees.filter((e) => e.isIntersecting);
        if (visibles.length === 0) return;
        const plusHaute = visibles.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActif(plusHaute.target.id);
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    );

    cibles.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const allerA = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Sections de la consultation"
      // top-20 (80px) reprend exactement le pt-20 du <main> dans app/bloc/layout.tsx, qui
      // compense la hauteur du TopBar fixe — sans ce raccord, le sommaire se collait 12px trop
      // haut et se faisait à moitié recouvrir par le TopBar (z-40) au lieu de se loger juste en
      // dessous.
      className="sticky top-20 z-30 -mx-4 px-4 py-2 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant/20 shadow-sm"
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SECTIONS.map((s) => {
          const estActif = s.id === actif;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => allerA(s.id)}
              aria-current={estActif ? 'true' : undefined}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                estActif
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed/40'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{s.icon}</span>
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
