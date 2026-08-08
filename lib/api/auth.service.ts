import { apiClient } from './client';
export interface User { id: string; nom: string; email: string; role?: string; createdAt: string; }
export interface AuthResponse { token: string; user: User; }
export const authService = {
  async login(email: string, motDePasse: string): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/login', { email, motDePasse });
    localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user));
    document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
    return data;
  },
  async register(nom: string, email: string, motDePasse: string, role?: string): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/register', { nom, email, motDePasse, role });
    localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user));
    document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
    return data;
  },
  logout() { localStorage.clear(); document.cookie = 'token=; max-age=0'; window.location.href = '/login'; },
  getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') : null; },
  getUser(): User | null { if (typeof window === 'undefined') return null; const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; },
  getRole() { return this.getUser()?.role || null; },
  isAuthenticated() { return !!this.getToken(); },
};
