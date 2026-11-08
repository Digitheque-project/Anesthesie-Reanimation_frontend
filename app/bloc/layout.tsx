'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/bloc/layout/Sidebar';
import TopBar from '@/components/bloc/layout/TopBar';
import AlarmeSurveillance from '@/components/bloc/surveillance/AlarmeSurveillance';
import AuthGate from '@/components/bloc/auth/AuthGate';

// Même cadre que la consultation externe : barre du haut sur toute la largeur (h-16, collée en
// haut), menu blanc à gauche collé dessous, contenu à côté. La page entière défile (pas de
// conteneur interne) : les tableaux à en-tête collant et les fenêtres existants restent valables.
export default function BlocLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-[#F8F9FB]">
        <TopBar />
        <AlarmeSurveillance />
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
