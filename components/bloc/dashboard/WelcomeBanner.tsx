'use client'

interface WelcomeBannerProps {
  nom: string
  role: string | null
}

const dateDuJour = () => {
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export default function WelcomeBanner({ nom, role }: WelcomeBannerProps) {
  return (
    <div className="bg-primary-container/10 border-l-4 border-primary p-6 rounded-r-xl flex items-center gap-4">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary text-2xl">group</span>
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Bonjour, {nom || 'Utilisateur'}</h1>
        <p className="text-sm font-medium text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">calendar_month</span>
          {dateDuJour()} — {role || 'Rôle inconnu'}
        </p>
      </div>
    </div>
  )
}
