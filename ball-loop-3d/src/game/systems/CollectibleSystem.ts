import { dist, type V3 } from '../utils/math'
import type { GemEl } from '../levels/levelTypes'

export const GEM_PICKUP_RADIUS = 1.15

/** Returns ids of gems newly touched by the ball. Already collected ids are never returned twice. */
export function collectGems(gems: readonly GemEl[], collected: ReadonlySet<string>, ballPos: V3): string[] {
  const out: string[] = []
  for (const g of gems) {
    if (collected.has(g.id)) continue
    if (dist(g.pos, ballPos) <= GEM_PICKUP_RADIUS) out.push(g.id)
  }
  return out
}
