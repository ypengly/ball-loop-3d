import {
  UP, addScaled, cross, dist, length, lerp, lerp3, normalize, quatFromBasis, scale, smoothstep, sub,
  yawForward, yawRight, rotateAbout, type V3,
} from '../utils/math'
import { BRIDGE_THICKNESS, RAIL_HEIGHT, RAIL_WIDTH, TRACK_THICKNESS, drivableWidth } from '../tracks/profiles'
import type {
  CuboidSpec, Feature, Frame, LevelContent, LevelDefinition, ProfileKind, ResolvedLevel, Segment,
  TrackPalette, TrackPiece, TurtleState,
} from './levelTypes'

/* ------------------------------------------------------------------ */
/* Frames                                                              */
/* ------------------------------------------------------------------ */

export const frameRight = (f: Frame): V3 => normalize(cross(f.t, f.u))

/** Surface frame from a tangent, assuming the track is not rolled. */
export function levelFrame(p: V3, t: V3): Frame {
  const tn = normalize(t)
  const right = normalize(cross(tn, UP))
  return { p, t: tn, u: normalize(cross(right, tn)) }
}

export const yawOfDir = (d: V3): number => Math.atan2(-d[0], -d[2])

export function emptyContent(): LevelContent {
  return {
    pieces: [], gems: [], checkpoints: [], boosts: [], slows: [], finishes: [],
    platforms: [], beams: [], pendulums: [], falling: [], path: [], jumpMarks: [], start: null,
  }
}

/** Interpolated frame at fraction f (0..1) of a piece's arc length. */
export function pieceFrameAt(piece: TrackPiece, f: number): Frame {
  const target = Math.min(Math.max(f, 0), 1) * piece.length
  const arc = piece.arc
  let i = 1
  while (i < arc.length - 1 && arc[i] < target) i++
  const a = piece.samples[i - 1]
  const b = piece.samples[i]
  const span = arc[i] - arc[i - 1]
  const k = span < 1e-9 ? 0 : (target - arc[i - 1]) / span
  return { p: lerp3(a.p, b.p, k), t: normalize(lerp3(a.t, b.t, k)), u: normalize(lerp3(a.u, b.u, k)) }
}

/* ------------------------------------------------------------------ */
/* Piece construction                                                  */
/* ------------------------------------------------------------------ */

function arcLengths(samples: Frame[]): number[] {
  const arc = [0]
  for (let i = 1; i < samples.length; i++) arc.push(arc[i - 1] + dist(samples[i].p, samples[i - 1].p))
  return arc
}

function straightCuboids(piece: Omit<TrackPiece, 'cuboids'>): CuboidSpec[] {
  const a = piece.samples[0]
  const b = piece.samples[piece.samples.length - 1]
  const t = a.t
  const u = a.u
  const r = frameRight(a)
  const thick = piece.profile === 'bridge' ? BRIDGE_THICKNESS : TRACK_THICKNESS
  const mid = lerp3(a.p, b.p, 0.5)
  const L = piece.length
  const quat = quatFromBasis(r, u, scale(t, -1))
  const out: CuboidSpec[] = [
    { pos: addScaled(mid, u, -thick / 2), half: [piece.width / 2, thick / 2, L / 2], quat },
  ]
  if (piece.profile === 'rails') {
    const off = piece.width / 2 - RAIL_WIDTH / 2
    for (const s of [-1, 1]) {
      const p = addScaled(addScaled(mid, r, off * s), u, RAIL_HEIGHT / 2)
      out.push({ pos: p, half: [RAIL_WIDTH / 2, RAIL_HEIGHT / 2, L / 2], quat })
    }
  }
  return out
}

