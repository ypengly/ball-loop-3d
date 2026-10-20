import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { TrackPiece } from '../levels/levelTypes'
import { frameRight, pieceFrameAt } from '../levels/levelBuilder'

/** Small chevron decals along ramps so slopes and launch ramps are readable at a glance. */
export function Ramp({ piece }: { piece: TrackPiece }) {
  const count = Math.max(2, Math.floor(piece.length / 3))
  const { geom, mat, mesh } = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.55, -0.35)
    s.lineTo(0, 0.25)
    s.lineTo(0.55, -0.35)
    s.lineTo(0.55, -0.12)
    s.lineTo(0, 0.5)
    s.lineTo(-0.55, -0.12)
    s.closePath()
    const geom = new THREE.ShapeGeometry(s)
    // Shape lies in XY facing +Z; rotate so it lies flat on the surface pointing along -Z (forward).
    geom.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({ color: '#2fd8ff', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    const mesh = new THREE.InstancedMesh(geom, mat, count)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const basis = new THREE.Matrix4()
    for (let i = 0; i < count; i++) {
      const f = pieceFrameAt(piece, (i + 0.6) / (count + 0.2))
      const r = frameRight(f)
      basis.makeBasis(new THREE.Vector3(...r), new THREE.Vector3(...f.u), new THREE.Vector3(-f.t[0], -f.t[1], -f.t[2]))
      q.setFromRotationMatrix(basis)
      m.compose(new THREE.Vector3(f.p[0] + f.u[0] * 0.02, f.p[1] + f.u[1] * 0.02, f.p[2] + f.u[2] * 0.02), q, new THREE.Vector3(1, 1, 1))
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    return { geom, mat, mesh }
  }, [piece, count])
  useEffect(() => () => { geom.dispose(); mat.dispose(); mesh.dispose() }, [geom, mat, mesh])
  return <primitive object={mesh} />
}
