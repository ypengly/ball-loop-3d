import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CheckpointEl } from '../levels/levelTypes'
import { useRunLogic } from '../RunContext'
import { COLORS } from '../theme'

/** Neon arch. Cyan until reached, then green; the crystal on top spins faster once it is your respawn point. */
export function Checkpoint({ cp }: { cp: CheckpointEl }) {
  const logicRef = useRunLogic()
  const crystal = useRef<THREE.Mesh>(null)
  const { post, bar, mat } = useMemo(() => ({
    post: new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8),
    bar: new THREE.BoxGeometry(cp.width, 0.16, 0.16),
    mat: new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.8, roughness: 0.3 }),
  }), [cp.width])
  useEffect(() => () => { post.dispose(); bar.dispose(); mat.dispose() }, [post, bar, mat])
  const off = useMemo(() => new THREE.Color(COLORS.cyan), [])
  const on = useMemo(() => new THREE.Color(COLORS.green), [])

  useFrame(({ clock }) => {
    const active = logicRef.current.respawn.index >= cp.index
    mat.color.copy(active ? on : off)
    mat.emissive.copy(active ? on : off)
    mat.emissiveIntensity = active ? 1.2 : 0.55 + Math.sin(clock.elapsedTime * 3 + cp.index) * 0.25
    if (crystal.current) crystal.current.rotation.y = clock.elapsedTime * (active ? 2.4 : 0.8)
  })

  return (
    <group position={cp.pos} rotation={[0, cp.yaw, 0]}>
      <mesh geometry={post} position={[-cp.width / 2 + 0.1, 1.6, 0]} material={mat} castShadow />
      <mesh geometry={post} position={[cp.width / 2 - 0.1, 1.6, 0]} material={mat} castShadow />
      <mesh geometry={bar} position={[0, 3.2, 0]} material={mat} />
      <mesh ref={crystal} position={[0, 3.7, 0]} material={mat}>
        <octahedronGeometry args={[0.28, 0]} />
      </mesh>
    </group>
  )
}
