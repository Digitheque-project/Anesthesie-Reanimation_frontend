// Passerelle unique du CHU — SEUL point d'entrée réseau pour ce front, en une seule variable
// d'environnement (NEXT_PUBLIC_GATEWAY_URL, ex. https://gateway-bwm4.onrender.com). Chaque
// constante ci-dessous n'est que GATEWAY_URL + le préfixe propre au service dans le registre
// central — jamais une URL directe de service tiers en variable séparée. Voir le même pattern
// dans Imagerie-front/lib/gateway.ts (écosystème CHU).
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || ''

// Ce backend (Bloc opératoire) lui-même — registre gateway : prefix 'bloc', routes réelles sous
// /bloc/api/* (app.setGlobalPrefix('bloc/api') côté backend).
export const API_URL = GATEWAY_URL ? `${GATEWAY_URL}/bloc/api` : ''

// Service Accueil (patients) — registre gateway : prefix 'accueil'.
export const ACCUEIL_API_URL = GATEWAY_URL ? `${GATEWAY_URL}/accueil` : ''

// Service utilisateurs (annuaire SSO) — registre gateway : prefix 'users', routes réelles
// /users/{id}.
export const USER_SERVICE_API_URL = GATEWAY_URL ? `${GATEWAY_URL}/users` : ''

// Service Hospitalisation (clinique) — registre gateway : prefix 'clinique'.
export const HOSPITALISATION_API_URL = GATEWAY_URL ? `${GATEWAY_URL}/clinique` : ''

// Service Dossier Patient — registre gateway : prefix 'dossier-patient'.
export const DOSSIER_PATIENT_API_URL = GATEWAY_URL ? `${GATEWAY_URL}/dossier-patient` : ''

// Service Prescription (central, multi-service) — registre gateway : prefix 'prescriptions'.
// L'appelant (features/prescription/lib/api.ts) ajoute lui-même /prescriptions.
export const PRESCRIPTION_API_URL = GATEWAY_URL

// Service CHU — sous-ressource "prise en charge" (entreprises partenaires), registre gateway :
// prefix 'chu', chemins /chu et /prise-en-charge.
export const PRISE_EN_CHARGE_API_URL = GATEWAY_URL ? `${GATEWAY_URL}/prise-en-charge` : ''

// Service d'upload de fichiers — registre gateway : prefix 'upload', chemins /files et /upload.
// L'appelant ajoute lui-même /files.
export const UPLOAD_API_URL = GATEWAY_URL

// Registre des services du CHU — registre gateway : prefix 'services'.
export const SERVICE_CHU_API_BASE_URL = GATEWAY_URL ? `${GATEWAY_URL}/services` : ''

// Notifications temps réel (WebSocket) — le service Notification est désormais lui aussi
// joignable via la gateway (redéploiement en cours côté plateforme) : même variable, l'appelant
// (lib/notifications/socket.ts) ajoute lui-même /notifications.
export const NOTIFICATION_WS_URL = GATEWAY_URL
