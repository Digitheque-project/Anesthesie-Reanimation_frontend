"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavItem } from "@/types/bloc";
import { effacerSession, redirigerVersLogin } from "@/lib/auth/central-session";
import { useRole } from "@/lib/hooks/useRole";
import { RoleClinique } from "@/lib/auth/role-clinique";
import { planningService } from "@/lib/api";
import { Icone } from '@/components/ui/Icone';

type NavItemColore = NavItem & { couleur: { bg: string; texte: string }; rolesExclus?: RoleClinique[] };

// Une couleur propre par rubrique — plus facile à repérer d'un coup d'œil qu'une icône
// uniformément grise, et cohérent avec le style d'icônes-dans-pastille déjà utilisé ailleurs
// dans l'app (cartes KPI des Rapports, en-têtes de section...).
//
// rolesExclus : rubriques masquées pour certains rôles cliniques — le Responsable CPA ne fait
// pas d'acte chirurgical (pas de Programme opératoire / Salle de réveil), l'IBODE n'a pas accès à
// la prescription ni au suivi de RDV/salle de réveil. L'Anesthésiste n'est jamais exclu : il garde
// l'accès à tout le menu. Le Major remplace totalement l'anesthésiste (même rôle clinique), il
// garde donc lui aussi l'accès à tout le menu.
export const navItems: NavItemColore[] = [
  { label: 'Tableau de bord', href: '/bloc', icon: 'space_dashboard', couleur: { bg: 'bg-blue-100', texte: 'text-blue-600' } },
  { label: 'Prescription', href: '/bloc/notification-cpa', icon: 'mark_email_unread', couleur: { bg: 'bg-amber-100', texte: 'text-amber-600' }, rolesExclus: [RoleClinique.IBODE] },
  { label: 'Fil de travail', href: '/bloc/rendez-vous', icon: 'event_note', couleur: { bg: 'bg-violet-100', texte: 'text-violet-600' }, rolesExclus: [RoleClinique.IBODE] },
  // Programme opératoire : les patients qui opèrent au Bloc (chirurgie classique).
  { label: 'Programme opératoire', href: '/bloc/patient-du-jour', icon: 'medical_services', couleur: { bg: 'bg-teal-100', texte: 'text-teal-600' }, rolesExclus: [RoleClinique.RESPONSABLE_CPA] },
  // Programme non-chirurgical : les patients venus par une demande de CPA externe d'un service qui
  // n'opère pas au Bloc (Imagerie, Endoscopie, Urgence...). Mêmes checklists, mêmes rôles concernés
  // — seule la liste de patients diffère (voir lib/programme-non-operatoire.ts).
  { label: 'Programme non-chirurgical', href: '/bloc/programme-non-operatoire', icon: 'move_up', couleur: { bg: 'bg-cyan-100', texte: 'text-cyan-600' }, rolesExclus: [RoleClinique.RESPONSABLE_CPA] },
  { label: 'Salle de réveil', href: '/bloc/salle-de-reveil', icon: 'king_bed', couleur: { bg: 'bg-rose-100', texte: 'text-rose-600' }, rolesExclus: [RoleClinique.RESPONSABLE_CPA, RoleClinique.IBODE] },
  { label: 'Archives', href: '/bloc/archives', icon: 'folder_special', couleur: { bg: 'bg-indigo-100', texte: 'text-indigo-600' } },
  { label: 'Rapport', href: '/bloc/rapport', icon: 'monitoring', couleur: { bg: 'bg-emerald-100', texte: 'text-emerald-600' } },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();
  // Tant que le rôle n'est pas encore résolu (session en cours de lecture au montage), on
  // affiche tout le menu plutôt que de le faire clignoter (tout → filtré) une fois la session
  // chargée.
  const itemsVisibles = navItems.filter((item) => !role || !item.rolesExclus?.includes(role));

  // Pastille "retards" sur Fil de travail — CPA/vérification veille/opération dont la date
  // prévue est dépassée sans que l'étape correspondante soit faite (voir PlanningService.
  // getRetards) : sans ça, un rendez-vous manqué ne se voyait qu'en ouvrant la page concernée.
  const [retards, setRetards] = useState(0);
  useEffect(() => {
    const charger = () => planningService.getRetards().then((d: any) => setRetards(d?.total || 0)).catch(() => {});
    charger();
    const interval = setInterval(charger, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    // Même menu que la consultation externe : blanc, collé sous la barre du haut (h-16).
    <aside className="sticky top-16 mt-2 flex h-[calc(100vh-4.5rem)] w-[260px] shrink-0 flex-col overflow-y-auto rounded-tr-[24px] border-r border-[#F1F5F9] bg-white shadow-[1px_0px_5px_rgba(0,0,0,0.01)]">
      <nav className="flex-1 space-y-1.5 px-4 py-5">
        {itemsVisibles.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/bloc/rendez-vous' && (pathname.startsWith('/bloc/rendez-vous/') || pathname.startsWith('/bloc/consultation-cpa') || pathname === '/bloc/verification-veille'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 rounded-[12px] px-4 py-3.5 transition-colors duration-200 ${
                isActive ? 'bg-[#F0F7FF] font-bold text-[#006A8C]' : 'font-medium text-[#475569] hover:bg-gray-50'
              }`}
            >
              <Icone nom={item.icon} className={`text-[20px] ${isActive ? 'text-[#006A8C]' : 'text-[#64748B]'}`} />
              <span className="text-[14px]">{item.label}</span>
              {item.href === '/bloc/rendez-vous' && retards > 0 && (
                <span
                  title={`${retards} étape${retards > 1 ? 's' : ''} en retard`}
                  className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E11D48] px-1.5 text-[10px] font-bold text-white"
                >
                  {retards > 99 ? '99+' : retards}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-5 px-5 py-6">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 text-[#E11D48] transition-colors hover:text-red-700"
          onClick={() => { effacerSession(); redirigerVersLogin(); }}
        >
          <Icone nom="logout" className="text-[18px]" />
          <span className="text-[13px] font-bold">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
