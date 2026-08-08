'use client'

import { InputHTMLAttributes } from 'react'
import type { CheckboxSize } from './Checkbox'

export type RadioAccent = 'primary' | 'secondary' | 'tertiary' | 'error'

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  accent?: RadioAccent
  size?: CheckboxSize
}

// Bouton radio compagnon de Checkbox, même langage visuel (couleur, taille, focus) — utilisé aux
// côtés des cases à cocher dans les mêmes checklists (Oui/Non).
const ACCENT_CLASSES: Record<RadioAccent, string> = {
  primary: 'accent-primary focus-visible:ring-primary/30',
  secondary: 'accent-secondary focus-visible:ring-secondary/30',
  tertiary: 'accent-tertiary focus-visible:ring-tertiary/30',
  error: 'accent-error focus-visible:ring-error/30',
}

// Agrandies pour faciliter le cochage (accessibilité), même palier que Checkbox.
const SIZE_CLASSES: Record<CheckboxSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
}

export default function Radio({ accent = 'primary', size = 'md', className = '', ...props }: RadioProps) {
  return (
    <input
      type="radio"
      className={`${SIZE_CLASSES[size]} shrink-0 border-2 border-outline-variant bg-white cursor-pointer transition-all duration-150 hover:border-on-surface-variant focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${ACCENT_CLASSES[accent]} ${className}`}
      {...props}
    />
  )
}
