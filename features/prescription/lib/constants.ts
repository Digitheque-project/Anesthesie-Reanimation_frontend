import { SERVICE_CHU_API_BASE_URL } from '@/lib/gateway';
import { lireTokenStocke } from '@/lib/auth/central-session';

// Dernières valeurs connues — n'interviennent plus qu'en repli, si le registre central est
// injoignable au moment de l'appel (jamais utilisées en fonctionnement normal).
const SERVICE_ID_FALLBACKS: Record<string, string> = {
  'Pharmacie': 'b0e542b2-4005-4518-bf75-37e6b39a2213',
  'Banque de sang': 'd7434736-f7ef-4715-835a-4b0b987f2ba3',
};

const cache = new Map<string, string>();
const enCours = new Map<string, Promise<string>>();

// Résout l'id d'un service par NOM auprès du registre central (gateway, /services), plutôt
// qu'un id figé en variable d'environnement — même classe de problème que CHU_ID/SERVICE_ID/
// ENDOSCOPIE_SERVICE_ID côté Anesthesie-Reanimation_backend (un id peut changer côté registre
// sans qu'on en soit prévenu). Mis en cache pour la durée de la session navigateur ; repli sur
// la dernière valeur connue si le registre est injoignable — jamais d'échec bloquant pour
// l'envoi d'une prescription.
async function resolveServiceIdByName(name: string): Promise<string> {
  const fallback = SERVICE_ID_FALLBACKS[name] ?? '';
  const cached = cache.get(name);
  if (cached) return cached;
  const pending = enCours.get(name);
  if (pending) return pending;
  if (!SERVICE_CHU_API_BASE_URL) return fallback;

  const promise = (async () => {
    try {
      const token = lireTokenStocke();
      const res = await fetch(SERVICE_CHU_API_BASE_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const trouve = Array.isArray(data)
        ? data.find((s: { name?: string }) => s?.name === name)
        : null;
      const resolved: string = trouve?.id || fallback;
      cache.set(name, resolved);
      return resolved;
    } catch {
      return fallback;
    } finally {
      enCours.delete(name);
    }
  })();
  enCours.set(name, promise);
  return promise;
}

export function resolvePharmacyServiceId(): Promise<string> {
  return resolveServiceIdByName('Pharmacie');
}

export function resolveBanqueSangServiceId(): Promise<string> {
  return resolveServiceIdByName('Banque de sang');
}
