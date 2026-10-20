import type { FallingEl, LevelContent } from '../levels/levelTypes'
import { dist, type V3 } from '../utils/math'
import { collectGems } from './CollectibleSystem'
import { checkpointRespawn, startRespawn, touchedCheckpoint, type RespawnPoint } from './CheckpointSystem'
import { inFrameBox, inYawBox } from './CollisionSystem'
import { FALL_GRAVITY } from '../obstacles/motion'

export interface TileState {
  el: FallingEl
  /** Sim time at which the tile was first touched, or -1. */
  touched: number
  fallen: boolean
  vy: number
  /** Vertical offset from the resting position (<= 0). */
  dy: number
}

export interface BoostHit { dir: V3; strength: number; id: string }

export interface StepEvents {
  gems: string[]
  checkpoint: RespawnPoint | null
  boosts: BoostHit[]
  slowFactor: number
  finished: boolean
  fell: boolean
  /** Tile indices that began to fall this step. */
  tilesReleased: number[]
  /** Tile indices that were touched (to shake) this step. */
  tilesTouched: number[]
}

/**
 * All per-step gameplay triggers, independent of rendering and of the physics engine. The React scene and the
 * headless tests call exactly the same code.
 */
export class RunLogic {
  readonly collected = new Set<string>()
  respawn: RespawnPoint
  tiles: TileState[]
  private tileMap = new Map<string, TileState>()
  finished = false
  checkpointsHit = 0

  constructor(public content: LevelContent, public killY: number) {
    this.respawn = startRespawn(content)
    this.tiles = content.falling.map(el => ({ el, touched: -1, fallen: false, vy: 0, dy: 0 }))
    this.tiles.forEach(t => this.tileMap.set(t.el.id, t))
  }

  tileFor(id: string): TileState | undefined {
    return this.tileMap.get(id)
  }

  /** Swap in new content (endless mode appends chunks). Existing state for old ids is kept. */
  setContent(content: LevelContent): void {
    this.content = content
    const old = new Map(this.tiles.map(t => [t.el.id, t]))
    this.tiles = content.falling.map(el => old.get(el.id) ?? { el, touched: -1, fallen: false, vy: 0, dy: 0 })
    this.tileMap = new Map(this.tiles.map(t => [t.el.id, t]))
  }

  resetTiles(): void {
    for (const t of this.tiles) {
      t.touched = -1
      t.fallen = false
      t.vy = 0
      t.dy = 0
    }
  }

  /** Advance falling tiles and evaluate triggers for one fixed step. */
  step(simT: number, dt: number, pos: V3, vel: V3, active = true): StepEvents {
    void vel
    const ev: StepEvents = {
      gems: [], checkpoint: null, boosts: [], slowFactor: 1, finished: false, fell: false, tilesReleased: [], tilesTouched: [],
    }
    const c = this.content

    this.tiles.forEach((t, i) => {
      if (t.fallen) {
        t.vy -= FALL_GRAVITY * dt
        t.dy += t.vy * dt
        return
      }
      if (t.touched >= 0) {
        if (simT - t.touched >= t.el.delay) {
          t.fallen = true
          ev.tilesReleased.push(i)
        }
        return
      }
      const el = t.el
      if (active && inYawBox(pos, [el.pos[0], el.pos[1] + el.size[1] / 2, el.pos[2]], el.yaw, el.size[0] / 2, el.size[2] / 2, 0, 1.4)) {
        t.touched = simT
        ev.tilesTouched.push(i)
      }
    })

    if (!active) return ev

    for (const id of collectGems(c.gems, this.collected, pos)) {
      this.collected.add(id)
      ev.gems.push(id)
    }
    const cp = touchedCheckpoint(c, this.respawn, pos)
    if (cp) {
      this.respawn = checkpointRespawn(cp)
      this.checkpointsHit++
      ev.checkpoint = this.respawn
    }
    for (const b of c.boosts) {
      if (inFrameBox(pos, b.pos, b.dir, b.width / 2, b.length / 2, -1, 2.5)) ev.boosts.push({ dir: b.dir, strength: b.strength, id: b.id })
    }
    for (const sz of c.slows) {
      if (inYawBox(pos, sz.pos, sz.yaw, sz.width / 2, sz.length / 2, -1, 3)) ev.slowFactor = 0.5
    }
    for (const f of c.finishes) {
      if (inYawBox(pos, f.pos, f.yaw, f.width / 2, 1.6, -1.5, 4.5)) {
        this.finished = true
        ev.finished = true
      }
    }
    if (pos[1] < this.killY) ev.fell = true
    return ev
  }

  /** Distance along the centre line (for the HUD progress bar); monotone search from a hint. */
  progressIndex(pos: V3, hint: number): number {
    const path = this.content.path
    if (path.length === 0) return 0
    let i = Math.min(Math.max(hint, 0), path.length - 1)
    // Look a short window around the hint in both directions.
    let best = i
    let bd = dist(path[i].p, pos)
    const lo = Math.max(0, i - 6)
    const hi = Math.min(path.length - 1, i + 14)
    for (let k = lo; k <= hi; k++) {
      const d = dist(path[k].p, pos)
      if (d < bd) { bd = d; best = k }
    }
    i = best
    return i
  }
}
