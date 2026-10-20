import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { TrackPiece } from '../levels/levelTypes'
import { frameRight } from '../levels/levelBuilder'
import { pieceFrameAt } from '../levels/levelBuilder'

/** Wooden plank lines across the bridge deck (instanced; purely visual). */
export function Bridge({ piece }: { piece: TrackPiece }) {
  const count = Math.max(2, Math.floor(piece.length / 1.1))
  const { geom, mat, mesh } = useMemo(() => {
    const geom = new THREE.BoxGeometry(piece.width - 0.1, 0.02, 0.07)
    const mat = new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.9 })
    const mesh = new THREE.InstancedMesh(geom, mat, count)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const basis = new THREE.Matrix4()
    for (let i = 0; i < count; i++) {
      const f = pieceFrameAt(piece, (i + 0.5) / count)
      const r = frameRight(f)
      basis.makeBasis(new THREE.Vector3(...r), new THREE.Vector3(...f.u), new THREE.Vector3(-f.t[0], -f.t[1], -f.t[2]))
      q.setFromRotationMatrix(basis)
      m.compose(new THREE.Vector3(f.p[0] + f.u[0] * 0.012, f.p[1] + f.u[1] * 0.012, f.p[2] + f.u[2] * 0.012), q, new THREE.Vector3(1, 1, 1))
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    return { geom, mat, mesh }
  }, [piece, count])
  useEffect(() => () => { geom.dispose(); mat.dispose(); mesh.dispose() }, [geom, mat, mesh])
  return <primitive object={mesh} />
}
