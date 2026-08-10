"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { DossierPatientComplet } from "@/components/clinical/dossier-patient/DossierPatientComplet";

interface DossierPatientModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string | null | undefined;
  chuId?: string;
  serviceId?: string;
  hospitalisationId?: string;
}

// Ouvre le dossier patient en surimpression plutôt qu'en changeant de page — le but précis est
// qu'un médecin en train de remplir un formulaire (CPA, prescription...) puisse consulter le
// dossier sans jamais démonter l'écran d'où il vient : tant que cette modale est fermée sans
// avoir navigué, tout ce qu'il était en train d'écrire est intact. Le dossier lui-même est en
// lecture seule (voir DossierPatientComplet et ses onglets), donc aucun risque symétrique de
// perdre une saisie EN cliquant "Fermer" ici.
export default function DossierPatientModal({
  open,
  onClose,
  patientId,
  chuId,
  serviceId,
  hospitalisationId,
}: DossierPatientModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !patientId) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-[#F8F9FB] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          title="Fermer le dossier patient"
          aria-label="Fermer le dossier patient"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>

        <DossierPatientComplet
          patientId={patientId}
          chuId={chuId}
          serviceId={serviceId}
          hospitalisationId={hospitalisationId}
          onBack={onClose}
          backLabel="Fermer"
        />
      </div>
    </div>
  );
}
