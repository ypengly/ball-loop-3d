import { memo, useEffect, useMemo } from 'react'
import { CuboidCollider, RigidBody, TrimeshCollider } from '@react-three/rapier'
import type { TrackPiece } from '../levels/levelTypes'
import { buildRibbonGeometry, trimeshBuffers } from './ribbon'
import { getTrackMaterial } from '../theme'
import { LoopTrack } from './LoopTrack'
import { Bridge } from './Bridge'
import { Ramp } from './Ramp'

/** Visible geometry and its collider are built from the same data, so what you see is exactly what you roll on. */
export const Track = memo(function Track({ piece }: { piece: TrackPiece }) {
  const geom = useMemo(() => buildRibbonGeometry(piece), [piece])
  const mesh = useMemo(() => (piece.cuboids ? null : trimeshBuffers(geom)), [piece, geom])
  useEffect(() => () => geom.dispose(), [geom])

  return (
    <RigidBody type="fixed" colliders={false}>
      {piece.cuboids
        ? piece.cuboids.map((c, i) => (
            <CuboidCollider key={i} args={c.half} position={c.pos} quaternion={c.quat} friction={1} restitution={0} />
          ))
        : mesh && <TrimeshCollider args={[mesh.vertices, mesh.indices]} friction={1} restitution={0} />}
      <mesh geometry={geom} material={getTrackMaterial()} castShadow receiveShadow />
      {piece.kind === 'loop' && <LoopTrack piece={piece} />}
      {piece.kind === 'bridge' && <Bridge piece={piece} />}
      {(piece.kind === 'ramp' || piece.kind === 'launch') && <Ramp piece={piece} />}
    </RigidBody>
  )
})
