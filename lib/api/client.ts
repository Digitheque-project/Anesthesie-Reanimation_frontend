import axios from 'axios';
import { lireTokenStocke, effacerSession, redirigerVersLogin } from '../auth/central-session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3333/bloc/api' : 'https://blocbackfront.onrender.com/bloc/api');

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = lireTokenStocke();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
