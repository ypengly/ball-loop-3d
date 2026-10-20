import { useEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { PendulumEl } from '../levels/levelTypes'
import { pendulumPose } from './motion'
import { useObstacleTick } from './registry'
import { COLORS, makeStripeTexture } from '../theme'
import { AudioManager } from '../systems/AudioManager'
import { runtime } from '../systems/runtime'

/** Swinging hammer. The body sits at the pivot; the head is a collider offset down by the rope length. */
export function Pendulum({ pendulum }: { pendulum: PendulumEl }) {
  const body = useRef<RapierRigidBody>(null)
  const tex = useMemo(() => {
    const t = makeStripeTexture(COLORS.hazardLight, COLORS.hazard, 4)
    t.repeat.set(1.5, 1)
    return t
  }, [])
  const head = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissive: COLORS.hazard, emissiveIntensity: 0.25, roughness: 0.45 }), [tex])
  const rope = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfd6ee', metalness: 0.6, roughness: 0.3 }), [])
  useEffect(() => () => { tex.dispose(); head.dispose(); rope.dispose() }, [tex, head, rope])

  useObstacleTick(t => {
    const q = pendulumPose(pendulum, t).quat
    body.current?.setNextKinematicRotation({ x: q[0], y: q[1], z: q[2], w: q[3] })
  })

  const L = pendulum.length
  return (
    <group>
      <mesh position={pendulum.pivot} rotation={[0, pendulum.yaw, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial color="#2b2f55" />
      </mesh>
      <RigidBody
        ref={body} type="kinematicPosition" colliders={false} position={pendulum.pivot} rotation={[0, pendulum.yaw, 0]}
        onCollisionEnter={() => { AudioManager.play('hit'); runtime.shake = Math.max(runtime.shake, 0.6) }}
      >
        {/* Collider axes are in the body's frame, which is yawed to face along the track. */}
        <CuboidCollider args={[0.7, 0.6, 0.8]} position={[0, -L, 0]} friction={0.3} />
        <mesh position={[0, -L / 2, 0]} material={rope}>
          <cylinderGeometry args={[0.06, 0.06, L, 6]} />
        </mesh>
        <mesh position={[0, -L, 0]} material={head} castShadow>
          <boxGeometry args={[1.4, 1.2, 1.6]} />
        </mesh>
      </RigidBody>
    </group>
  )
}
