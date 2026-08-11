'use client'

import { useEffect, useState } from 'react'

// Horloge temps réel (heure + date), affichée en permanence dans la barre supérieure à côté de
// la cloche de notifications — utile au personnel du bloc, où l'heure exacte compte (CPA,
// vérifications veille, interventions). Rafraîchie chaque seconde.
export default function Clock() {
  const [maintenant, setMaintenant] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setMaintenant(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const heure = maintenant.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const date = maintenant.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      // Pastille pleine et plus grande que le reste de la barre : l'heure doit se voir d'un
      // coup d'œil dans une salle de bloc. tabular-nums évite le "saut" du chiffre des secondes.
      className="hidden sm:flex items-center gap-3 pl-4 pr-5 py-2 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white border border-primary/30 shadow-md shadow-primary/25 select-none"
      aria-label={`Heure actuelle : ${heure}`}
    >
      <span
        className="material-symbols-outlined text-white/95 text-3xl"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        schedule
      </span>
      <div className="flex flex-col gap-0.5 leading-none">
        <span className="text-2xl font-extrabold tabular-nums tracking-tight drop-shadow-sm">
          {heure}
        </span>
        <span className="text-[11px] text-white/85 font-bold uppercase tracking-wide">
          {date}
        </span>
      </div>
    </div>
  )
}
