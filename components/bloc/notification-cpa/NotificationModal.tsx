'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { libelleUrgence, niveauUrgenceNotification } from '@/lib/urgence';
import { formaterNomPatient } from '@/lib/patient';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  onMarkAsRead?: (notification: any) => void; // ← Appelé quand une notif est lue
  onNotificationRead?: (notificationId: string) => void; // ← NOUVEAU
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

export default function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onNotificationRead // ← NOUVEAU
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
  const notificationsAffichees = toutesNotifications.filter(n => !readNotifications.has(n.id) && !n.lu);
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
        className="absolute right-0 top-full mt-3 z-50 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden origin-top-right animate-fadeIn"
      >
        {/* En-tête */}
        <div className="bg-gradient-to-r from-primary to-primary-dark px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-white text-xl">notifications</span>
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
              <span className="material-symbols-outlined text-sm">done_all</span>
              Tout lire
            </button>
          )}
        </div>

        {/* Liste des notifications — hauteur bornée façon pop-up, jamais plein écran */}
        <div className="max-h-[70vh] overflow-y-auto">
          {aucuneNotification ? (
            <div className="px-6 py-10 text-center">
              <span className="material-symbols-outlined text-gray-300 text-4xl">notifications_off</span>
              <p className="text-sm font-semibold text-gray-500 mt-2">Aucune notification</p>
            </div>
          ) : allRead ? (
            <div className="px-6 py-10 text-center">
              <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
              <p className="text-sm font-bold text-green-700 mt-2">Toutes les notifications sont lues</p>
            </div>
          ) : (
          <div className="p-3 space-y-2.5">
            {notificationsAffichees.map((notification, index) => {
              const niveau = getNiveauUrgence(notification);
              const config = URGENCE_CONFIG[niveau];
              return (
                <div
                  key={notification.id || index}
                  className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${config.cardClass}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.iconWrapClass}`}>
                      <span className="material-symbols-outlined text-lg">{config.icon}</span>
                    </div>
                    <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {notification.type || 'Notification'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config.badgeClass}`}>
                          {libelleUrgence(niveau)}
                        </span>
                        <span className={`w-2 h-2 rounded-full animate-pulse ${config.dotClass}`}></span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    {notification.motif || notification.message || 'Aucun motif'}
                  </p>

                  <div className="grid grid-cols-1 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Patient</p>
                      <p className="text-sm font-medium text-gray-800">
                        {notification.patientNom || formaterNomPatient(notification.patient)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Reçue le</p>
                      <p className="text-sm font-medium text-gray-800">
                        {(notification.receivedAt || notification.createdAt)
                          ? new Date(notification.receivedAt || notification.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">event</span>
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Date et heure prévues de l'opération</p>
                      <p className="text-sm font-bold text-gray-800">
                        {(notification.dateIntervention || notification.patient?.dateIntervention)
                          ? new Date(notification.dateIntervention || notification.patient?.dateIntervention).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Non communiquée'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Service source</p>
                    <p className="text-sm font-medium text-gray-800">
                      {notification.sourceServiceName || notification.serviceSourceNom || notification.serviceSourceId || 'N/A'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleVoirPrescription(notification)}
                    className="w-full py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800"
                  >
                    <span className="material-symbols-outlined text-lg">description</span>
                    Voir prescription
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Pied de page — renvoie vers le fil complet plutôt qu'un simple bouton "Fermer",
            plus utile dans une pop-up compacte qu'un tiroir déjà plein écran. */}
        <div className="bg-gray-50 px-5 py-2.5 border-t border-gray-100 shrink-0">
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
