'use client'

import { useEffect, useState } from 'react'
import { Icone } from '@/components/ui/Icone'

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
    day: 'numeric',
    month: 'short',
  })

  return (
    // Discrète, dans le style de la barre de la consultation externe ; tabular-nums évite le
    // « saut » du chiffre des secondes.
    <span className="flex select-none items-center gap-1.5 text-[13px]" aria-label={`Heure actuelle : ${heure}`}>
      <Icone nom="schedule" className="text-[15px] text-[#006A8C]" />
      <span className="font-extrabold tabular-nums text-[#004A66]">{heure}</span>
      <span className="font-semibold text-gray-400">{date}</span>
    </span>
  )
}
