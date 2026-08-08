'use client'

import { InputHTMLAttributes } from 'react'

export type CheckboxAccent = 'primary' | 'secondary' | 'tertiary' | 'error' | 'primary-container' | 'inverse-primary'
export type CheckboxSize = 'sm' | 'md' | 'lg'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  accent?: CheckboxAccent
  size?: CheckboxSize
}

// Case à cocher unique pour tous les checklists du projet — forme, taille et couleurs
// standardisées, pour que l'utilisateur retrouve toujours la même interaction visuelle
// (checklist OMS, protocole opératoire, vérification veille, salle de réveil, médicaments...).
const ACCENT_CLASSES: Record<CheckboxAccent, string> = {
  primary: 'accent-primary focus-visible:ring-primary/30',
  secondary: 'accent-secondary focus-visible:ring-secondary/30',
  tertiary: 'accent-tertiary focus-visible:ring-tertiary/30',
  error: 'accent-error focus-visible:ring-error/30',
  'primary-container': 'accent-primary-container focus-visible:ring-primary-container/30',
  'inverse-primary': 'accent-inverse-primary focus-visible:ring-inverse-primary/30',
}

// Agrandies pour faciliter le cochage (accessibilité — utilisateurs ayant des difficultés
// visuelles/de motricité fine) : la taille "md" (par défaut, utilisée partout) reste la
// référence, mais chaque palier est plus grand qu'avant.
const SIZE_CLASSES: Record<CheckboxSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
}

export default function Checkbox({ accent = 'primary', size = 'md', className = '', ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-md border-2 border-outline-variant bg-white cursor-pointer transition-all duration-150 hover:border-on-surface-variant focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${ACCENT_CLASSES[accent]} ${className}`}
      {...props}
    />
  )
}
