// Adresses utilisées par le module de prescription (toutes via la passerelle).
import { gatewayUrl } from "./gateway";
import { getActiveChuId } from "./session-store";

export const configService = {
  getServiceChuApiBaseUrl: () => gatewayUrl("/services"),
  getAccueilApiUrl: () => gatewayUrl("/accueil"),
  getDefaultChuId: () => getActiveChuId(),
};
