import type { LevelContent, CheckpointEl } from '../levels/levelTypes'
import { addScaled, UP, type V3 } from '../utils/math'
import { inYawBox } from './CollisionSystem'

export interface RespawnPoint {
  /** -1 means the level start. */
  index: number
  pos: V3
  yaw: number
}

export function startRespawn(content: LevelContent): RespawnPoint {
  const s = content.start
  return { index: -1, pos: s ? s.pos : [0, 2, 0], yaw: s ? s.yaw : 0 }
}

export function checkpointRespawn(cp: CheckpointEl): RespawnPoint {
  return { index: cp.index, pos: addScaled(cp.pos, UP, 0.95), yaw: cp.yaw }
}

/** The next checkpoint (higher index than current) the ball is touching, if any. */
export function touchedCheckpoint(content: LevelContent, current: RespawnPoint, ball: V3): CheckpointEl | null {
  for (const cp of content.checkpoints) {
    if (cp.index <= current.index) continue
    if (inYawBox(ball, cp.pos, cp.yaw, cp.width / 2 + 0.6, 1.6, -1.5, 4.5)) return cp
  }
  return null
}
