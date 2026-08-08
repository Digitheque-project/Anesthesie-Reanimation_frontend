'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/bloc/layout/Sidebar';
import TopBar from '@/components/bloc/layout/TopBar';
import AuthGate from '@/components/bloc/auth/AuthGate';

export default function BlocLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <TopBar />
        {/* ✅ Ajout d’un padding-top pour éviter que le contenu soit caché sous le TopBar */}
        <main className="ml-64 pt-20">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
