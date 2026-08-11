"use client";

import Checkbox from "@/components/ui/Checkbox";

export type ModeSaisieMedicament = "DOSAGE" | "QUANTITE";

export type MedicamentRow = {
  id: string;
  label: string;
  selected: boolean;
  /** Mode de saisie historique (DOSAGE/QUANTITE) — plus choississable dans l'interface depuis
   * que la colonne s'appelle « Unité » ; conservé dans les données pour ne pas casser les
   * fiches déjà enregistrées (valeur par défaut : DOSAGE). */
  mode: ModeSaisieMedicament;
  dosage: string;
  /** Nombre d'unités à prévoir — sert au calcul du prix total (rapprochement Pharmacie), distinct
   * du champ dosage/quantité ci-dessus qui reste une description clinique libre. */
  nombre: string;
  /** Par défaut : champ texte. `number` pour les quantités entières (ex. blouse). */
  dosageInputType?: "text" | "number";
  dosagePlaceholder?: string;
  /** Catégorie d'origine (ex. "SERUM") — non utilisée par ce composant, sert au parent à
   * regrouper/filtrer les lignes d'un tableau à plat (ex. catalogue CPA). */
  categorie?: string;
  /** Valeurs cliquables (concentration, calibre, nom alternatif...) qui remplissent directement
   * le champ Dosage/Quantité — évite d'avoir à les taper pour les articles qui proposent un
   * choix connu (ex. SGH 5%/10%, Lidocaïne 1%/2%). */
  variantes?: string[];
};

export type MedicamentTableAccent =
  | "primary"
  | "secondary"
  | "tertiary"
  | "primary-container"
  | "error"
  | "inverse-primary";

const barClass: Record<MedicamentTableAccent, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  "primary-container": "bg-primary-container",
  error: "bg-error",
  "inverse-primary": "bg-inverse-primary",
};

// Badge d'icône coloré dans l'en-tête de chaque catégorie.
const badgeClass: Record<MedicamentTableAccent, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  tertiary: "bg-tertiary/10 text-tertiary",
  "primary-container": "bg-primary-container/15 text-primary-container",
  error: "bg-error/10 text-error",
  "inverse-primary": "bg-inverse-primary/20 text-on-primary-fixed-variant",
};

// Fond légèrement teinté de la carte de catégorie, pour la repérer d'un coup d'œil.
const cardTintClass: Record<MedicamentTableAccent, string> = {
  primary: "bg-primary/[0.03] border-primary/15",
  secondary: "bg-secondary/[0.03] border-secondary/15",
  tertiary: "bg-tertiary/[0.03] border-tertiary/15",
  "primary-container": "bg-primary-container/[0.05] border-primary-container/15",
  error: "bg-error/[0.03] border-error/15",
  "inverse-primary": "bg-inverse-primary/[0.08] border-inverse-primary/20",
};

// Ligne mise en avant une fois l'article coché — la sélection doit rester visible même quand
// on scrolle loin de la case à cocher.
const rowSelectedClass: Record<MedicamentTableAccent, string> = {
  primary: "bg-primary/[0.06]",
  secondary: "bg-secondary/[0.06]",
  tertiary: "bg-tertiary/[0.06]",
  "primary-container": "bg-primary-container/[0.08]",
  error: "bg-error/[0.06]",
  "inverse-primary": "bg-inverse-primary/[0.12]",
};

const dosageInputClassName =
  "h-9 w-full rounded border border-outline-variant/20 bg-surface-container-low px-3 outline-none focus:ring-2 focus:ring-primary/20";

const nombreInputClassName =
  "h-9 w-20 rounded border border-outline-variant/20 bg-surface-container-low px-2 text-center outline-none focus:ring-2 focus:ring-primary/20";

const formatAr = (valeur: number) =>
  `${valeur.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Ar`;

type MedicamentTableProps = {
  title: string;
  accent: MedicamentTableAccent;
  icon?: string;
  rows: MedicamentRow[];
  onRowsChange: (rows: MedicamentRow[]) => void;
  /** Prix unitaire (Ar) par id de ligne, trouvé dans le catalogue Pharmacie par rapprochement de
   * nom — null si aucun article correspondant, absent si le catalogue n'a pas encore chargé. */
  prixParId?: Record<string, number | null>;
  /** true une fois que le fetch du catalogue Pharmacie s'est terminé (avec ou sans résultat) —
   * distingue "en cours de chargement" de "chargé mais aucun article trouvé", sans quoi les deux
   * cas laissent le statut et le prix total silencieusement vides. */
  catalogueCharge?: boolean;
};

