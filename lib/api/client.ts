import axios from 'axios';
import { lireTokenStocke, effacerSession, redirigerVersLogin } from '../auth/central-session';

// NEXT_PUBLIC_API_URL est la racine nue de ce backend (ex. https://blocbackfront.onrender.com,
// sans /bloc/api) — le préfixe global de toutes ses routes (voir main.ts,
// app.setGlobalPrefix('bloc/api')) est ajouté une bonne fois pour toutes ici, pas dans la
// variable d'environnement elle-même. Voir aussi lib/realtime/operation-socket.ts, qui réutilise
// la même variable pour se connecter au WebSocket sur la racine nue (sans ce préfixe HTTP).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3333' : 'https://blocbackfront.onrender.com');
const API_URL = `${API_BASE.replace(/\/+$/, '')}/bloc/api`;

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
