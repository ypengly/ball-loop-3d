import { appendSegments, contentMinY, emptyContent } from '../levels/levelBuilder'
import type { Feature, LevelContent, Segment, TurtleState } from '../levels/levelTypes'
import { createRng, type Rng, type V3 } from '../utils/math'

export interface EndlessChunk {
  index: number
  content: LevelContent
  /** Lowest point of this chunk (used for the fall boundary). */
  minY: number
  kind: string
  /** Path distance (m) from the course start to this chunk's first sample. */
  baseDistance: number
  /** Path length of this chunk. */
  length: number
  endTurtle: TurtleState
}

const MAX_YAW = (75 * Math.PI) / 180
const MIN_Y = -6
const MAX_Y = 22

type SectionBuilder = (g: GenState, d: number) => Segment[]

interface GenState {
  rng: Rng
  turtle: TurtleState
  index: number
}

const gemRow = (rng: Rng, chance = 0.7): Feature[] =>
  rng.chance(chance) ? [{ k: 'gems', from: 0.2, to: 0.8, count: rng.int(2, 4), lat: rng.range(-1, 1) }] : []

const widthFor = (d: number, wide: number, narrow: number) => wide - (wide - narrow) * Math.min(1, d)

/** Curve direction that pulls the heading back towards straight ahead so the course never doubles back. */
function curveSegment(g: GenState, d: number): Segment {
  const yaw = g.turtle.yaw
  let dir = g.rng.chance(0.5) ? 1 : -1
  if (yaw > MAX_YAW * 0.5) dir = -1
  if (yaw < -MAX_YAW * 0.5) dir = 1
  let angle = g.rng.int(35, 90)
  // Keep the resulting heading inside the allowed cone.
  while (Math.abs(yaw + (dir * angle * Math.PI) / 180) > MAX_YAW && angle > 20) angle -= 10
  const radius = g.rng.range(12, 18)
  return { t: 'curve', angle: dir * angle, radius, width: widthFor(d, 6.5, 4), features: gemRow(g.rng, 0.5) }
}

const SECTIONS: { id: string; minD: number; weight: number; build: SectionBuilder }[] = [
  {
    id: 'straight', minD: 0, weight: 3,
    build: (g, d) => [{ t: 'straight', length: g.rng.int(14, 26), width: widthFor(d, 7, 5), features: gemRow(g.rng, 0.9) }],
  },
  { id: 'curve', minD: 0, weight: 3, build: (g, d) => [curveSegment(g, d), { t: 'straight', length: 8, width: widthFor(d, 6.5, 4.5) }] },
  {
    id: 'gap', minD: 0.04, weight: 3,
    build: (g, d) => [
      { t: 'straight', length: 8, width: 6 },
      { t: 'gap', length: 4.5 + d * 3 + g.rng.range(0, 0.8) },
      { t: 'straight', length: 12, width: widthFor(d, 6, 4.5), features: gemRow(g.rng, 0.6) },
    ],
  },
  {
    id: 'bridge', minD: 0.08, weight: 2,
    build: (g, d) => [
      { t: 'straight', length: 6, width: 5 },
      { t: 'bridge', length: g.rng.int(18, 30), width: widthFor(d, 2.8, 2.2), features: gemRow(g.rng, 0.8) },
      { t: 'straight', length: 6, width: 5 },
    ],
  },
  {
    id: 'hill', minD: 0.05, weight: 2,
    build: (g) => {
      const y = g.turtle.pos[1]
      const up = y < 4 ? true : y > MAX_Y - 6 ? false : g.rng.chance(0.5)
      const rise = (up ? 1 : -1) * g.rng.range(2.5, 5)
      const ny = y + rise
      const r = ny < MIN_Y || ny > MAX_Y ? -rise : rise
      return [{ t: 'ramp', length: g.rng.int(12, 18), rise: r, width: 6, rails: g.rng.chance(0.4) }, { t: 'straight', length: 8, width: 6 }]
    },
  },
  {
    id: 'jump', minD: 0.12, weight: 2,
    build: (_g, d) => [
      { t: 'straight', length: 8, width: 6 },
      { t: 'launch', length: 9, rise: 2.4, width: 5 },
      { t: 'gap', length: 6 + d * 2, drop: 1 },
      { t: 'straight', length: 14, width: widthFor(d, 6, 5), features: [{ k: 'gems', from: 0.2, to: 0.7, count: 3, h: 0 }] },
    ],
  },
  {
    id: 'loop', minD: 0.2, weight: 2,
    build: (g) => [
      { t: 'straight', length: 38, width: 6, features: [{ k: 'boost', at: 0.9, strength: 24 }] },
      { t: 'loop', radius: g.rng.range(5, 6.2), features: [{ k: 'gem', at: 0.5, h: -0.2 }] },
      { t: 'straight', length: 14, width: 6 },
    ],
  },
  {
    id: 'platform', minD: 0.28, weight: 2,
    build: (g) => [
      { t: 'straight', length: 8, width: 6 },
      { t: 'platform', axis: 'forward', gap: g.rng.int(16, 22), size: [5.5, 5], period: g.rng.range(7, 9), phase: g.rng.range(0, 1) },
      { t: 'straight', length: 8, width: 6 },
    ],
  },
  {
    id: 'falling', minD: 0.3, weight: 2,
    build: (g, d) => [
      { t: 'straight', length: 8, width: 6 },
      { t: 'falling', tiles: g.rng.int(4, 7), delay: 0.8 - 0.3 * Math.min(1, d), width: 4.6, vanish: d > 0.6 && g.rng.chance(0.5) },
      { t: 'straight', length: 8, width: 6 },
    ],
  },
  {
    id: 'pendulum', minD: 0.4, weight: 2,
    build: (g, d) => [
      { t: 'straight', length: 10, width: 7 },
      {
        t: 'straight', length: g.rng.int(20, 30), width: 7,
        features: [{ k: 'pendulum', at: 0.5, period: 3.6 - d * 0.5, amplitude: 0.85, phase: g.rng.range(0, 3) }],
      },
      { t: 'straight', length: 8, width: 7 },
    ],
  },
  {
    id: 'beam', minD: 0.5, weight: 1.5,
    build: (g, d) => [
      { t: 'straight', length: 10, width: 7 },
      { t: 'straight', length: 18, width: 7, features: [{ k: 'beam', at: 0.5, speed: (g.rng.chance(0.5) ? 1 : -1) * (1.2 + d * 0.4) }] },
      { t: 'straight', length: 8, width: 7 },
    ],
  },
  {
    id: 'halfpipe', minD: 0.15, weight: 1,
    build: () => [
      { t: 'straight', length: 8, width: 6 },
      { t: 'halfpipe', length: 26, width: 10, features: [{ k: 'boost', at: 0.4, strength: 18 }, { k: 'gems', from: 0.2, to: 0.9, count: 3, lat: 3.6, h: 0.4 }] },
      { t: 'straight', length: 8, width: 6 },
    ],
  },
  {
    id: 'slow', minD: 0.2, weight: 1,
    build: () => [
      { t: 'straight', length: 8, width: 6 },
      { t: 'straight', length: 18, width: 5.5, features: [{ k: 'slow', at: 0.5, length: 9 }, { k: 'gem', at: 0.5 }] },
      { t: 'straight', length: 6, width: 6 },
    ],
  },
]

