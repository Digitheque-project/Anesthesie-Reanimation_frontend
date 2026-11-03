import axios from "axios";
import { configService } from "@/features/prescription/platform/config";
import { getStoredToken } from "@/features/prescription/platform/session-store";

export interface ServiceChuInfo {
  serviceId: string;
  name: string;
  description: string;
  type: string;
  chuId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

type ServiceChuApiResponse = Omit<ServiceChuInfo, "serviceId"> & {
  id?: string;
  serviceId?: string;
};

const normalizeService = (
  service: ServiceChuApiResponse,
): ServiceChuInfo | null => {
  // service-service expose l'identifiant sous `id`; certains environnements
  // historiques utilisent encore `serviceId`. Le front normalise les deux.
  const serviceId = service.serviceId ?? service.id;
  if (!serviceId) {
    return null;
  }

  return { ...service, serviceId };
};

function resolveServicesEndpoint(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  return /\/services$/i.test(normalizedBaseUrl)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/services`;
}

export const serviceChuApi = {
  getAll: async (chuId?: string): Promise<ServiceChuInfo[]> => {
    const baseUrl = configService.getServiceChuApiBaseUrl();
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_GATEWAY_URL is not defined");
    }
    // Le service-service expose la liste des services sur sa base URL
    // (cf. env : "Service CHU (liste des services)"). Guard JWT global => token requis.
    const token = getStoredToken();
    const response = await axios.get<ServiceChuApiResponse[]>(
      resolveServicesEndpoint(baseUrl),
      {
        params: chuId ? { chuId } : undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    );
    const services = Array.isArray(response.data) ? response.data : [];
    return services
      .map(normalizeService)
      .filter((service): service is ServiceChuInfo => service !== null);
  },
  getById: async (serviceId: string) => {
    const baseUrl = configService.getServiceChuApiBaseUrl();
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_GATEWAY_URL is not defined");
    }
    // Le service-service est protege par un JwtAuthGuard global : on doit
    // attacher le token de session, sinon le backend repond 401.
    const token = getStoredToken();
    const response = await axios.get<ServiceChuApiResponse>(
      `${resolveServicesEndpoint(baseUrl)}/${encodeURIComponent(serviceId)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    const service = normalizeService(response.data);
    if (!service) {
      throw new Error("Le service retourne ne contient aucun identifiant");
    }
    return service;
  },
};
