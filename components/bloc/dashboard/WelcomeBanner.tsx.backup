'use client'

const ROLE_LABELS: Record<string, string> = {
  ROLE_ANESTHESISTE: 'Anesthésiste',
  ROLE_CHIRURGIEN: 'Chirurgien',
  ROLE_INFIRMIER_BLOC: 'Infirmier(ère) de Bloc',
  ROLE_SECRETAIRE_MEDICALE: 'Secrétaire Médicale',
  ROLE_DIRECTEUR_MEDICAL: 'Directeur Médical',
  ROLE_ADMIN: 'Administrateur',
  ROLE_AIDE_SOIGNANT: 'Aide-Soignant(e)',
}

interface WelcomeBannerProps {
  nom: string
  role: string | null
  onLogout: () => void
}

export default function WelcomeBanner({ nom, role, onLogout }: WelcomeBannerProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/30 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-extrabold text-on-surface">Bonjour, {nom || 'Utilisateur'}</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Rôle : <span className="font-bold text-primary">{ROLE_LABELS[role || ''] || role || 'Inconnu'}</span>
        </p>
      </div>
      <button onClick={onLogout}
        className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
        Déconnexion
      </button>
    </div>
  )
}