function makePiece(
  id: string, kind: TrackPiece['kind'], samples: Frame[], width: number, profile: ProfileKind,
  palette: TrackPalette, wantCuboids: boolean,
): TrackPiece {
  const arc = arcLengths(samples)
  const base = { id, kind, samples, width, profile, palette, arc, length: arc[arc.length - 1], isLoop: kind === 'loop' }
  return { ...base, cuboids: wantCuboids ? straightCuboids(base) : null }
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

interface Ctx {
  content: LevelContent
  prefix: string
  counters: Record<string, number>
}

const nid = (ctx: Ctx, kind: string): string => {
  ctx.counters[kind] = (ctx.counters[kind] ?? 0) + 1
  return `${ctx.prefix}${kind}-${ctx.counters[kind]}`
}

function pushPath(content: LevelContent, ps: V3[]): void {
  const MAX_STEP = 3
  for (const p of ps) {
    const last = content.path[content.path.length - 1]
    if (!last) {
      content.path.push({ p, d: 0 })
      continue
    }
    const gap = dist(last.p, p)
    if (gap < 1e-6) continue
    // Keep path samples dense so progress tracking and validation work on long straights and gaps.
    const steps = Math.max(1, Math.ceil(gap / MAX_STEP))
    for (let k = 1; k <= steps; k++) {
      const q = k === steps ? p : lerp3(last.p, p, k / steps)
      const prev = content.path[content.path.length - 1]
      content.path.push({ p: q, d: prev.d + dist(prev.p, q) })
    }
  }
}

function rampSamples(
  turtle: TurtleState, len: number, rise: number, profileFn: (s: number) => number,
): Frame[] {
  const fwd = yawForward(turtle.yaw)
  const n = Math.max(4, Math.ceil(len / 0.7))
  const pts: V3[] = []
  for (let i = 0; i <= n; i++) {
    const s = i / n
    pts.push([
      turtle.pos[0] + fwd[0] * len * s,
      turtle.pos[1] + rise * profileFn(s),
      turtle.pos[2] + fwd[2] * len * s,
    ])
  }
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    return levelFrame(p, sub(b, a))
  })
}

function placeFeatures(ctx: Ctx, piece: TrackPiece, features: Feature[] | undefined): void {
  if (!features) return
  const c = ctx.content
  for (const f of features) {
    switch (f.k) {
      case 'gem': {
        const fr = pieceFrameAt(piece, f.at)
        c.gems.push({ id: nid(ctx, 'gem'), pos: addScaled(addScaled(fr.p, frameRight(fr), f.lat ?? 0), fr.u, 0.95 + (f.h ?? 0)) })
        break
      }
      case 'gems': {
        for (let i = 0; i < f.count; i++) {
          const k = f.count === 1 ? 0.5 : i / (f.count - 1)
          const fr = pieceFrameAt(piece, lerp(f.from, f.to, k))
          const bump = (f.arc ?? 0) * Math.sin(Math.PI * k)
          c.gems.push({
            id: nid(ctx, 'gem'),
            pos: addScaled(addScaled(fr.p, frameRight(fr), f.lat ?? 0), fr.u, 0.95 + (f.h ?? 0) + bump),
          })
        }
        break
      }
      case 'checkpoint': {
        const fr = pieceFrameAt(piece, f.at)
        c.checkpoints.push({
          id: nid(ctx, 'cp'), index: c.checkpoints.length, pos: fr.p, yaw: yawOfDir(fr.t), width: piece.width,
        })
        break
      }
      case 'boost': {
        const fr = pieceFrameAt(piece, f.at)
        c.boosts.push({
          id: nid(ctx, 'boost'), pos: fr.p, dir: fr.t, yaw: yawOfDir(fr.t), strength: f.strength ?? 20,
          width: Math.min(drivableWidth(piece.profile, piece.width) - 0.4, 3.2), length: 3.2,
        })
        break
      }
      case 'slow': {
        const fr = pieceFrameAt(piece, f.at)
        c.slows.push({
          id: nid(ctx, 'slow'), pos: fr.p, yaw: yawOfDir(fr.t),
          width: drivableWidth(piece.profile, piece.width), length: f.length ?? 7,
        })
        break
      }
      case 'beam': {
        const fr = pieceFrameAt(piece, f.at)
        const w = drivableWidth(piece.profile, piece.width)
        c.beams.push({
          id: nid(ctx, 'beam'), center: addScaled(fr.p, fr.u, f.height ?? 0.55),
          length: w + 0.2, speed: f.speed ?? 1.3, arms: f.arms ?? 1, phase: f.phase ?? 0, height: f.height ?? 0.55,
        })
        break
      }
      case 'pendulum': {
        const fr = pieceFrameAt(piece, f.at)
        const len = f.length ?? 6
        c.pendulums.push({
          id: nid(ctx, 'pend'), pivot: addScaled(fr.p, UP, len + 0.75), yaw: yawOfDir(fr.t), length: len,
          amplitude: f.amplitude ?? 0.8, period: f.period ?? 3.6, phase: f.phase ?? 0,
        })
        break
      }
    }
  }
}

function addPiece(ctx: Ctx, piece: TrackPiece, features?: Feature[]): void {
  ctx.content.pieces.push(piece)
  pushPath(ctx.content, piece.samples.map(s => s.p))
  placeFeatures(ctx, piece, features)
}

/**
 * Append segments to `content`, continuing from `turtle`. Because each segment starts exactly where the
 * previous one ended, tracks are connected by construction.
 */
