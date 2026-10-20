import * as THREE from 'three'
import type { TrackPiece } from '../levels/levelTypes'
import { frameRight } from '../levels/levelBuilder'
import { makeProfile } from './profiles'

/**
 * Sweeps a closed cross-section along a piece's centre line to build real, closed 3D track geometry.
 * The same geometry feeds the renderer and (for non-cuboid pieces) the trimesh collider, so what you
 * see is exactly what you roll on.
 */
export function buildRibbonGeometry(piece: TrackPiece): THREE.BufferGeometry {
  const profile = makeProfile(piece.profile, piece.width, piece.palette)
  let pts = profile.points
  let cols = profile.edgeColors

  // Normalise to counter-clockwise so computed normals face outward.
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += x1 * y2 - x2 * y1
  }
  if (area < 0) {
    const n = pts.length
    pts = [...pts].reverse()
    // Reversed edge i (new) goes new[i]->new[i+1] = old[n-1-i] -> old[n-2-i], i.e. old edge (n-2-i).
    cols = pts.map((_, i) => profile.edgeColors[(((n - 2 - i) % n) + n) % n])
  }

  const n = piece.samples.length
  const m = pts.length
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const vertexAt = (sampleIdx: number, px: number, py: number) => {
    const s = piece.samples[sampleIdx]
    const r = frameRight(s)
    return [
      s.p[0] + r[0] * px + s.u[0] * py,
      s.p[1] + r[1] * px + s.u[1] * py,
      s.p[2] + r[2] * px + s.u[2] * py,
    ] as const
  }

  // Side strips: each profile edge owns its own vertices so edges stay crisp.
  for (let e = 0; e < m; e++) {
    const [ax, ay] = pts[e]
    const [bx, by] = pts[(e + 1) % m]
    const col = cols[e]
    const base = positions.length / 3
    for (let i = 0; i < n; i++) {
      const va = vertexAt(i, ax, ay)
      const vb = vertexAt(i, bx, by)
      positions.push(va[0], va[1], va[2], vb[0], vb[1], vb[2])
      colors.push(col[0], col[1], col[2], col[0], col[1], col[2])
      const v = piece.arc[i] / 2.5
      uvs.push(ax / 2.5, v, bx / 2.5, v)
    }
    for (let i = 0; i < n - 1; i++) {
      const a0 = base + i * 2
      const b0 = a0 + 1
      const a1 = a0 + 2
      const b1 = a0 + 3
      indices.push(a0, b0, a1, b0, b1, a1)
    }
  }

  // End caps (so gaps and ramp ends are solid, not hollow).
  const contour = pts.map(([x, y]) => new THREE.Vector2(x, y))
  const tris = THREE.ShapeUtils.triangulateShape(contour, [])
  const capColor = cols[0]
  for (const [sampleIdx, flip] of [[0, true], [n - 1, false]] as const) {
    const base = positions.length / 3
    for (const [x, y] of pts) {
      const v = vertexAt(sampleIdx, x, y)
      positions.push(v[0], v[1], v[2])
      colors.push(capColor[0], capColor[1], capColor[2])
      uvs.push(x / 2.5, y / 2.5)
    }
    for (const t of tris) {
      if (flip) indices.push(base + t[0], base + t[2], base + t[1])
      else indices.push(base + t[0], base + t[1], base + t[2])
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** Extract Rapier trimesh buffers from a ribbon geometry. */
export function trimeshBuffers(g: THREE.BufferGeometry): { vertices: Float32Array; indices: Uint32Array } {
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const idx = g.getIndex()!
  return {
    vertices: new Float32Array(pos.array as ArrayLike<number>),
    indices: new Uint32Array(idx.array as ArrayLike<number>),
  }
}
