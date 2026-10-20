import { hashString } from '../../game/utils/math'

/**
 * Daily challenge rotation. The course for a given date is fully determined by the (local) date string, so any
 * device produces the same course for the same calendar date. Dates use the DEVICE's local clock, not a server,
 * so players in different time zones see different "days" at different moments.
 */
export type DailyKind = 'level' | 'endless'

export interface DailySpec {
  /** YYYY-MM-DD in the device's local time zone. */
  date: string
  kind: DailyKind
  /** For `level`: id of the featured level. */
  levelId: string | null
  /** Seed used by the endless generator and any randomised flavour. */
  seed: number
  title: string
  description: string
}

/** Configurable rotation. Edit this list to change which courses appear. */
export const DAILY_ROTATION: readonly { kind: DailyKind; levelId?: string; title: string }[] = [
  { kind: 'level', levelId: 'speed-circuit', title: 'Speed Circuit Sprint' },
  { kind: 'endless', title: 'Daily Endless Run' },
  { kind: 'level', levelId: 'sky-bridge', title: 'Sky Bridge Dash' },
  { kind: 'level', levelId: 'pendulum-run', title: 'Pendulum Gauntlet' },
  { kind: 'endless', title: 'Daily Endless Run' },
  { kind: 'level', levelId: 'ultimate-loop', title: 'Ultimate Challenge' },
  { kind: 'level', levelId: 'moving-world', title: 'Moving World Rush' },
]

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Days since 1970-01-01 for a YYYY-MM-DD string (time-zone independent). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

export function getDailySpec(date: string = localDateString(), rotation = DAILY_ROTATION): DailySpec {
  const entry = rotation[((dayNumber(date) % rotation.length) + rotation.length) % rotation.length]
  const seed = hashString(`ballloop3d:${date}`)
  return {
    date,
    kind: entry.kind,
    levelId: entry.kind === 'level' ? entry.levelId ?? null : null,
    seed,
    title: entry.title,
    description:
      entry.kind === 'level'
        ? 'Today\'s featured course. Set your best time.'
        : 'A fixed endless course generated from today\'s seed.',
  }
}
