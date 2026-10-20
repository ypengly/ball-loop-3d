import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BoostEl, SlowEl } from '../levels/levelTypes'
import { makeChevronTexture, COLORS } from '../theme'
import { surfaceQuat } from './orient'

/** Green neon pad with scrolling chevrons pointing along the direction of travel. */
export function BoostPad({ boost }: { boost: BoostEl }) {
  const tex = useMemo(() => {
    const t = makeChevronTexture()
    t.repeat.set(1, Math.max(1, Math.round(boost.length / 1.6)))
    return t
  }, [boost.length])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: COLORS.green, map: tex, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }), [tex])
  const base = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0c5a3a', polygonOffset: true, polygonOffsetFactor: -1 }), [])
  const q = useMemo(() => surfaceQuat(boost.dir), [boost.dir])
  useEffect(() => () => { tex.dispose(); mat.dispose(); base.dispose() }, [tex, mat, base])
  useFrame(({ clock }) => { tex.offset.y = -(clock.elapsedTime * 1.2) % 1 })
  return (
    <group position={boost.pos} quaternion={q}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} material={base}>
        <planeGeometry args={[boost.width, boost.length]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={mat}>
        <planeGeometry args={[boost.width, boost.length]} />
      </mesh>
    </group>
  )
}

/** Violet translucent strip that slows the ball (visibly distinct from boosts). */
export function SlowZone({ zone }: { zone: SlowEl }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: COLORS.slow, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])
  useFrame(({ clock }) => { mat.opacity = 0.38 + Math.sin(clock.elapsedTime * 2.2) * 0.1 })
  return (
    <group position={zone.pos} rotation={[0, zone.yaw, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={mat}>
        <planeGeometry args={[zone.width, zone.length]} />
      </mesh>
    </group>
  )
}
