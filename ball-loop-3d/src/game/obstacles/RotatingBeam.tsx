import { useEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { BeamEl } from '../levels/levelTypes'
import { beamAngle } from './motion'
import { useObstacleTick } from './registry'
import { COLORS, makeStripeTexture } from '../theme'
import { AudioManager } from '../systems/AudioManager'
import { runtime } from '../systems/runtime'

/** Red/white striped sweeper. Hazards are always red so they read as dangerous at a glance. */
export function RotatingBeam({ beam }: { beam: BeamEl }) {
  const body = useRef<RapierRigidBody>(null)
  const arm = beam.length / 2
  const tex = useMemo(() => {
    const t = makeStripeTexture(COLORS.hazardLight, COLORS.hazard, 5)
    t.repeat.set(Math.max(2, beam.length / 1.6), 1)
    return t
  }, [beam.length])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissive: COLORS.hazard, emissiveIntensity: 0.22, roughness: 0.5 }), [tex])
  useEffect(() => () => { tex.dispose(); mat.dispose() }, [tex, mat])

  useObstacleTick(t => {
    const a = beamAngle(beam, t)
    body.current?.setNextKinematicRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) })
  })

  return (
    <RigidBody
      ref={body} type="kinematicPosition" colliders={false} position={beam.center}
      onCollisionEnter={() => { AudioManager.play('hit'); runtime.shake = Math.max(runtime.shake, 0.4) }}
    >
      <CuboidCollider args={[arm, 0.28, 0.28]} friction={0.4} />
      <mesh material={mat} castShadow>
        <boxGeometry args={[beam.length, 0.56, 0.56]} />
      </mesh>
      {beam.arms === 2 && (
        <>
          <CuboidCollider args={[0.28, 0.28, arm]} friction={0.4} />
          <mesh material={mat} castShadow rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[beam.length, 0.56, 0.56]} />
          </mesh>
        </>
      )}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 14]} />
        <meshStandardMaterial color="#2b2f55" />
      </mesh>
    </RigidBody>
  )
}
