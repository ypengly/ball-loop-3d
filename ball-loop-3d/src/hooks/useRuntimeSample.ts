import { useEffect, useState } from 'react'
import { runtime } from '../game/systems/runtime'

export interface RuntimeSample {
  elapsed: number
  speed: number
  progress: number
  distance: number
  hint: string
  started: boolean
  boost: number
  respawn: number
}

const snap = (): RuntimeSample => ({
  elapsed: runtime.elapsed, speed: runtime.speed, progress: runtime.progress, distance: runtime.distance,
  hint: runtime.hint, started: runtime.started, boost: runtime.boostFlash, respawn: runtime.respawnLeft,
})

/** Samples the mutable run state ~10x/s for the HUD, so React never re-renders per animation frame. */
export function useRuntimeSample(active: boolean, intervalMs = 100): RuntimeSample {
  const [s, setS] = useState<RuntimeSample>(snap)
  useEffect(() => {
    if (!active) return
    setS(snap())
    const id = window.setInterval(() => setS(snap()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])
  return s
}
