import { useEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { MovingPlatformEl } from '../levels/levelTypes'
import { movingPlatformPose } from './motion'
import { useObstacleTick } from './registry'
import { COLORS } from '../theme'

export function MovingPlatform({ platform }: { platform: MovingPlatformEl }) {
  const body = useRef<RapierRigidBody>(null)
  const start = useMemo(() => movingPlatformPose(platform, 0), [platform])
  const [w, h, l] = platform.size
  const { baseMat, topMat } = useMemo(() => ({
    baseMat: new THREE.MeshStandardMaterial({ color: COLORS.platform, roughness: 0.5 }),
    topMat: new THREE.MeshStandardMaterial({ color: COLORS.platformTop, emissive: COLORS.cyan, emissiveIntensity: 0.18, roughness: 0.45 }),
  }), [])
  useEffect(() => () => { baseMat.dispose(); topMat.dispose() }, [baseMat, topMat])

  useObstacleTick(t => {
    const p = movingPlatformPose(platform, t)
    body.current?.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] })
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start} rotation={[0, platform.yaw, 0]}>
      <CuboidCollider args={[w / 2, h / 2, l / 2]} friction={1.2} />
      <mesh material={baseMat} castShadow receiveShadow>
        <boxGeometry args={[w, h, l]} />
      </mesh>
      <mesh material={topMat} position={[0, h / 2 + 0.005, 0]} receiveShadow>
        <boxGeometry args={[w - 0.5, 0.02, l - 0.5]} />
      </mesh>
    </RigidBody>
  )
}
