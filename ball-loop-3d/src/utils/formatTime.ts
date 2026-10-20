/** Format seconds as m:ss.cc (e.g. 1:05.42). Invalid input renders as a placeholder. */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '--:--.--'
  const totalCs = Math.floor(seconds * 100 + 1e-6)
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const s = totalSec % 60
  const m = Math.floor(totalSec / 60)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/** Format a distance in metres, e.g. 1234 -> "1,234 m". */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '0 m'
  return `${Math.floor(meters).toLocaleString('en-US')} m`
}
