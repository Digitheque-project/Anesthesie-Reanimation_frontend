'use client'

import { useRef, useState } from 'react'
import { envoyerFichier, recupererFichier, supprimerFichier, isUploadApiConfigured } from '@/lib/clinical/upload-api'

export interface PieceJointe {
  label: string
  nomFichier: string
}

interface Props {
  value: PieceJointe[]
  onChange: (value: PieceJointe[]) => void
  disabled?: boolean
}

// Pièces jointes génériques (résultats d'examens scannés, autorisation d'opérer signée...) —
// stockées sur le service externe "Upload" (voir lib/clinical/upload-api.ts). Réutilisable
// partout où un enregistrement a besoin de fichiers joints (CPA en premier lieu).
export default function PiecesJointesUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [labelEnCours, setLabelEnCours] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)

  if (!isUploadApiConfigured()) {
    return <p className="text-xs text-on-surface-variant italic">Stockage de pièces jointes non configuré.</p>
  }

  const declencherSelection = () => {
    if (!labelEnCours.trim()) { alert('Indiquez un libellé pour ce document avant de le sélectionner.'); return }
    inputRef.current?.click()
  }

  const gererSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setEnvoiEnCours(true)
    try {
      const { nomFichier } = await envoyerFichier(fichier)
      onChange([...value, { label: labelEnCours.trim(), nomFichier }])
      setLabelEnCours('')
    } catch (err: any) {
      console.error(err)
      alert('❌ Échec de l\'envoi du fichier : ' + (err.message || 'erreur inconnue'))
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const voir = async (pj: PieceJointe) => {
    setActionEnCours(pj.nomFichier)
    try {
      const blob = await recupererFichier(pj.nomFichier)
      const url = URL.createObjectURL(blob)
      // Un fichier au contenu non prévisualisable en toute sécurité (HTML/SVG/script déguisé en
      // pièce jointe) ne doit jamais être ouvert inline — seuls les types réellement affichables
      // sans risque d'exécution (image, PDF) le sont ; tout le reste est forcé en téléchargement.
      const previsualisable = blob.type.startsWith('image/') || blob.type === 'application/pdf'
      if (previsualisable) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        const lien = document.createElement('a')
        lien.href = url
        lien.download = pj.nomFichier
        document.body.appendChild(lien)
        lien.click()
        lien.remove()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      console.error(err)
      alert('❌ Échec de la récupération du fichier : ' + (err.message || 'erreur inconnue'))
    } finally {
      setActionEnCours(null)
    }
  }

  const retirer = async (pj: PieceJointe) => {
    if (!confirm(`Supprimer la pièce jointe « ${pj.label} » ?`)) return
    setActionEnCours(pj.nomFichier)
    try {
      await supprimerFichier(pj.nomFichier)
      onChange(value.filter((v) => v.nomFichier !== pj.nomFichier))
    } catch (err: any) {
      console.error(err)
      alert('❌ Échec de la suppression : ' + (err.message || 'erreur inconnue'))
    } finally {
      setActionEnCours(null)
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((pj) => (
            <li key={pj.nomFichier} className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-primary text-lg">description</span>
              <span className="flex-1 font-medium truncate">{pj.label}</span>
              <button type="button" disabled={!!actionEnCours} onClick={() => voir(pj)} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
                {actionEnCours === pj.nomFichier ? '...' : 'Voir'}
              </button>
              {!disabled && (
                <button type="button" disabled={!!actionEnCours} onClick={() => retirer(pj)} className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50">
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <input type="text" value={labelEnCours} onChange={(e) => setLabelEnCours(e.target.value)}
            placeholder="Libellé (ex. ECG, Radio pulmonaire...)"
            className="flex-1 bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm" />
          <button type="button" onClick={declencherSelection} disabled={envoiEnCours}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 disabled:opacity-50">
            <span className="material-symbols-outlined text-base">attach_file</span>
            {envoiEnCours ? 'Envoi...' : 'Joindre'}
          </button>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={gererSelection} />
        </div>
      )}
    </div>
  )
}
