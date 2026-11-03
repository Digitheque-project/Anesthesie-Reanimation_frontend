import { configService } from "@/features/prescription/platform/config";
import { getStoredToken } from "@/features/prescription/platform/session-store";

export interface PatientInfoAccueil {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  [key: string]: unknown;
}

export const accueilApiService = {
  /**
   * Recupere un patient aupres du back "accueil".
   *
   * IMPORTANT : l'appel ne vise PLUS directement le domaine Railway depuis le
   * navigateur (ce qui provoquait "Accueil API Error: Network Error" faute
   * d'en-tetes CORS / en cas de mixed-content). On passe desormais par la route
   * Next MEME ORIGINE `/api/accueil/patients/:id`, qui relaie la requete
   * serveur-a-serveur (aucun CORS cote navigateur).
   */
  getPatientById: async (
    patientId: string,
  ): Promise<PatientInfoAccueil | null> => {
    const chuId = configService.getDefaultChuId();
    if (!chuId) {
      console.warn("getPatientById: chuId is missing");
      return null;
    }

    try {
      const token = getStoredToken();
      const response = await fetch(
        `/api/accueil/patients/${encodeURIComponent(
          patientId,
        )}?chuId=${encodeURIComponent(chuId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        console.error(
          `Failed to fetch patient ${patientId}: HTTP ${response.status}`,
        );
        return null;
      }

      return (await response.json()) as PatientInfoAccueil;
    } catch (error) {
      console.error(`Failed to fetch patient ${patientId}:`, error);
      return null;
    }
  },
};
