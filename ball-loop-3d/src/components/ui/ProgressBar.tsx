export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={`h-2.5 w-full rounded-full bg-white/15 overflow-hidden ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-linear-to-r from-cyan to-mint transition-[width] duration-150" style={{ width: `${pct}%` }} />
    </div>
  )
}
