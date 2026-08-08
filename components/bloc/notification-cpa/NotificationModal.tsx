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
  const [isClosing, setIsClosing] = useState(false);

  // Empêcher le scroll de la page derrière le slide-over pendant qu'il est ouvert
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  // Fermer avec la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!isOpen || !notifications || notifications.length === 0) return null;

  // Une notification déjà lue (marquée dans cette session, ou déjà `lu` en base lors d'une
  // session précédente) ne doit plus apparaître dans le tiroir — pas juste être re-stylée.
  const notificationsAffichees = notifications.filter(n => !readNotifications.has(n.id) && !n.lu);
  const unreadCount = notificationsAffichees.length;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

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

  const allRead = notificationsAffichees.length === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${isClosing ? 'opacity-0' : 'animate-overlayFadeIn'} transition-opacity duration-200`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panneau slide-over */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col h-full ${
            isClosing ? 'translate-x-full' : 'animate-slideOverIn'
          } transition-transform duration-200`}
        >
          {/* En-tête */}
          <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-white text-2xl">notifications</span>
              <h3 className="text-white font-bold text-xl">
                Notifications
                {/* ← MODIFIÉ: Afficher le compteur seulement s'il y a des non lues */}
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-full p-1"
              aria-label="Fermer les notifications"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Bouton "Tout marquer comme lu" */}
          {unreadCount > 0 && (
            <div className="px-6 py-2 border-b border-gray-100 shrink-0">
              <button
                onClick={handleMarkAllAsRead}
                className="text-primary hover:text-primary/80 transition-colors text-xs font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                Tout marquer comme lu
              </button>
            </div>
          )}

          {/* Statut "Toutes lues" */}
          {allRead && (
            <div className="bg-green-100 border-b border-green-300 px-6 py-3 flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
              <p className="text-green-800 font-bold text-sm">
                Toutes les notifications sont lues
              </p>
            </div>
          )}

          {/* Liste des notifications — les lues ont déjà disparu de notificationsAffichees */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
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
                        {notification.dateIntervention
                          ? new Date(notification.dateIntervention).toLocaleString('fr-FR', {
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

          {/* Pied de page */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100 shrink-0">
            <span className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : '✅ Toutes lues'}
            </span>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition shadow-md"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
