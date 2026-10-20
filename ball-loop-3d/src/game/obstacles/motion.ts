import { addScaled, lerp3, UP, type V3 } from '../utils/math'
import type { BeamEl, MovingPlatformEl, PendulumEl } from '../levels/levelTypes'

/** Gravity used for falling tiles once released (m/s^2). */
export const FALL_GRAVITY = 22

/** Pure functions of simulation time so obstacles stay deterministic, pausable and resettable. */

/** Eased ping-pong 0..1..0 with brief dwell at both ends. */
export function pingPong(t: number, period: number, phase: number): number {
  const x = t / period + phase
  const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * x)
  // Sharpen the ends slightly so the platform lingers where it can be boarded.
  return w * w * (3 - 2 * w)
}

export function movingPlatformPose(p: MovingPlatformEl, t: number): V3 {
  return lerp3(p.a, p.b, pingPong(t, p.period, p.phase))
}

export function beamAngle(b: BeamEl, t: number): number {
  return b.phase + b.speed * t
}

/** Pendulum swings across the track (about the track's forward axis). */
export function pendulumAngle(p: PendulumEl, t: number): number {
  return p.amplitude * Math.sin((2 * Math.PI * t) / p.period + p.phase)
}

export function pendulumPose(p: PendulumEl, t: number): { quat: [number, number, number, number]; head: V3; angle: number } {
  const ang = pendulumAngle(p, t)
  // Rotation about the forward axis (horizontal, along yaw direction).
  const fx = -Math.sin(p.yaw)
  const fz = -Math.cos(p.yaw)
  // Rotating by -ang about +forward swings the hanging head towards +right for positive ang.
  const s = Math.sin(-ang / 2)
  const quat: [number, number, number, number] = [fx * s, 0, fz * s, Math.cos(ang / 2)]
  // Head offset: starts straight down, swings to the right (+right) for positive angle.
  const right: V3 = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)]
  const head = addScaled(addScaled(p.pivot, UP, -p.length * Math.cos(ang)), right, p.length * Math.sin(ang))
  return { quat, head, angle: ang }
}
