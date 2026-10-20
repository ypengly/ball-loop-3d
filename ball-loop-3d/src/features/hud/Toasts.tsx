import { useEffect } from 'react'
import { useGame } from '../../store/gameStore'

export function Toasts() {
  const toasts = useGame(s => s.toasts)
  const dismiss = useGame(s => s.dismissToast)
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map(t => window.setTimeout(() => dismiss(t.id), 2200))
    return () => timers.forEach(window.clearTimeout)
  }, [toasts, dismiss])
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-40 flex flex-col items-center gap-2" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="glass anim-pop rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-wide text-mint">{t.text}</div>
      ))}
    </div>
  )
}
