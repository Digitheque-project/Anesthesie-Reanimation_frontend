'use client';

import { useState, useEffect, useRef } from 'react';
import { notificationService } from '@/lib/api/notification.service';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NotificationModal from '@/components/bloc/notification-cpa/NotificationModal';
import { connecterNotificationsTempsReel, NotificationTempsReel } from '@/lib/notifications/socket';
import { jouerSonPrescription, jouerSonPrescriptionUrgente } from '@/lib/notifications/sound';
import { obtenirSessionValide } from '@/lib/auth/central-session';
import { dedupeParPatient } from '@/lib/notifications/dedupe';
import { normaliserDemandeExterne } from '@/lib/notifications/normaliser-demande-externe';
import { apiClient } from '@/lib/api/client';
import { estPatientTraite } from '@/lib/notifications/patient-traite';
import { estEchelleUrgente } from '@/lib/urgence';
import Clock from '@/components/bloc/layout/Clock';

export default function TopBar() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [session, setSession] = useState<ReturnType<typeof obtenirSessionValide>>(null);
  const pathname = usePathname();

  useEffect(() => { setSession(obtenirSessionValide()); }, []);

  // Une notification est "actionnable" si elle est non lue, non traitée (estPatientTraite) et
  // encore à l'état ouvert — EN_ATTENTE (interne ou demande externe normalisée) ou webhook non
  // traité. C'est LA règle du compteur de la cloche, réutilisée telle quelle pour décider de
  // sonner (voir le handler websocket ci-dessous) : une ligne planifiée ou un patient pris en
  // charge n'est jamais une "nouvelle" notification.
  const estActionnable = (n: any) => {
    if (n.lu) return false;
    if (estPatientTraite(n)) return false;
    // Pour les notifications internes / demandes externes (avec statut)
    if (n.statut) return n.statut === 'EN_ATTENTE';
    // Pour les notifications webhook (avec processed)
    if (n.processed !== undefined) return !n.processed;
    // Par défaut, compter comme non lue
    return true;
  };

  // Reconstruit la liste dédupliquée (une ligne par patient, toutes sources confondues) triée
  // par fraîcheur — utilisée par le rafraîchissement périodique ET par le handler websocket,
  // qui doit resynchroniser l'état réel avant de décider de sonner.
  const chargerNotifications = async () => {
    // Récupérer la liste des notifications — un même patient ne doit apparaître qu'une fois.
    // Fusionne aussi les demandes de CPA externes (Endoscopie...), sinon elles n'apparaissent
    // jamais dans la cloche (seulement sur la page dédiée /bloc/notification-cpa).
    const [notifsRes, demandesExternesRes] = await Promise.all([
      notificationService.getAll(1, 50),
      apiClient.get('/demandes-cpa-externes', { params: { statut: 'EN_ATTENTE' } }).catch(() => ({ data: [] })),
    ]);
    const demandesExternes = (Array.isArray(demandesExternesRes.data) ? demandesExternesRes.data : []).map(normaliserDemandeExterne);
    const notifs = dedupeParPatient([...(notifsRes.data || []), ...demandesExternes]);
    // Les deux sources sont chacune déjà triées par date décroissante côté backend, mais leur
    // fusion ici (+ dedupeParPatient, qui ne retrie pas) ne garantit plus cet ordre global —
    // sans ce tri, une demande externe récente pouvait apparaître sous une prescription plus
    // ancienne.
    notifs.sort((a, b) => {
      const dateOf = (n: any) => new Date(n.createdAt || n.receivedAt || 0).getTime();
      return dateOf(b) - dateOf(a);
    });
    return notifs;
  };

  const fetchData = async () => {
    try {
      const notifs = await chargerNotifications();
      setNotifications(notifs);

      // Compter les notifications non lues — ni traitées (statut), ni déjà écartées (lu), ni
      // rattachées à un patient déjà traité (voir estPatientTraite) : un patient pris en charge
      // ne doit plus compter comme "non lu" ni réapparaître dans le badge de la cloche.
      setUnreadCount(notifs.filter(estActionnable).length);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Notifications temps réel (WebSocket) : alerte sonore + rafraîchissement immédiat
  // dès qu'une nouvelle prescription arrive pour ce service.
  useEffect(() => {
    const socket = connecterNotificationsTempsReel();
    if (!socket) return;

    // Filet anti-rafale (même principe que useRefetchOnRealtimeUpdate) : le service
    // Prescriptions (source de test) peut émettre une pluie de `new_prescription` (~1/s), et le
    // service Notification re-diffuse chaque évènement. Sans garde, chaque évènement relançait
    // ici un rechargement complet de la cloche (~1/s). On ignore les évènements déjà vus et on
    // ne traite qu'un évènement par petite fenêtre : un évènement ignoré n'est pas perdu, le
    // rechargement suivant relit l'état réel complet côté serveur.
    const THROTTLE_MS = 2000;
    const idsDejaVus = new Set<string>();
    let dernierTraitement = 0;

    const onNotification = async (notif: NotificationTempsReel) => {
      if (notif.type !== 'new_prescription' && notif.type !== 'new_demande_cpa_externe') return;
      const id = notif.id || (notif.data?.notificationId as string | undefined);
      if (id) {
        if (idsDejaVus.has(id)) return;
        idsDejaVus.add(id);
        if (idsDejaVus.size > 1000) {
          const premier = idsDejaVus.values().next().value;
          if (premier) idsDejaVus.delete(premier);
        }
      }
      const maintenant = Date.now();
      if (maintenant - dernierTraitement < THROTTLE_MS) return;
      dernierTraitement = maintenant;
      const urgence = (notif.data?.urgence as string | number) ?? '';
      // Le seuil numérique suit l'échelle commune (3 et plus = urgent, voir lib/urgence.ts) :
      // à ">= 4", une demande transmise en urgence 3 sonnait comme une arrivée ordinaire alors
      // qu'elle est bien traitée comme urgente partout ailleurs.
      const estUrgent = urgence === 'URGENT' || urgence === 'URGENTE' || urgence === 'TRES_URGENT' || urgence === 'STAT' || estEchelleUrgente(Number(urgence));
      const patientId = (notif.data?.patientId as string | undefined) ?? '';
      // Ré-émission d'une prescription/demande déjà planifiée ou déjà traitée pour ce patient :
      // les gardes backend empêchent normalement la ré-ingestion, mais si un évènement temps réel
      // est de toute façon rejoué on resynchronise l'état réel avant de sonner. On ne sonne que
      // si le patient est réellement nouveau et actionnable — jamais pour un patient déjà planifié
      // ou pris en charge (sinon chaque re-push = carillon + réapparition dans la cloche).
      let fraiches: any[] | null = null;
      try {
        fraiches = await chargerNotifications();
      } catch {
        // État indisponible : on garde le comportement historique (sonner quand même).
      }
      if (fraiches) {
        setNotifications(fraiches);
        const ligne = fraiches.find((n: any) => (n.patientId || n.patient?.id) === patientId);
        if (ligne && estActionnable(ligne)) {
          if (estUrgent) jouerSonPrescriptionUrgente();
          else jouerSonPrescription();
        }
        setUnreadCount(fraiches.filter(estActionnable).length);
        return;
      }
      if (estUrgent) jouerSonPrescriptionUrgente();
      else jouerSonPrescription();
      fetchData();
    };

    socket.on('notification', onNotification);
    return () => { socket.off('notification', onNotification); };
  }, []);

  if (pathname === '/login') return null;

  // Marquer une notification comme lue — persisté en base pour les deux origines (voir
  // notificationService.marquerLu pour les prescriptions internes, et le PATCH dédié pour les
  // demandes de CPA externes, qui n'ont pas la même route), l'état local ci-dessous ne sert
  // qu'à mettre à jour le compteur/la liste immédiatement, sans attendre le prochain
  // rafraîchissement périodique.
  const handleMarkAsRead = (notification: { id: string; origineExterne?: boolean }) => {
    const requete = notification.origineExterne
      ? apiClient.patch(`/demandes-cpa-externes/${notification.id}/lu`)
      : notificationService.marquerLu(notification.id);
    requete.catch((err) => console.error('Erreur marquage notification lue:', err));
  };

  const handleNotificationRead = (notificationId: string) => {
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, lu: true } : n
      )
    );
  };

  const handleClocheClick = () => {
    setIsModalOpen(true);
  };

  return (
    <header className="fixed top-0 right-0 left-64 z-40 bg-white/90 backdrop-blur-md border-b border-outline-variant/30 px-8 py-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-primary/10">
          <Image src="/images/chu.jpeg" alt="CHU" width={40} height={40} className="object-cover" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-primary font-headline tracking-tight">Service Anesthésie-Réanimation</h1>
          <p className="text-[10px] text-on-surface-variant font-medium">{session?.acces.chu?.name || 'CHU'}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Horloge temps réel — visible en permanence sur toutes les interfaces du bloc */}
        <Clock />

        {/* Wrapper `relative` : ancre la pop-up de notifications juste sous la cloche
            (NotificationModal se positionne en `absolute right-0 top-full`), au lieu d'un
            tiroir plein écran indépendant du bouton qui l'ouvre. */}
        <div className="relative">
          <button
            onClick={handleClocheClick}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Voir les notifications"
          >
            <span
              className={`material-symbols-outlined text-primary text-2xl ${unreadCount > 0 ? 'animate-pulse' : ''}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {unreadCount > 0 ? 'notifications_active' : 'notifications'}
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onNotificationRead={handleNotificationRead}
          />
        </div>

        <div className="flex items-center gap-3 pl-2 border-l border-outline-variant/30">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface leading-tight">
              {session ? `${session.payload.firstname} ${session.payload.name}` : '—'}
            </p>
            <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">
              {session?.acces.roleName || ''}
            </p>
          </div>
          {/* Avatar par initiales — /images/avatar-default.png n'a jamais existé dans public/images/
              (fichier manquant, jamais commité), ce qui faisait échouer l'optimiseur d'image
              Next.js sur CHAQUE page (erreur 400) et laissait un mot tronqué "Avata" à la place.
              Même langage visuel que les initiales patient de PatientsListTable, sans dépendance
              à un fichier qui peut manquer. */}
          <div className="w-10 h-10 rounded-full bg-primary-container overflow-hidden ring-2 ring-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {session ? `${session.payload.firstname?.charAt(0) || ''}${session.payload.name?.charAt(0) || ''}`.toUpperCase() : ''}
          </div>
        </div>
      </div>
    </header>
  );
}
