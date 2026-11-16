'use client';

import { ReactNode, useState } from 'react';
import Sidebar from '@/components/bloc/layout/Sidebar';
import TopBar from '@/components/bloc/layout/TopBar';
import AlarmeSurveillance from '@/components/bloc/surveillance/AlarmeSurveillance';
import AuthGate from '@/components/bloc/auth/AuthGate';

// Même cadre que la consultation externe : barre du haut sur toute la largeur (h-16, collée en
// haut), menu blanc à gauche collé dessous, contenu à côté. La page entière défile (pas de
// conteneur interne) : les tableaux à en-tête collant et les fenêtres existants restent valables.
export default function BlocLayout({ children }: { children: ReactNode }) {
  // Tiroir du menu sur téléphone (comme la consultation externe).
  const [menuOuvert, setMenuOuvert] = useState(false);
  return (
    <AuthGate>
      <div className="min-h-screen bg-[#F8F9FB]">
        <TopBar onMenuClick={() => setMenuOuvert((o) => !o)} />
        <AlarmeSurveillance />
        <div className="flex">
          <Sidebar isOpen={menuOuvert} onClose={() => setMenuOuvert(false)} />
          <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F8F9FB]">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
