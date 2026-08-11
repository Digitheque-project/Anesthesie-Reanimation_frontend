"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MedicamentTable, { MedicamentRow } from "./MedicamentTable";
import { CATALOGUE_MEDICAMENTS, CategorieMedicament } from "@/lib/data/catalogue-medicaments-anesthesie";
import { trouverArticlePharmacie } from "@/lib/data/rapprochement-pharmacie";
import { pharmacieService, type ArticlePharmacie } from "@/lib/api/pharmacie.service";

// Construit l'état initial (tout décoché) du catalogue complet, à plat, un id stable par
// article (`categorie::libellé`) pour que la sélection survive aux re-rendus.
export function construireLignesInitiales(): MedicamentRow[] {
  return (Object.keys(CATALOGUE_MEDICAMENTS) as CategorieMedicament[]).flatMap((categorie) =>
    CATALOGUE_MEDICAMENTS[categorie].items.map(({ label, variantes }) => ({
      id: `${categorie}::${label}`,
      label,
      selected: false,
      mode: "DOSAGE" as const,
      dosage: "",
      nombre: "",
      categorie,
      variantes,
    }))
  );
}

type MedicamentsAnesthesieModalProps = {
  open: boolean;
  onClose: () => void;
  rows: MedicamentRow[];
  onRowsChange: (rows: MedicamentRow[]) => void;
};

export default function MedicamentsAnesthesieModal({
  open,
  onClose,
  rows,
  onRowsChange,
}: MedicamentsAnesthesieModalProps) {
  const total = rows.length;
  const selectionnes = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const progression = total > 0 ? Math.round((selectionnes / total) * 100) : 0;

  // Catalogue de prix Pharmacie, chargé une fois à l'ouverture de la modale (mis en cache
  // côté backend, pas besoin de le refetch à chaque réouverture dans la même session).
  // `catalogueCharge` distingue "en cours de chargement" de "chargé mais vide" — sans ça, un
  // catalogue vide (service Pharmacie indisponible ou PHARMACIE_API_URL non configuré côté
  // backend) et un catalogue qui n'a simplement pas fini de charger sont indiscernables, et le
  // prix total comme le badge de disponibilité restent silencieusement vides dans les deux cas,
  // sans qu'on sache s'il faut attendre ou signaler un problème de configuration.
  const [articlesPharmacie, setArticlesPharmacie] = useState<ArticlePharmacie[]>([]);
  const [catalogueCharge, setCatalogueCharge] = useState(false);
  useEffect(() => {
    if (open && !catalogueCharge) {
      pharmacieService.getPrix()
        .then(setArticlesPharmacie)
        .catch(() => setArticlesPharmacie([]))
        .finally(() => setCatalogueCharge(true));
    }
  }, [open, catalogueCharge]);

  const catalogueIndisponible = catalogueCharge && articlesPharmacie.length === 0;

  // La modale est rendue dans un portail attaché à <body> : posée dans le conteneur
  // `lg:sticky` de la CPA, `position: sticky` crée un stacking context qui piègeait son
  // z-index (effectivement 0) — la Sidebar (z-50), la TopBar (z-40) et le sommaire sticky
  // (z-30) passaient donc au-dessus et masquaient la fenêtre. Portée à la racine du
  // document, elle couvre tout le viewport et domine tous ces éléments.
  useEffect(() => {
    if (!open) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [open]);

  const prixParId = useMemo(() => {
    const table: Record<string, number | null> = {};
    if (!articlesPharmacie.length) return table;
    for (const row of rows) {
      const article = trouverArticlePharmacie(row.label, articlesPharmacie);
      table[row.id] = article ? article.sale_price : null;
    }
    return table;
  }, [rows, articlesPharmacie]);

  if (!open) return null;

  const categories = Object.keys(CATALOGUE_MEDICAMENTS) as CategorieMedicament[];

  const patchCategorie = (categorie: CategorieMedicament, sousLignes: MedicamentRow[]) => {
    const autres = rows.filter((r) => r.categorie !== categorie);
    onRowsChange([...autres, ...sousLignes]);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary to-secondary">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white">
              <span className="material-symbols-outlined text-2xl">medication_liquid</span>
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-white">Médicaments d'anesthésie et de réanimation</h3>
              <p className="text-xs text-white/80 mt-0.5">{selectionnes}/{total} articles sélectionnés</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors" aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="h-1.5 bg-surface-container-low">
          <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${progression}%` }} />
        </div>

        <div className="overflow-y-auto p-6 space-y-4 bg-surface-container-lowest/40">
          {catalogueIndisponible && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="material-symbols-outlined text-amber-600">warning</span>
              <div>
                <p className="font-bold">Catalogue des prix Pharmacie indisponible</p>
                <p className="text-xs mt-0.5">
                  Impossible de vérifier la disponibilité ou d'afficher le prix total pour l'instant
                  (service Pharmacie injoignable ou non configuré) — ce n'est pas que les articles sont
                  hors stock. Vous pouvez continuer à sélectionner les médicaments, les prix se
                  compléteront dès que le catalogue sera de nouveau accessible.
                </p>
              </div>
            </div>
          )}
          {categories.map((categorie) => {
            const def = CATALOGUE_MEDICAMENTS[categorie];
            const sousLignes = rows.filter((r) => r.categorie === categorie);
            return (
              <MedicamentTable
                key={categorie}
                title={def.titre}
                accent={def.accent}
                icon={def.icon}
                rows={sousLignes}
                onRowsChange={(nouvelles) => patchCategorie(categorie, nouvelles)}
                prixParId={prixParId}
                catalogueCharge={catalogueCharge}
              />
            );
          })}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-outline-variant/20">
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all">
            <span className="material-symbols-outlined text-lg">check</span>
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
