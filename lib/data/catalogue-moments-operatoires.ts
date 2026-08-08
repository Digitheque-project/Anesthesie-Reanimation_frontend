// Le catalogue des boutons de la chronologie opératoire (Anesthésie/Chirurgie/Divers) est
// désormais servi dynamiquement par le backend (GET /moments-catalogue) — voir
// MomentsTimeline.tsx — plutôt que codé en dur ici, pour permettre à chaque rôle d'ajouter un
// bouton réutilisable sans déploiement. Seul le type de catégorie reste utile côté frontend.
export type CategorieMoment = 'ANESTHESIE' | 'CHIRURGIE' | 'DIVERS'
