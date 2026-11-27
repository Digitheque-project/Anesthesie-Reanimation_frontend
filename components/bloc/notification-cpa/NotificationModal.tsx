'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { libelleUrgence, niveauUrgenceNotification } from '@/lib/urgence';
import { formaterNomPatient } from '@/lib/patient';
import { estPatientTraite } from '@/lib/notifications/patient-traite';
import { Icone } from '@/components/ui/Icone';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  onMarkAsRead?: (notification: any) => void; // ← Appelé quand une notif est lue
  onNotificationRead?: (notificationId: string) => void; // ← NOUVEAU
  /** Alertes affichées avant la liste (surveillances à faire). */
  enTete?: ReactNode;
}

type NiveauUrgence = 'NORMAL' | 'URGENT' | 'TRES_URGENT';

// Code couleur IHM par niveau d'urgence : bleu = normal, orange = urgent, rouge = très urgent
const URGENCE_CONFIG: Record<NiveauUrgence, {
  icon: string;
  badgeClass: string;
  cardClass: string;
  iconWrapClass: string;
  dotClass: string;
}> = {
  NORMAL: {
    icon: 'info',
    badgeClass: 'bg-primary/10 text-primary border-primary/30',
    cardClass: 'border-primary/30 bg-primary/5',
    iconWrapClass: 'bg-primary/10 text-primary',
    dotClass: 'bg-primary',
  },
  URGENT: {
    icon: 'warning',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-300',
    cardClass: 'border-orange-300 bg-orange-50',
    iconWrapClass: 'bg-orange-100 text-orange-600',
    dotClass: 'bg-orange-500',
  },
  TRES_URGENT: {
    icon: 'emergency',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
    cardClass: 'border-red-300 bg-red-50',
    iconWrapClass: 'bg-red-100 text-red-600',
    dotClass: 'bg-red-600',
  },
};

// Détermine le niveau d'urgence d'une notification (champ numérique `urgence`
// ou, à défaut, le booléen `estUrgent` transmis par les notifications internes CPA)
const getNiveauUrgence = niveauUrgenceNotification;

function tempsRelatif(d: string | number | Date): string {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const j = Math.round(h / 24);
  return j === 1 ? 'Hier' : `Il y a ${j} jours`;
}

