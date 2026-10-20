import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { FallingEl } from '../levels/levelTypes'
import { useObstacleTick } from './registry'
import { useRunLogic } from '../RunContext'
import { COLORS } from '../theme'
import { AudioManager } from '../systems/AudioManager'

/** Orange tile that shakes when touched, then drops away (or fades out when `vanish` is set). */
export function FallingPlatform({ tile }: { tile: FallingEl }) {
  const logicRef = useRunLogic()
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const wasTouched = useRef(false)
  const wasFallen = useRef(false)
  const q = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tile.yaw), [tile.yaw])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: tile.vanish ? '#ffd27a' : COLORS.tile, emissive: COLORS.tile, emissiveIntensity: 0.15, roughness: 0.55, transparent: tile.vanish,
  }), [tile.vanish])
  useEffect(() => () => mat.dispose(), [mat])

  useObstacleTick(simT => {
    const st = logicRef.current.tileFor(tile.id)
    const b = body.current
    if (!st || !b) return
    if (!st.fallen) {
      const shake = st.touched >= 0 ? Math.sin(simT * 90) * 0.035 : 0
      b.setNextKinematicTranslation({ x: tile.pos[0] + shake, y: tile.pos[1], z: tile.pos[2] })
      if (collider.current && !collider.current.isEnabled()) collider.current.setEnabled(true)
    } else {
      if (collider.current?.isEnabled()) collider.current.setEnabled(false)
      b.setNextKinematicTranslation({ x: tile.pos[0], y: tile.pos[1] + (tile.vanish ? 0 : st.dy), z: tile.pos[2] })
    }
  })

  useFrame(({ clock }) => {
    const st = logicRef.current.tileFor(tile.id)
    const m = mesh.current
    if (!st || !m) return
    if (st.touched >= 0 && !wasTouched.current) AudioManager.play('tile')
    wasTouched.current = st.touched >= 0
    wasFallen.current = st.fallen
    if (tile.vanish) {
      m.visible = !st.fallen
      mat.opacity = st.touched >= 0 ? 0.45 + 0.4 * Math.abs(Math.sin(clock.elapsedTime * 18)) : 1
    }
    mat.emissiveIntensity = st.touched >= 0 ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 30) : 0.15
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={tile.pos} quaternion={[q.x, q.y, q.z, q.w]}>
      <CuboidCollider ref={collider} args={[tile.size[0] / 2, tile.size[1] / 2, tile.size[2] / 2]} friction={1} />
      <mesh ref={mesh} material={mat} castShadow receiveShadow>
        <boxGeometry args={tile.size} />
      </mesh>
    </RigidBody>
  )
}
