import axios from 'axios';
import { lireTokenStocke, effacerSession, redirigerVersLogin } from '../auth/central-session';
import { API_URL as GATEWAY_API_URL } from '../gateway';

// Passe par la gateway (voir lib/gateway.ts) — NEXT_PUBLIC_API_URL n'existe plus, une seule
// variable (NEXT_PUBLIC_GATEWAY_URL) pour tout le front. Repli localhost pour le dev sans
// gateway configurée.
const API_URL = GATEWAY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3333/bloc/api' : '');

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = lireTokenStocke();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Envoi de fichiers (FormData) : il faut retirer le Content-Type JSON posé par défaut sur
  // l'instance ci-dessus, sinon RIEN n'est envoyé en multipart. axios v1 regarde ce Content-Type
  // dans `transformRequest` : voyant "application/json" avec un corps FormData, il SÉRIALISE le
  // FormData en JSON (formDataToJSON) — le fichier devient un objet vide. Côté backend, multer
  // (FileInterceptor) ne reçoit alors aucun corps multipart : `@UploadedFile()` est `undefined`
  // et `@Body('patientId')` aussi, d'où le refus « patientId requis » sur chaque import de pièce
  // jointe de la vérification veille. En le retirant, le navigateur pose lui-même
  // "multipart/form-data; boundary=…" avec la frontière correcte.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('📡 Erreur API:', error.message, error.config?.url);
    if (error.response?.status === 401) {
      // Session expirée ou invalide côté SSO central : on force une reconnexion.
      effacerSession();
      redirigerVersLogin();
    }
    return Promise.reject(error);
  }
);