export default function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onNotificationRead, // ← NOUVEAU
  enTete,
}: NotificationModalProps) {
  const router = useRouter();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Fermer avec la touche Échap (le clic en dehors est géré par TopBar, qui connaît les
  // limites du bouton-cloche lui-même — ce composant ne sait pas où il est ancré).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toutesNotifications = notifications || [];
  // Une notification déjà lue (marquée dans cette session, ou déjà `lu` en base lors d'une
  // session précédente) ne doit plus apparaître dans la liste — pas juste être re-stylée.
  // Ni une notification rattachée à un patient déjà traité (voir estPatientTraite) : un patient
  // pris en charge (CPA réalisée/inapte ou plus loin dans le parcours) ne doit plus apparaître ici.
  // Ni une notification déjà passée en RDV_PLANIFIE : le rendez-vous existe désormais au
  // calendrier, ce n'est plus une prescription à traiter — un bouton "Voir prescription" dessus
  // serait trompeur (le bug des patients réapparaissant dans la cloche après planification). Le
  // suivi des RDV planifiés vit sur la page Notifications (onglet "RDV planifiés"), pas ici.
  const notificationsAffichees = toutesNotifications.filter(
    n => !readNotifications.has(n.id) && !n.lu && n.statut !== 'RDV_PLANIFIE' && !estPatientTraite(n)
  );
  const unreadCount = notificationsAffichees.length;
  const aucuneNotification = toutesNotifications.length === 0;

  const handleClose = () => onClose();

  const handleVoirPrescription = (notification: any) => {
    // Marquer comme lue si ce n'est pas déjà fait
    if (notification.id && !readNotifications.has(notification.id)) {
      const newRead = new Set(readNotifications);
      newRead.add(notification.id);
      setReadNotifications(newRead);

      // Persisté en base pour les deux origines — voir TopBar.handleMarkAsRead, qui route vers
      // la bonne route selon `notification.origineExterne`.
      if (onMarkAsRead) {
        onMarkAsRead(notification);
      }

      // ← NOUVEAU: Notifier le parent que la notification a été lue
      if (onNotificationRead) {
        onNotificationRead(notification.id);
      }
    }

    if (notification.origineExterne && notification.id) {
      // Demande de CPA externe (Endoscopie...) : pas de fiche de suivi bloc pour ce patient —
      // sa page dédiée n'a besoin que de l'id de la demande, pas d'un patientId de suivi bloc.
      router.push(`/bloc/demande-cpa-externe/${notification.id}`);
      handleClose();
    } else if (notification.patientId) {
      router.push(`/bloc/dossier-patient/${notification.patientId}?notifId=${notification.id || ''}`);
      handleClose();
    }
  };

  // ← NOUVEAU: Marquer toutes comme lues
  const handleMarkAllAsRead = () => {
    const newRead = new Set(readNotifications);
    notifications.forEach(n => {
      if (n.id && !newRead.has(n.id)) {
        newRead.add(n.id);
        if (onMarkAsRead) {
          onMarkAsRead(n);
        }
        if (onNotificationRead) {
          onNotificationRead(n.id);
        }
      }
    });
    setReadNotifications(newRead);
  };

  // "Toutes lues" ne doit s'afficher que s'il y a effectivement eu des notifications à lire —
  // sinon un service qui n'a jamais rien reçu afficherait un faux "tout est lu".
  const allRead = !aucuneNotification && notificationsAffichees.length === 0;

  return (
    <>
      {/* Zone invisible plein écran, sous la pop-up : un clic n'importe où en dehors la ferme,
          sans assombrir la page (contrairement à un panneau modal classique) — le style attendu
          d'une pop-up de notifications ancrée à la cloche (Gmail, GitHub...), pas un tiroir. */}
      <div className="fixed inset-0 z-40" onClick={handleClose} aria-hidden="true" />

      {/* Pop-up ancrée sous le bouton-cloche (le wrapper `relative` vit dans TopBar) */}
      <div
        role="dialog"
        aria-label="Notifications"
        className="absolute right-0 top-full mt-3 z-50 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#F1F5F9] flex flex-col overflow-hidden origin-top-right animate-fadeIn"
      >
        {/* En-tête */}
        <div className="bg-gradient-to-r from-primary to-primary-dark px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <Icone nom="notifications" className="text-white text-xl" />
            <h3 className="text-white font-bold text-base">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-white/90 hover:text-white transition-colors text-xs font-bold flex items-center gap-1"
            >
              <Icone nom="done_all" className="text-sm" />
              Tout lire
            </button>
          )}
        </div>

        {/* Liste des notifications — hauteur bornée façon pop-up, jamais plein écran */}
        <div className="max-h-[70vh] overflow-y-auto">
          {enTete}
          {aucuneNotification ? (
            <div className="px-6 py-10 text-center">
              <Icone nom="notifications_off" className="text-gray-300 text-4xl" />
              <p className="text-sm font-semibold text-[#64748B] mt-2">Aucune notification</p>
            </div>
          ) : allRead ? (
            <div className="px-6 py-10 text-center">
              <Icone nom="check_circle" className="text-green-500 text-4xl" />
              <p className="text-sm font-bold text-green-700 mt-2">Toutes les notifications sont lues</p>
            </div>
          ) : (
          // Liste compacte, une notification sur deux lignes, comme dans les
          // autres modules (27/11/2026) : plusieurs notifications visibles d'un coup.
          <ul className="divide-y divide-slate-100">
            {notificationsAffichees.map((notification, index) => {
              const niveau = getNiveauUrgence(notification);
              const config = URGENCE_CONFIG[niveau];
              const patient = (notification.patientNom || formaterNomPatient(notification.patient) || 'Patient').toString();
              const recue = notification.receivedAt || notification.createdAt;
              const intervention = notification.dateIntervention || notification.patient?.dateIntervention;
              const service = notification.sourceServiceName || notification.serviceSourceNom;
              const detail = [
                notification.motif || notification.message || notification.type || 'Demande',
                service ? `de ${service}` : '',
                intervention
                  ? `opération le ${new Date(intervention).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : '',
              ].filter(Boolean).join(' · ');
              return (
                <li key={notification.id || index}>
                  <button
                    type="button"
                    onClick={() => handleVoirPrescription(notification)}
                    className="flex w-full items-start gap-3 bg-[#F0F7FB] px-4 py-3 text-left transition-colors hover:bg-[#E3F0F7]"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${config.dotClass}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-extrabold uppercase text-slate-900">{patient}</span>
                        <span className="shrink-0 text-[11px] text-slate-500">{recue ? tempsRelatif(recue) : ''}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[12px] text-slate-600">{detail}</span>
                        {niveau !== 'NORMAL' && (
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${config.badgeClass}`}>
                            {libelleUrgence(niveau)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          )}
        </div>

        {/* Pied de page — renvoie vers le fil complet plutôt qu'un simple bouton "Fermer",
            plus utile dans une pop-up compacte qu'un tiroir déjà plein écran. */}
        <div className="bg-gray-50 px-5 py-2.5 border-t border-[#F1F5F9] shrink-0">
          <button
            onClick={() => { router.push('/bloc/notification-cpa'); handleClose(); }}
            className="w-full text-center text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1.5"
          >
            Voir toutes les notifications
          </button>
        </div>
      </div>
    </>
  );
}