export const difficultyAt = (index: number): number => Math.min(1.2, index / 45)

export class EndlessGenerator {
  private rng: Rng
  private turtle: TurtleState = { pos: [0, 0, 0] as V3, yaw: 0 }
  private index = 0
  private baseDistance = 0
  private lastId = ''

  constructor(public readonly seed: number) {
    this.rng = createRng(seed)
  }

  next(): EndlessChunk {
    const index = this.index++
    const d = difficultyAt(index)
    const content = emptyContent()
    let kind = 'start'
    let segs: Segment[]
    if (index === 0) {
      segs = [{ t: 'start', length: 14 }, { t: 'straight', length: 20, width: 7, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 4 }] }]
    } else {
      const g: GenState = { rng: this.rng, turtle: this.turtle, index }
      const pool = SECTIONS.filter(s => s.minD <= d && s.id !== this.lastId)
      const total = pool.reduce((a, s) => a + s.weight, 0)
      let r = this.rng.range(0, total)
      let pick = pool[0]
      for (const s of pool) {
        r -= s.weight
        if (r <= 0) { pick = s; break }
      }
      kind = pick.id
      this.lastId = pick.id
      segs = pick.build(g, d)
    }
    const end = appendSegments(content, this.turtle, segs, `c${index}-`)
    const len = content.path.length ? content.path[content.path.length - 1].d : 0
    const chunk: EndlessChunk = { index, content, minY: contentMinY(content), kind, baseDistance: this.baseDistance, length: len, endTurtle: end }
    this.baseDistance += len
    this.turtle = end
    return chunk
  }
}

export function generateChunks(seed: number, count: number): EndlessChunk[] {
  const g = new EndlessGenerator(seed)
  return Array.from({ length: count }, () => g.next())
}

/** Concatenate chunk contents into a single LevelContent for validation or a combined physics run. */
export function mergeChunks(chunks: readonly EndlessChunk[]): LevelContent {
  const out = emptyContent()
  let offset = chunks[0]?.baseDistance ?? 0
  for (const ch of chunks) {
    const c = ch.content
    out.pieces.push(...c.pieces)
    out.gems.push(...c.gems)
    out.boosts.push(...c.boosts)
    out.slows.push(...c.slows)
    out.platforms.push(...c.platforms)
    out.beams.push(...c.beams)
    out.pendulums.push(...c.pendulums)
    out.falling.push(...c.falling)
    out.jumpMarks.push(...c.jumpMarks)
    c.path.forEach((p, i) => {
      const last = out.path[out.path.length - 1]
      if (i === 0 && last && Math.hypot(last.p[0] - p.p[0], last.p[1] - p.p[1], last.p[2] - p.p[2]) < 1e-6) return
      out.path.push({ p: p.p, d: p.d + offset })
    })
    offset += ch.length
    if (!out.start && c.start) out.start = c.start
  }
  return out
}
