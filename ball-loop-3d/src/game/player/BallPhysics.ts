import { UP, add, addScaled, clamp, cross, dot, length, normalize, scale, sub, type V3 } from '../utils/math'

/**
 * Pure, engine-independent ball tuning and control maths. Everything here is deterministic and unit-testable;
 * BallController applies the results to a Rapier body.
 */
export const BALL = {
  radius: 0.5,
  mass: 1,
  friction: 1.1,
  restitution: 0.04,
  linearDamping: 0.04,
  angularDamping: 0.25,
  gravity: 15,
  /** Acceleration along the wish direction while rolling on a surface (m/s^2). */
  driveAccel: 20,
  /** Acceleration while airborne (air control). */
  airAccel: 9,
  /** Input stops adding speed once the ball moves faster than this along the wish direction. */
  maxDriveSpeed: 11,
  /** Absolute speed ceiling (boosts can exceed maxDriveSpeed but not this). */
  hardMaxSpeed: 32,
  /** Lateral slip is damped so steering feels crisp (1/s). */
  lateralGrip: 3.6,
  /** Extra braking when there is no input (1/s). */
  idleBrake: 1.3,
  /** Constant deceleration (m/s^2) applied when there is no input, so the ball actually comes to rest. */
  idleStop: 5,
  /** Braking while pushing against the direction of travel (extra accel multiplier). */
  reverseBoost: 1.6,
  /** Jump take-off speed (m/s). Configurable per run. */
  jumpSpeed: 7,
  /** Seconds after leaving a surface during which a jump is still allowed. */
  coyoteTime: 0.14,
  /** Seconds a jump press is remembered before landing. */
  jumpBuffer: 0.14,
  /** Fraction of gravity applied as a pull into steep/inverted surfaces (keeps the ball on loops). */
  gripAssist: 0.55,
  /** Surface normal.y below which grip assist applies. */
  gripNormalY: 0.7,
  /** On surfaces steeper than this (normal.y) while moving fast, forward input is ignored and only steering applies. */
  steepNormalY: 0.5,
  groundRayExtra: 0.28,
} as const

export interface DriveParams {
  driveAccel: number
  airAccel: number
  maxDriveSpeed: number
  lateralGrip: number
  idleBrake: number
  reverseBoost: number
}

export const defaultDriveParams = (): DriveParams => ({
  driveAccel: BALL.driveAccel,
  airAccel: BALL.airAccel,
  maxDriveSpeed: BALL.maxDriveSpeed,
  lateralGrip: BALL.lateralGrip,
  idleBrake: BALL.idleBrake,
  reverseBoost: BALL.reverseBoost,
})

export interface DriveInput {
  /** World-space wish direction on the horizontal plane (length 0..1). */
  wish: V3
  grounded: boolean
  /** Surface normal when grounded (unit). */
  normal: V3
  velocity: V3
  /** 0..1 multiplier for speed limits when inside a slow zone. */
  speedScale: number
}

/**
 * Acceleration (m/s^2) to apply for this step. Gravity is handled by the physics engine.
 * Drive acts along the ground plane so rolling uphill/downhill and around banked curves works naturally.
 */
export function computeDriveAccel(inp: DriveInput, p: DriveParams): V3 {
  const mag = clamp(length(inp.wish), 0, 1)
  const n = inp.grounded ? inp.normal : UP
  // Project wish onto the surface plane.
  let w = sub(inp.wish, scale(n, dot(inp.wish, n)))
  const wl = length(w)
  w = wl > 1e-5 ? scale(w, mag / wl) : [0, 0, 0]
  const vPlane = sub(inp.velocity, scale(n, dot(inp.velocity, n)))
  const accel = inp.grounded ? p.driveAccel : p.airAccel

  // Loops / walls: "forward" has no stable meaning when the surface is vertical or inverted, so while moving
  // fast the ball keeps its momentum and input only steers sideways across the track.
  if (inp.grounded && n[1] < BALL.steepNormalY && length(vPlane) > 4) {
    const vdir = normalize(vPlane)
    const side = normalize(cross(n, vdir))
    return scale(side, dot(inp.wish, side) * accel * 0.7)
  }

  const maxSpeed = p.maxDriveSpeed * inp.speedScale
  let a: V3 = [0, 0, 0]

  if (mag > 0.04) {
    const dir = normalize(w)
    const along = dot(vPlane, dir)
    if (along < maxSpeed * mag) {
      const mul = along < -0.5 ? p.reverseBoost : 1
      a = add(a, scale(dir, accel * mag * mul))
    }
    if (inp.grounded) {
      // Kill sideways slip relative to the wish direction.
      const lateral = sub(vPlane, scale(dir, along))
      a = addScaled(a, lateral, -p.lateralGrip)
    }
  } else if (inp.grounded) {
    const speed = length(vPlane)
    const k = speed > p.maxDriveSpeed * 1.15 ? p.idleBrake * 0.25 : p.idleBrake
    a = addScaled(a, vPlane, -k)
    // Constant low-speed brake so the ball can be held still (e.g. waiting at an edge or riding a platform).
    if (speed > 1e-3) a = addScaled(a, normalize(vPlane), -Math.min(BALL.idleStop, speed * 30))
  }
  return a
}

/** Velocity change for a jump from a surface with the given normal. */
export function computeJumpDelta(normal: V3, velocity: V3, jumpSpeed: number): V3 {
  const dir = normalize(add(scale(normal, 0.65), scale(UP, 0.35)))
  const into = Math.min(0, dot(velocity, dir)) // cancel any speed pushing into the surface
  return scale(dir, jumpSpeed - into)
}

/** Pull towards steep or inverted surfaces so the ball hugs loops when moving fast enough. */
export function computeGripAccel(normal: V3, speed: number): V3 {
  if (normal[1] >= BALL.gripNormalY || speed < 5) return [0, 0, 0]
  const k = clamp((BALL.gripNormalY - normal[1]) / 0.9, 0, 1)
  return scale(normal, -BALL.gripAssist * BALL.gravity * k)
}

export function clampSpeed(v: V3, max: number): V3 | null {
  const s = length(v)
  return s > max ? scale(v, max / s) : null
}

/** Angular velocity of a ball rolling without slipping with velocity v on a surface with unit normal n. */
export function rollingAngvel(v: V3, n: V3, radius: number = BALL.radius): V3 {
  const c = cross(n, v)
  return [c[0] / radius, c[1] / radius, c[2] / radius]
}