export function appendSegments(
  content: LevelContent, turtle: TurtleState, segments: Segment[], prefix = '',
): TurtleState {
  const ctx: Ctx = { content, prefix, counters: {} }
  let tt: TurtleState = { pos: [...turtle.pos] as V3, yaw: turtle.yaw }
  // Continue numbering so ids stay unique when called repeatedly with the same prefix.
  for (const seg of segments) {
    const fwd = yawForward(tt.yaw)
    const right = yawRight(tt.yaw)
    switch (seg.t) {
      case 'start':
      case 'straight':
      case 'bridge':
      case 'finish': {
        const isStart = seg.t === 'start'
        const isFinish = seg.t === 'finish'
        const isBridge = seg.t === 'bridge'
        const len = seg.t === 'start' ? (seg.length ?? 14) : seg.t === 'finish' ? (seg.length ?? 12) : seg.length
        const width = seg.width ?? (isBridge ? 2.2 : isStart || isFinish ? 7 : 6)
        const rails = seg.t === 'straight' && seg.rails
        const palette: TrackPalette = isStart ? 'start' : isFinish ? 'finish' : isBridge ? 'bridge' : (seg.t === 'straight' && seg.palette) || 'path'
        const profile: ProfileKind = isBridge ? 'bridge' : rails ? 'rails' : 'flat'
        const end = addScaled(tt.pos, fwd, len)
        const a = levelFrame(tt.pos, fwd)
        const b = levelFrame(end, fwd)
        const piece = makePiece(nid(ctx, 'piece'), isBridge ? 'bridge' : 'straight', [a, b], width, profile, palette, true)
        const feats: Feature[] = [...(seg.features ?? [])]
        addPiece(ctx, piece, feats)
        if (isStart && !content.start) {
          content.start = { pos: addScaled(addScaled(tt.pos, fwd, Math.min(3, len * 0.25)), UP, 0.9), yaw: tt.yaw }
        }
        if (isFinish) {
          const fr = pieceFrameAt(piece, 0.45)
          content.finishes.push({ id: nid(ctx, 'finish'), pos: fr.p, yaw: tt.yaw, width })
        }
        tt = { pos: end, yaw: tt.yaw }
        break
      }
      case 'ramp':
      case 'launch': {
        const width = seg.width ?? 6
        const rails = seg.t === 'ramp' && seg.rails
        const k = 0.25
        const launchProfile = (s: number) => (s < k ? (s * s) / (2 * k) : s - k / 2) / (1 - k / 2)
        const samples = rampSamples(tt, seg.length, seg.rise, seg.t === 'ramp' ? smoothstep : launchProfile)
        const piece = makePiece(nid(ctx, 'piece'), seg.t, samples, width, rails ? 'rails' : 'flat', 'path', false)
        addPiece(ctx, piece, seg.features)
        tt = { pos: samples[samples.length - 1].p, yaw: tt.yaw }
        break
      }
      case 'gap': {
        const end = addScaled(tt.pos, fwd, seg.length)
        end[1] -= seg.drop ?? 0
        content.jumpMarks.push({ pos: tt.pos, dir: fwd })
        pushPath(content, [tt.pos, end])
        tt = { pos: end, yaw: tt.yaw }
        break
      }
      case 'curve': {
        const width = seg.width ?? 6
        const ang = (seg.angle * Math.PI) / 180
        const s = Math.sign(ang) || 1
        const R = seg.radius
        const center = addScaled(tt.pos, right, -s * R)
        const n = Math.max(6, Math.ceil((R * Math.abs(ang)) / 0.9))
        const bank = ((seg.bank ?? 0) * Math.PI) / 180
        const samples: Frame[] = []
        for (let i = 0; i <= n; i++) {
          const phi = (ang * i) / n
          const yaw = tt.yaw + phi
          const p = addScaled(center, yawRight(yaw), s * R)
          p[1] = tt.pos[1]
          const t = yawForward(yaw)
          const env = smoothstep(Math.min(i / n / 0.18, (1 - i / n) / 0.18, 1))
          const roll = -s * bank * env
          const base = levelFrame(p, t)
          samples.push({ p, t, u: rotateAbout(base.u, t, roll) })
        }
        const piece = makePiece(nid(ctx, 'piece'), 'curve', samples, width, seg.rails ? 'rails' : 'flat', 'path', false)
        addPiece(ctx, piece, seg.features)
        tt = { pos: samples[samples.length - 1].p, yaw: tt.yaw + ang }
        break
      }
      case 'loop': {
        const width = seg.width ?? 5
        const R = seg.radius
        const offset = width + 1.2
        const n = 72
        const samples: Frame[] = []
        for (let i = 0; i <= n; i++) {
          const th = (2 * Math.PI * i) / n
          const lat = (offset * i) / n
          const p: V3 = [
            tt.pos[0] + fwd[0] * R * Math.sin(th) + right[0] * lat,
            tt.pos[1] + R * (1 - Math.cos(th)),
            tt.pos[2] + fwd[2] * R * Math.sin(th) + right[2] * lat,
          ]
          // Tangent in the (forward, up) plane plus the small lateral drift.
          const tPlane: V3 = [fwd[0] * Math.cos(th), Math.sin(th), fwd[2] * Math.cos(th)]
          const t = normalize(addScaled(scale(tPlane, R), right, offset / (2 * Math.PI)))
          // Inward normal (towards the loop centre) = (-sin th * fwd, cos th * up)
          const inward: V3 = [-fwd[0] * Math.sin(th), Math.cos(th), -fwd[2] * Math.sin(th)]
          const r = normalize(cross(t, inward))
          const u = normalize(cross(r, t))
          samples.push({ p, t, u })
        }
        const piece = makePiece(nid(ctx, 'piece'), 'loop', samples, width, 'rails', 'loop', false)
        addPiece(ctx, piece, seg.features)
        tt = { pos: samples[samples.length - 1].p, yaw: tt.yaw }
        break
      }
      case 'halfpipe': {
        const width = seg.width ?? 8
        const end = addScaled(tt.pos, fwd, seg.length)
        const n = Math.max(2, Math.ceil(seg.length / 2))
        const samples: Frame[] = []
        for (let i = 0; i <= n; i++) samples.push(levelFrame(lerp3(tt.pos, end, i / n), fwd))
        const piece = makePiece(nid(ctx, 'piece'), 'halfpipe', samples, width, 'halfpipe', 'halfpipe', false)
        addPiece(ctx, piece, seg.features)
        tt = { pos: end, yaw: tt.yaw }
        break
      }
      case 'turn': {
        tt = { pos: tt.pos, yaw: tt.yaw + (seg.angle * Math.PI) / 180 }
        break
      }
      case 'branch': {
        const k = (ctx.counters['branch'] = (ctx.counters['branch'] ?? 0) + 1)
        const sub = emptyContent()
        appendSegments(sub, tt, seg.segments, `${prefix}br${k}-`)
        content.pieces.push(...sub.pieces)
        content.gems.push(...sub.gems)
        content.boosts.push(...sub.boosts)
        content.slows.push(...sub.slows)
        content.platforms.push(...sub.platforms)
        content.beams.push(...sub.beams)
        content.pendulums.push(...sub.pendulums)
        content.falling.push(...sub.falling)
        break
      }
      case 'platform': {
        const size = seg.size ?? [6, 5]
        const thick = 0.6
        const phase = seg.phase ?? 0
        if (seg.axis === 'forward') {
          const gap = seg.gap ?? 16
          const L = size[1]
          const a = addScaled(addScaled(tt.pos, fwd, L / 2 + 0.2), UP, -thick / 2)
          const b = addScaled(addScaled(tt.pos, fwd, gap - L / 2 - 0.2), UP, -thick / 2)
          content.platforms.push({ id: nid(ctx, 'plat'), a, b, size: [size[0], thick, L], yaw: tt.yaw, period: seg.period, phase })
          const end = addScaled(tt.pos, fwd, gap)
          pushPath(content, [tt.pos, end])
          tt = { pos: end, yaw: tt.yaw }
        } else if (seg.axis === 'vertical') {
          const rise = seg.rise ?? 5
          const L = size[1]
          const gap = L + 0.5
          const mid = addScaled(tt.pos, fwd, gap / 2)
          const a = addScaled(mid, UP, -thick / 2)
          const b = addScaled(a, UP, rise)
          content.platforms.push({ id: nid(ctx, 'plat'), a, b, size: [size[0], thick, L], yaw: tt.yaw, period: seg.period, phase })
          const end = addScaled(addScaled(tt.pos, fwd, gap), UP, rise)
          pushPath(content, [tt.pos, end])
          tt = { pos: end, yaw: tt.yaw }
        } else {
          const L = size[1]
          const gap = L + 0.5
          const travel = seg.travel ?? 5
          const mid = addScaled(addScaled(tt.pos, fwd, gap / 2), UP, -thick / 2)
          const a = addScaled(mid, right, -travel)
          const b = addScaled(mid, right, travel)
          content.platforms.push({ id: nid(ctx, 'plat'), a, b, size: [size[0], thick, L], yaw: tt.yaw, period: seg.period, phase })
          const end = addScaled(tt.pos, fwd, gap)
          pushPath(content, [tt.pos, end])
          tt = { pos: end, yaw: tt.yaw }
        }
        break
      }
      case 'falling': {
        const L = seg.tileLength ?? 3.6
        const spacing = seg.spacing ?? 0.35
        const width = seg.width ?? 5
        const thick = 0.6
        let pos = tt.pos
        for (let i = 0; i < seg.tiles; i++) {
          const center = addScaled(addScaled(pos, fwd, L / 2), UP, -thick / 2)
          content.falling.push({
            id: nid(ctx, 'tile'), pos: center, size: [width, thick, L], yaw: tt.yaw,
            delay: seg.delay ?? 0.7, vanish: !!seg.vanish,
          })
          pos = addScaled(pos, fwd, L + spacing)
        }
        const end = addScaled(pos, fwd, -spacing)
        pushPath(content, [tt.pos, end])
        tt = { pos: end, yaw: tt.yaw }
        break
      }
    }
  }
  return tt
}

