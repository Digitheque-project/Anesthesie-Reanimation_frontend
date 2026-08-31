import { SERVICE_CHU_API_BASE_URL } from '@/lib/gateway';
import { lireTokenStocke } from '@/lib/auth/central-session';

// Dernière valeur connue de l'id du service Pharmacie — n'intervient plus qu'en repli, si le
// registre central est injoignable au moment de l'appel (jamais utilisée en fonctionnement
// normal, contrairement à avant).
const PHARMACY_SERVICE_ID_FALLBACK = 'b0e542b2-4005-4518-bf75-37e6b39a2213';

let cache: string | null = null;
let enCours: Promise<string> | null = null;

// Résout l'id du service Pharmacie par NOM auprès du registre central (gateway, /services),
// plutôt qu'un id figé en variable d'environnement — même classe de problème que CHU_ID/
// SERVICE_ID/ENDOSCOPIE_SERVICE_ID côté Anesthesie-Reanimation_backend (un id peut changer côté
// registre sans qu'on en soit prévenu). Mis en cache pour la durée de la session navigateur ;
// repli sur la dernière valeur connue si le registre est injoignable — jamais d'échec bloquant
// pour l'envoi d'une prescription médicamenteuse.
export async function resolvePharmacyServiceId(): Promise<string> {
  if (cache) return cache;
  if (enCours) return enCours;
  if (!SERVICE_CHU_API_BASE_URL) return PHARMACY_SERVICE_ID_FALLBACK;

  enCours = (async () => {
    try {
      const token = lireTokenStocke();
      const res = await fetch(SERVICE_CHU_API_BASE_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const trouve = Array.isArray(data)
        ? data.find((s: { name?: string }) => s?.name === 'Pharmacie')
        : null;
      const resolved: string = trouve?.id || PHARMACY_SERVICE_ID_FALLBACK;
      cache = resolved;
      return resolved;
    } catch {
      return PHARMACY_SERVICE_ID_FALLBACK;
    } finally {
      enCours = null;
    }
  })();
  return enCours;
}
