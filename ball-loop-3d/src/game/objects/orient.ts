import * as THREE from 'three'
import { UP, cross, normalize, quatFromBasis, scale, type V3 } from '../utils/math'

/** Rotation that lays an object flat on a surface heading along `dir` (local -Z = forward, +Y = surface normal). */
export function surfaceQuat(dir: V3): [number, number, number, number] {
  const t = normalize(dir)
  const right = normalize(cross(t, UP))
  const up = normalize(cross(right, t))
  return quatFromBasis(right, up, scale(t, -1))
}

export function surfaceEuler(dir: V3): THREE.Euler {
  const q = surfaceQuat(dir)
  return new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q[0], q[1], q[2], q[3]))
}
