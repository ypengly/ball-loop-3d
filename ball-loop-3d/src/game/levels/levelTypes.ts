import type { V3 } from '../utils/math'

/* ------------------------------------------------------------------ */
/* Authoring types: what a level file contains                         */
/* ------------------------------------------------------------------ */

/** A feature placed along a track segment. `at` is 0..1 along the segment's centre line. */
export type Feature =
  | { k: 'gem'; at: number; lat?: number; h?: number }
  /** A row of `count` gems from `from` to `to`; `arc` raises the middle (good for jumps). */
  | { k: 'gems'; from: number; to: number; count: number; lat?: number; h?: number; arc?: number }
  | { k: 'checkpoint'; at: number }
  | { k: 'boost'; at: number; strength?: number }
  | { k: 'slow'; at: number; length?: number }
  /** Rotating sweeper beam above the track. */
  | { k: 'beam'; at: number; speed?: number; arms?: 1 | 2; phase?: number; height?: number }
  /** Swinging hammer across the track. */
  | { k: 'pendulum'; at: number; period?: number; amplitude?: number; length?: number; phase?: number }

export type TrackPalette = 'path' | 'bridge' | 'loop' | 'halfpipe' | 'start' | 'finish'

interface SegBase {
  features?: Feature[]
}

export type Segment =
  | ({ t: 'start'; length?: number; width?: number } & SegBase)
  | ({ t: 'straight'; length: number; width?: number; rails?: boolean; palette?: TrackPalette } & SegBase)
  | ({ t: 'bridge'; length: number; width?: number } & SegBase)
  /** Smooth S-shaped ramp. Ends level. */
  | ({ t: 'ramp'; length: number; rise: number; width?: number; rails?: boolean } & SegBase)
  /** Incline that keeps its slope at the end - a jump ramp. */
  | ({ t: 'launch'; length: number; rise: number; width?: number } & SegBase)
  /** Empty space. `drop` lowers the next section. */
  | { t: 'gap'; length: number; drop?: number }
  /** Positive angle turns left, negative turns right. Angle is in degrees. */
  | ({ t: 'curve'; angle: number; radius: number; width?: number; bank?: number; rails?: boolean } & SegBase)
  /** A full vertical loop. The exit is offset sideways so the track never overlaps itself. */
  | ({ t: 'loop'; radius: number; width?: number } & SegBase)
  | ({ t: 'halfpipe'; length: number; width?: number } & SegBase)
  /** A moving platform crossing a gap. */
  | {
      t: 'platform'
      axis: 'forward' | 'vertical' | 'lateral'
      /** forward: gap length (must exceed platform length) */
      gap?: number
      rise?: number
      size?: [number, number]
      travel?: number
      period: number
      phase?: number
    }
  /** A run of tiles that fall (or vanish) shortly after the ball touches them. */
  | { t: 'falling'; tiles: number; tileLength?: number; width?: number; delay?: number; spacing?: number; vanish?: boolean }
  | ({ t: 'finish'; length?: number; width?: number } & SegBase)
  /** Rotate the heading in place (degrees, positive = left). Useful at the start of a branch. */
  | { t: 'turn'; angle: number }
  /**
   * An optional side route (secret ledge or risky shortcut). It starts at the current position/heading but does not
   * move the main route forward, and it is not part of the progress path.
   */
  | { t: 'branch'; segments: Segment[] }

export type Challenge = 'allGems' | 'noFalls' | 'fastTime'

export interface LevelDefinition {
  id: string
  name: string
  subtitle: string
  /** 1 (easy) .. 5 (hard) */
  difficulty: 1 | 2 | 3 | 4 | 5
  objective: string
  tip: string
  /** Finish under this time for the second star. */
  parTime: number
  /** The optional third-star objective. */
  challenge: Challenge
  /** Time target when challenge === 'fastTime'. */
  expertTime?: number
  segments: Segment[]
}

/* ------------------------------------------------------------------ */
/* Resolved geometry: what the engine consumes                         */
/* ------------------------------------------------------------------ */

export interface Frame {
  p: V3 // surface centre
  t: V3 // unit tangent
  u: V3 // unit surface normal (up from the track surface)
}

export type ProfileKind = 'flat' | 'rails' | 'halfpipe' | 'bridge'

export interface CuboidSpec {
  pos: V3
  half: V3
  quat: [number, number, number, number]
}

export interface TrackPiece {
  id: string
  kind: 'straight' | 'ramp' | 'launch' | 'curve' | 'loop' | 'halfpipe' | 'bridge'
  samples: Frame[]
  width: number
  profile: ProfileKind
  palette: TrackPalette
  /** Cumulative arc length per sample. */
  arc: number[]
  length: number
  /** Cuboid colliders for simple straights; otherwise a trimesh is generated from the ribbon. */
  cuboids: CuboidSpec[] | null
  isLoop: boolean
}

export interface GemEl { id: string; pos: V3 }
export interface CheckpointEl { id: string; index: number; pos: V3; yaw: number; width: number }
export interface BoostEl { id: string; pos: V3; dir: V3; yaw: number; strength: number; width: number; length: number }
export interface SlowEl { id: string; pos: V3; yaw: number; width: number; length: number }
export interface FinishEl { id: string; pos: V3; yaw: number; width: number }
export interface MovingPlatformEl {
  id: string
  a: V3
  b: V3
  size: V3 // width, thickness, length
  yaw: number
  period: number
  phase: number
}
export interface BeamEl { id: string; center: V3; length: number; speed: number; arms: 1 | 2; phase: number; height: number }
export interface PendulumEl {
  id: string
  pivot: V3
  yaw: number
  length: number
  amplitude: number
  period: number
  phase: number
}
export interface FallingEl { id: string; pos: V3; size: V3; yaw: number; delay: number; vanish: boolean }

export interface PathSample { p: V3; d: number }

export interface LevelContent {
  pieces: TrackPiece[]
  gems: GemEl[]
  checkpoints: CheckpointEl[]
  boosts: BoostEl[]
  slows: SlowEl[]
  finishes: FinishEl[]
  platforms: MovingPlatformEl[]
  beams: BeamEl[]
  pendulums: PendulumEl[]
  falling: FallingEl[]
  /** Centre-line samples for progress tracking. */
  path: PathSample[]
  /** Places where a bot (and a helpful tip) should jump: the near edge of each gap. */
  jumpMarks: { pos: V3; dir: V3 }[]
  start: { pos: V3; yaw: number } | null
}

export interface ResolvedLevel extends LevelContent {
  id: string
  index: number
  def: LevelDefinition
  killY: number
  totalLength: number
  totalGems: number
}

export interface TurtleState {
  pos: V3
  yaw: number
}
