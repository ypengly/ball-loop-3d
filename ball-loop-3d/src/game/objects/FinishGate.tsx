import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FinishEl } from '../levels/levelTypes'
import { makeCheckerTexture, COLORS } from '../theme'

export function FinishGate({ finish }: { finish: FinishEl }) {
  const tex = useMemo(() => makeCheckerTexture(10, 2), [])
  const bannerMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 }), [tex])
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [])
  const pillar = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.gold, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.4 }), [])
  useEffect(() => () => { tex.dispose(); bannerMat.dispose(); glow.dispose(); pillar.dispose() }, [tex, bannerMat, glow, pillar])
  useFrame(({ clock }) => { glow.opacity = 0.45 + Math.sin(clock.elapsedTime * 3) * 0.25 })
  const w = finish.width
  return (
    <group position={finish.pos} rotation={[0, finish.yaw, 0]}>
      <mesh position={[-w / 2 + 0.25, 2.2, 0]} material={pillar} castShadow>
        <boxGeometry args={[0.5, 4.4, 0.5]} />
      </mesh>
      <mesh position={[w / 2 - 0.25, 2.2, 0]} material={pillar} castShadow>
        <boxGeometry args={[0.5, 4.4, 0.5]} />
      </mesh>
      <mesh position={[0, 4.15, 0]} material={bannerMat} castShadow>
        <boxGeometry args={[w, 1.1, 0.3]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={glow}>
        <planeGeometry args={[w - 0.6, 1.4]} />
      </mesh>
    </group>
  )
}
