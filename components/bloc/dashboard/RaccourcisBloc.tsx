'use client';

import Link from 'next/link';

interface Raccourci {
  icon: string;
  label: string;
  href: string;
}

const raccourcis: Raccourci[] = [
  {
    icon: 'person',
    label: 'Patient du Jour',
    href: '/bloc/patient-du-jour',
  },
  {
    icon: 'checklist',
    label: 'Avant Opération',
    href: '/bloc/checklist-oms',
  },
  {
    icon: 'medical_services',
    label: 'Pendant Opération',
    href: '/bloc/activite-pendant-operation',
  },
  {
    icon: 'assignment_turned_in',
    label: 'Après Opération',
    href: '/bloc/apres-operation',
  },
  {
    icon: 'bed',
    label: 'Salle de Réveil',
    href: '/bloc/salle-de-reveil',
  },
];

export default function RaccourcisBloc() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {raccourcis.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="bg-white hover:bg-surface-container-low rounded-xl p-5 flex flex-col items-center gap-3 border border-outline-variant/10 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-primary text-3xl">{item.icon}</span>
          <span className="text-xs font-bold text-on-surface-variant text-center uppercase tracking-wide">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
