interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}

export function Slider({ label, value, min, max, step = 0.05, onChange, format }: Props) {
  return (
    <label className="flex items-center gap-3 py-1.5">
      <span className="w-44 shrink-0 text-sm font-bold text-white/85">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 min-w-0 h-8"
      />
      <span className="w-12 text-right text-sm tabular-nums text-white/70">{format ? format(value) : value.toFixed(2)}</span>
    </label>
  )
}
