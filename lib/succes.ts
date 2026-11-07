// Message de réussite discret (bas de l'écran, disparaît seul) — remplace les fenêtres
// bloquantes du navigateur après une action déjà confirmée par une fenêtre de l'application.
// Posé directement sur <body> : il reste visible pendant la navigation qui suit l'action.
export function succes(message: string, dureeMs = 4000): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.textContent = message
  Object.assign(el.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    zIndex: '200',
    maxWidth: 'min(560px, calc(100vw - 32px))',
    padding: '12px 18px',
    borderRadius: '12px',
    background: '#065F46',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 8px 24px rgba(0,0,0,.18)',
    transition: 'opacity .3s',
  })
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, dureeMs)
}