export default function MedicamentTable({
  title,
  accent,
  icon,
  rows,
  onRowsChange,
  prixParId,
  catalogueCharge,
}: MedicamentTableProps) {
  const patchRow = (
    id: string,
    field: keyof MedicamentRow,
    value: string | boolean
  ) => {
    onRowsChange(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const selectionnes = rows.filter((r) => r.selected).length;

  return (
    <section className={`rounded-xl border p-6 shadow-sm ${cardTintClass[accent]}`}>
      <div className="mb-6 flex items-center gap-3">
        <div className={`h-6 w-1.5 rounded-full ${barClass[accent]}`} />
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${badgeClass[accent]}`}>
            <span className="material-symbols-outlined text-lg">{icon}</span>
          </span>
        )}
        <h3 className="font-headline text-lg font-bold uppercase text-on-surface">
          {title}
        </h3>
        {selectionnes > 0 && (
          <span className={`ml-auto rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${badgeClass[accent]}`}>
            {selectionnes} sélectionné{selectionnes > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-outline-variant/20 bg-surface-container-low">
            <tr>
              <th className="w-12 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Select
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Médicament / Matériel
              </th>
              <th className="w-72 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Unité
              </th>
              <th className="w-24 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Nombre
              </th>
              <th className="w-32 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Prix total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 text-sm">
            {rows.map((row) => {
              const dosagePlaceholder = row.dosagePlaceholder ?? "ex: 500mg";
              const prixUnitaire = prixParId?.[row.id];
              const nombreValeur = Number(row.nombre);
              // N'affiche le prix total qu'une fois la ligne vraiment renseignée (dosage/quantité
              // ET nombre) — pas dès la simple sélection de l'article.
              const ligneRenseignee = row.dosage.trim() !== "" && !Number.isNaN(nombreValeur) && nombreValeur > 0;
              const prixTotal =
                prixUnitaire != null && ligneRenseignee ? prixUnitaire * nombreValeur : null;

              // Statut pharmacie, indépendant du remplissage dosage/nombre : dès que le catalogue
              // Pharmacie a chargé, l'anesthésiste doit savoir en un coup d'œil si le médicament
              // est en stock — pas seulement une fois le prix total calculé. Toujours un des
              // trois états ci-dessous, jamais silencieux : "chargement" tant que le catalogue
              // n'a pas fini de charger (voir catalogueCharge), sinon disponible/indisponible.
              const statutPharmacie: "chargement" | "disponible" | "indisponible" =
                !catalogueCharge ? "chargement" : prixUnitaire != null ? "disponible" : "indisponible";

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    row.selected ? rowSelectedClass[accent] :
                    statutPharmacie === "disponible" ? "bg-emerald-50/60 hover:bg-emerald-50" :
                    statutPharmacie === "indisponible" ? "bg-rose-50/40 hover:bg-rose-50/70" :
                    "hover:bg-surface-container-low/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      accent={accent}
                      size="sm"
                      checked={row.selected}
                      onChange={(e) =>
                        patchRow(row.id, "selected", e.target.checked)
                      }
                    />
                  </td>
                  <td className={`px-4 py-3 font-semibold ${row.selected ? "text-on-surface" : "text-on-surface-variant"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.selected && (
                        <span className="material-symbols-outlined align-text-bottom text-sm text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      )}
                      <span>{row.label}</span>
                      {statutPharmacie === "disponible" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Disponible pharmacie
                        </span>
                      )}
                      {statutPharmacie === "indisponible" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Non disponible
                        </span>
                      )}
                      {statutPharmacie === "chargement" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-on-surface-variant">
                          <span className="h-1.5 w-1.5 rounded-full bg-outline-variant animate-pulse" />
                          Vérification…
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.dosage}
                      onChange={(e) => patchRow(row.id, "dosage", e.target.value)}
                      placeholder={dosagePlaceholder}
                      className={dosageInputClassName}
                    />
                    {/* Choix connus (concentration, calibre, nom alternatif...) : un clic
                        remplit directement le champ ci-dessus, sans avoir à le taper. */}
                    {row.variantes && row.variantes.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {row.variantes.map((variante) => (
                          <button
                            key={variante}
                            type="button"
                            onClick={() => patchRow(row.id, "dosage", variante)}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                              row.dosage === variante
                                ? "border-primary bg-primary text-white"
                                : "border-outline-variant/30 bg-white text-on-surface-variant hover:border-primary/50 hover:text-primary"
                            }`}
                          >
                            {variante}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.nombre}
                      onChange={(e) => patchRow(row.id, "nombre", e.target.value)}
                      placeholder="0"
                      className={nombreInputClassName}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-on-surface-variant">
                    {prixTotal != null ? (
                      <span className="text-emerald-700">{formatAr(prixTotal)}</span>
                    ) : !ligneRenseignee ? (
                      "—"
                    ) : statutPharmacie === "chargement" ? (
                      <span className="text-on-surface-variant italic">Vérification du prix…</span>
                    ) : (
                      <span className="text-rose-500">Non disponible à la pharmacie</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
