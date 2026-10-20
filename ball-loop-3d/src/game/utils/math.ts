/** Small dependency-free vector/math helpers. Vectors are plain tuples so level code stays pure and testable. */
export type V3 = [number, number, number]

export const UP: V3 = [0, 1, 0]

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const length = (a: V3): number => Math.hypot(a[0], a[1], a[2])
export const normalize = (a: V3): V3 => {
  const l = length(a)
  return l < 1e-9 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l]
}
export const dist = (a: V3, b: V3): number => length(sub(a, b))
export const lerp3 = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
export const addScaled = (a: V3, b: V3, s: number): V3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}
/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

export const wrapAngle = (a: number): number => {
  let x = (a + Math.PI) % (Math.PI * 2)
  if (x < 0) x += Math.PI * 2
  return x - Math.PI
}
export const dampAngle = (current: number, target: number, lambda: number, dt: number): number =>
  current + wrapAngle(target - current) * (1 - Math.exp(-lambda * dt))

/**
 * Heading convention: yaw = 0 faces -Z, positive yaw turns left (counter-clockwise seen from above).
 */
export const yawForward = (yaw: number): V3 => [-Math.sin(yaw), 0, -Math.cos(yaw)]
export const yawRight = (yaw: number): V3 => [Math.cos(yaw), 0, -Math.sin(yaw)]

/** Rotate v around a unit axis by angle (Rodrigues). */
export const rotateAbout = (v: V3, axis: V3, angle: number): V3 => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const k = cross(axis, v)
  const d = dot(axis, v) * (1 - c)
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d]
}

/** Quaternion [x,y,z,w] from an orthonormal basis (right, up, back) where back = -forward. */
export const quatFromBasis = (r: V3, u: V3, b: V3): [number, number, number, number] => {
  const m00 = r[0], m01 = u[0], m02 = b[0]
  const m10 = r[1], m11 = u[1], m12 = b[1]
  const m20 = r[2], m21 = u[2], m22 = b[2]
  const trace = m00 + m11 + m22
  let x: number, y: number, z: number, w: number
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    w = 0.25 / s
    x = (m21 - m12) * s
    y = (m02 - m20) * s
    z = (m10 - m01) * s
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
    w = (m21 - m12) / s
    x = 0.25 * s
    y = (m01 + m10) / s
    z = (m02 + m20) / s
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
    w = (m02 - m20) / s
    x = (m01 + m10) / s
    y = 0.25 * s
    z = (m12 + m21) / s
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
    w = (m10 - m01) / s
    x = (m02 + m20) / s
    y = (m12 + m21) / s
    z = 0.25 * s
  }
  return [x, y, z, w]
}

/** Deterministic PRNG (mulberry32). */
export const createRng = (seed: number) => {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (lo: number, hi: number): number => lo + (hi - lo) * next(),
    int: (lo: number, hi: number): number => Math.floor(lo + (hi - lo + 1) * next()),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number): boolean => next() < p,
  }
}
export type Rng = ReturnType<typeof createRng>

/** Hash a string to a 32-bit seed (FNV-1a). */
export const hashString = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
