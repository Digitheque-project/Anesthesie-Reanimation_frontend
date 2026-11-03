// Seul appel ORL utilisé par le module : resynchroniser les prescriptions ORL
// après un envoi (via la passerelle, jeton de l'utilisateur).
import axios from "axios";
import { gatewayUrl } from "./gateway";
import { getStoredToken } from "./session-store";

export const orlApi = {
  syncAll: async (params?: { chuId?: string; serviceIdDest?: string }): Promise<{ count: number }> => {
    const token = getStoredToken();
    const res = await axios.get(`${gatewayUrl("/orl")}/prescriptions/sync/all`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data as { count: number };
  },
};
