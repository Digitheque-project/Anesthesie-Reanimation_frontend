"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "@/types/bloc";
import { effacerSession, redirigerVersLogin } from "@/lib/auth/central-session";
import { useRole } from "@/lib/hooks/useRole";
import { RoleClinique } from "@/lib/auth/role-clinique";

type NavItemColore = NavItem & { couleur: { bg: string; texte: string }; rolesExclus?: RoleClinique[] };

// Une couleur propre par rubrique — plus facile à repérer d'un coup d'œil qu'une icône
// uniformément grise, et cohérent avec le style d'icônes-dans-pastille déjà utilisé ailleurs
// dans l'app (cartes KPI des Rapports, en-têtes de section...).
//
// rolesExclus : rubriques masquées pour certains rôles cliniques — le Responsable CPA ne fait
// pas d'acte chirurgical (pas de Programme opératoire / Salle de réveil), le Chirurgien ne voit
// que Tableau de bord/Programme opératoire/Archives/Rapport, l'IBODE n'a pas accès à la
// prescription ni au suivi de RDV/salle de réveil. L'Anesthésiste n'est jamais exclu : il garde
// l'accès à tout le menu. Le Major remplace totalement l'anesthésiste (même rôle clinique), il
// garde donc lui aussi l'accès à tout le menu.
const navItems: NavItemColore[] = [
  { label: 'Tableau de bord', href: '/bloc', icon: 'space_dashboard', couleur: { bg: 'bg-blue-100', texte: 'text-blue-600' } },
  { label: 'Prescription', href: '/bloc/notification-cpa', icon: 'mark_email_unread', couleur: { bg: 'bg-amber-100', texte: 'text-amber-600' }, rolesExclus: [RoleClinique.CHIRURGIEN, RoleClinique.IBODE] },
  { label: 'Fil de travail', href: '/bloc/rendez-vous', icon: 'event_note', couleur: { bg: 'bg-violet-100', texte: 'text-violet-600' }, rolesExclus: [RoleClinique.CHIRURGIEN, RoleClinique.IBODE] },
  // Programme opératoire : les patients qui opèrent au Bloc (chirurgie classique).
  { label: 'Programme opératoire', href: '/bloc/patient-du-jour', icon: 'medical_services', couleur: { bg: 'bg-teal-100', texte: 'text-teal-600' }, rolesExclus: [RoleClinique.RESPONSABLE_CPA] },
  // Programme non-chirurgical : les patients venus par une demande de CPA externe d'un service qui
  // n'opère pas au Bloc (Imagerie, Endoscopie, Urgence...). Mêmes checklists, mêmes rôles concernés
  // — seule la liste de patients diffère (voir lib/programme-non-operatoire.ts).
  { label: 'Programme non-chirurgical', href: '/bloc/programme-non-operatoire', icon: 'move_up', couleur: { bg: 'bg-cyan-100', texte: 'text-cyan-600' }, rolesExclus: [RoleClinique.RESPONSABLE_CPA] },
  { label: 'Salle de réveil', href: '/bloc/salle-de-reveil', icon: 'king_bed', couleur: { bg: 'bg-rose-100', texte: 'text-rose-600' }, rolesExclus: [RoleClinique.RESPONSABLE_CPA, RoleClinique.CHIRURGIEN, RoleClinique.IBODE] },
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

  return (
    <aside className="w-64 fixed left-0 top-0 bottom-0 flex flex-col z-50 bg-[#1675F5]">
      {/* Logo and Brand */}
      <div className="px-6 py-4 flex flex-col items-center shrink-0">
        <div className="relative w-14 h-14 mb-2">
          <Image
          src="/images/chu.jpeg"
          alt="CHU"
          width={56}
          height={56}
          className="rounded-full object-cover border-2 border-white shadow-md bg-white" />
        </div>
        <h1 className="font-headline font-extrabold text-white text-center text-sm tracking-tight leading-tight">
          Service Anesthésie-Réanimation
        </h1>
        <p className="text-[9px] font-bold tracking-[0.15em] text-white/70 uppercase mt-0.5">
          PLATEFORME MÉDICALE
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col justify-start gap-1 min-h-0 pt-2">
        {itemsVisibles.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/bloc/rendez-vous' && (pathname.startsWith('/bloc/rendez-vous/') || pathname.startsWith('/bloc/consultation-cpa') || pathname === '/bloc/verification-veille'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                isActive
                  ? "bg-white text-primary font-bold shadow-sm"
                  : "text-white/90 hover:bg-white/15 font-medium"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.couleur.bg} ${item.couleur.texte} group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-[19px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto p-3 border-t border-white/20 space-y-1 shrink-0">
        <button
          className="w-full flex items-center gap-3 px-4 py-2 text-white/90 hover:text-red-200 transition-all group"
          onClick={() => { effacerSession(); redirigerVersLogin(); }}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-xs font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
