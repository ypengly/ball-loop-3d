import { dot, cross, normalize, sub, yawForward, yawRight, type V3 } from '../utils/math'

/** Is point p inside an oriented box (half extents along right, up, forward) centred at c? */
export function inFrameBox(
  p: V3, c: V3, forward: V3, halfWidth: number, halfLength: number, yMin: number, yMax: number,
): boolean {
  const f = normalize(forward)
  const r = normalize(cross(f, [0, 1, 0]))
  const u = normalize(cross(r, f))
  const d = sub(p, c)
  const x = dot(d, r)
  const z = dot(d, f)
  const y = dot(d, u)
  return Math.abs(x) <= halfWidth && Math.abs(z) <= halfLength && y >= yMin && y <= yMax
}

export function inYawBox(p: V3, c: V3, yaw: number, halfWidth: number, halfLength: number, yMin: number, yMax: number): boolean {
  const d = sub(p, c)
  const x = dot(d, yawRight(yaw))
  const z = dot(d, yawForward(yaw))
  const y = d[1]
  return Math.abs(x) <= halfWidth && Math.abs(z) <= halfLength && y >= yMin && y <= yMax
}

/** Boost: raise the speed along `dir` to at least `strength` while keeping a fraction of sideways motion. */
export function applyBoostToVelocity(v: V3, dir: V3, strength: number): V3 {
  const d = normalize(dir)
  const along = dot(v, d)
  const target = Math.max(along, strength)
  const side: V3 = [v[0] - d[0] * along, v[1] - d[1] * along, v[2] - d[2] * along]
  const keep = 0.35
  return [d[0] * target + side[0] * keep, d[1] * target + side[1] * keep, d[2] * target + side[2] * keep]
}
