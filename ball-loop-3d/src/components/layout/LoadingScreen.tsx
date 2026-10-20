import { Logo } from '../ui/Logo'

export function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-linear-to-b from-[#0b1a5a] to-[#0b1230] anim-fade" role="status" aria-live="polite">
      <Logo className="w-[min(80vw,420px)]" />
      <div className="h-2 w-52 overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-1/2 rounded-full bg-linear-to-r from-cyan to-magenta" style={{ animation: 'pulse-soft 1s ease-in-out infinite' }} />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-white/60">Loading physics…</p>
    </div>
  )
}
