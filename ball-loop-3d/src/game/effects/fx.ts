import type { V3 } from '../utils/math'

export interface Burst {
  pos: V3
  color: string | string[]
  count: number
  speed: number
  life?: number
  gravity?: number
  /** Directional bias (e.g. confetti shooting up). */
  up?: number
}

const queue: Burst[] = []

/** Fire-and-forget particle bursts. The Particles component drains this queue each frame. */
export const fx = {
  burst(b: Burst): void {
    if (queue.length < 48) queue.push(b)
  },
  drain(): Burst[] {
    if (queue.length === 0) return queue
    return queue.splice(0, queue.length)
  },
  clear(): void {
    queue.length = 0
  },
}
