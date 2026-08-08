export interface VerificationData {
  reponse: "oui" | "non" | null;
  dateValidation: string;
  signature: string;
  valide: boolean;
}