/* ------------------------------------------------------------------ */
/* Resolution & validation                                             */
/* ------------------------------------------------------------------ */

export function contentMinY(c: LevelContent): number {
  let m = Infinity
  for (const p of c.pieces) for (const s of p.samples) m = Math.min(m, s.p[1] - 1)
  for (const f of c.falling) m = Math.min(m, f.pos[1] - 1)
  for (const f of c.platforms) m = Math.min(m, Math.min(f.a[1], f.b[1]) - 1)
  for (const p of c.path) m = Math.min(m, p.p[1])
  return Number.isFinite(m) ? m : 0
}

export function resolveLevel(def: LevelDefinition, index: number): ResolvedLevel {
  const content = emptyContent()
  appendSegments(content, { pos: [0, 0, 0], yaw: 0 }, def.segments, '')
  if (!content.start) throw new Error(`Level ${def.id} has no start segment`)
  const total = content.path.length ? content.path[content.path.length - 1].d : 0
  return {
    ...content,
    id: def.id,
    index,
    def,
    killY: contentMinY(content) - 16,
    totalLength: total,
    totalGems: content.gems.length,
  }
}

export interface ValidationIssue { level: string; message: string }

/** Structural checks used by tests and by the dev console. */
export function validateContent(id: string, c: LevelContent, requireFinish: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const bad = (m: string) => issues.push({ level: id, message: m })
  if (!c.start) bad('missing start position')
  if (requireFinish && c.finishes.length < 1) bad('missing finish')
  if (c.pieces.length === 0) bad('no track pieces')
  for (const p of c.pieces) {
    if (p.length <= 0.01) bad(`piece ${p.id} has zero length`)
    for (const s of p.samples) {
      if (![...s.p, ...s.t, ...s.u].every(Number.isFinite)) bad(`piece ${p.id} has non-finite sample`)
      if (Math.abs(length(s.t) - 1) > 1e-3 || Math.abs(length(s.u) - 1) > 1e-3) bad(`piece ${p.id} has non-unit frame`)
    }
    if (!p.cuboids && p.samples.length < 3) bad(`piece ${p.id} needs more samples for a trimesh collider`)
  }
  // Each piece must start near where some earlier piece (or gap) ended, i.e. the path is continuous.
  for (let i = 1; i < c.path.length; i++) {
    if (dist(c.path[i].p, c.path[i - 1].p) > 40) bad(`path jumps ${dist(c.path[i].p, c.path[i - 1].p).toFixed(1)}m near sample ${i}`)
  }
  // Self-overlap: two distant parts of the route must not occupy the same space.
  const pts = c.path.filter((_, i) => i % 3 === 0)
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[j].d - pts[i].d < 28) continue
      const a = pts[i].p
      const b = pts[j].p
      if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 4.5 && Math.abs(a[1] - b[1]) < 3.2) {
        bad(`route overlaps itself near d=${pts[i].d.toFixed(0)} and d=${pts[j].d.toFixed(0)}`)
        i = pts.length
        break
      }
    }
  }
  const seen = new Set<string>()
  for (const g of c.gems) {
    if (seen.has(g.id)) bad(`duplicate id ${g.id}`)
    seen.add(g.id)
  }
  c.checkpoints.forEach((cp, i) => { if (cp.index !== i) bad(`checkpoint ${cp.id} has wrong index`) })
  return issues
}

