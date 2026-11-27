'use client'

// Prise de photo d'un document (27/11/2026) : caméra intégrée à la page
// quand le navigateur l'autorise (HTTPS ou localhost), sinon l'appareil photo
// du téléphone / de la tablette via le sélecteur de fichier « capture ».
import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, X } from 'lucide-react'

export default function PrisePhoto({
  disabled,
  onPhoto,
  className,
}: {
  disabled?: boolean
  onPhoto: (fichier: File) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fluxRef = useRef<MediaStream | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const [apercu, setApercu] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const arreter = () => {
    fluxRef.current?.getTracks().forEach((t) => t.stop())
    fluxRef.current = null
  }
  useEffect(() => arreter, [])

  const demarrer = async () => {
    setErreur(null)
    setApercu(null)
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      fluxRef.current = flux
      if (videoRef.current) {
        videoRef.current.srcObject = flux
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      setErreur("Caméra inaccessible (autorisation refusée ou aucune caméra). Vous pouvez importer le fichier à la place.")
    }
  }

  const ouvrir = () => {
    const cameraIntegree = typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
    if (!cameraIntegree) {
      inputRef.current?.click()
      return
    }
    setOuvert(true)
    setTimeout(demarrer, 50)
  }

  const fermer = () => {
    arreter()
    setOuvert(false)
    setApercu(null)
  }

  const capturer = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')?.drawImage(v, 0, 0)
    setApercu(canvas.toDataURL('image/jpeg', 0.9))
  }

  const garder = async () => {
    if (!apercu) return
    const blob = await (await fetch(apercu)).blob()
    const nom = `photo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`
    onPhoto(new File([blob], nom, { type: 'image/jpeg' }))
    fermer()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onPhoto(f)
        }}
      />
      <button type="button" onClick={ouvrir} disabled={disabled} className={className}>
        <Camera className="h-9 w-9" />
        <span className="text-sm font-bold">Prendre en photo</span>
        <span className="text-[11px] text-on-surface-variant">Avec la caméra de l'appareil</span>
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <p className="font-bold text-gray-800">Photographier le document</p>
              <button type="button" onClick={fermer} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-black">
              {apercu ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={apercu} alt="Aperçu de la photo" className="mx-auto max-h-[65vh] w-auto" />
              ) : (
                <video ref={videoRef} playsInline muted className="mx-auto max-h-[65vh] w-full" />
              )}
            </div>
            {erreur && <p className="px-5 pt-3 text-sm font-medium text-red-600">{erreur}</p>}
            <div className="flex justify-end gap-2 px-5 py-4">
              {apercu ? (
                <>
                  <button type="button" onClick={() => { setApercu(null); void demarrer() }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <RotateCcw className="h-4 w-4" /> Reprendre
                  </button>
                  <button type="button" onClick={garder} className="rounded-xl bg-[#006A8C] px-5 py-2 text-sm font-bold text-white hover:bg-[#005A76]">
                    Utiliser cette photo
                  </button>
                </>
              ) : (
                <button type="button" onClick={capturer} disabled={!!erreur} className="inline-flex items-center gap-2 rounded-xl bg-[#006A8C] px-5 py-2 text-sm font-bold text-white hover:bg-[#005A76] disabled:opacity-50">
                  <Camera className="h-4 w-4" /> Capturer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
