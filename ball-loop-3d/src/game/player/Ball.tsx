import { forwardRef, useMemo } from 'react'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useProgress } from '../../store/progressStore'
import { useSettings } from '../../store/settingsStore'
import { getSkin } from '../systems/LevelProgression'
import { getBallMaterial } from './ballMaterial'
import { BALL } from './BallPhysics'
import type { V3 } from '../utils/math'
import type { SkinDef } from '../../types'

export function BallMesh({ skin, quality }: { skin: SkinDef; quality: 'low' | 'medium' | 'high' }) {
  const mat = useMemo(() => getBallMaterial(skin, quality !== 'low'), [skin, quality])
  const seg = quality === 'low' ? 20 : 40
  return (
    <mesh material={mat} castShadow>
      <sphereGeometry args={[BALL.radius, seg, seg]} />
    </mesh>
  )
}

/** The player ball: a dynamic rigid body with CCD so it cannot tunnel through thin bridges at high speed. */
export const Ball = forwardRef<RapierRigidBody, { position: V3 }>(function Ball({ position }, ref) {
  const skinId = useProgress(s => s.progress.selectedSkin)
  const quality = useSettings(s => s.quality)
  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders={false}
      ccd
      canSleep={false}
      linearDamping={BALL.linearDamping}
      angularDamping={BALL.angularDamping}
    >
      <BallCollider args={[BALL.radius]} friction={BALL.friction} restitution={BALL.restitution} mass={BALL.mass} />
      <BallMesh skin={getSkin(skinId)} quality={quality} />
    </RigidBody>
  )
})
