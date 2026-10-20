import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  title?: string
  onClose?: () => void
  children: ReactNode
  wide?: boolean
}

/** Centered dialog with a dimmed backdrop. Escape and backdrop click close it when onClose is provided. */
export function Modal({ open, title, onClose, children, wide }: Props) {
  useEffect(() => {
    if (!open || !onClose) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a22]/70 anim-fade safe-pad"
      onPointerDown={e => { if (e.target === e.currentTarget) onClose?.() }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`glass anim-pop rounded-3xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[92dvh] overflow-y-auto`}>
        {title && <h2 className="text-2xl font-black uppercase tracking-wide mb-4 title-grad">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
