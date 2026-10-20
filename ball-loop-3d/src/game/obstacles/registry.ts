import { useEffect, useRef } from 'react'

type Tick = (simTime: number, dt: number) => void
const ticks = new Set<Tick>()

/**
 * Obstacles register a callback that runs once per FIXED physics step (before the step), so kinematic bodies move
 * deterministically, freeze while paused, and restart from t=0 with the level.
 */
export function useObstacleTick(fn: Tick): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const t: Tick = (s, d) => ref.current(s, d)
    ticks.add(t)
    return () => { ticks.delete(t) }
  }, [])
}

export function runObstacleTicks(simTime: number, dt: number): void {
  for (const t of ticks) t(simTime, dt)
}

export function clearObstacleTicks(): void {
  ticks.clear()
}
