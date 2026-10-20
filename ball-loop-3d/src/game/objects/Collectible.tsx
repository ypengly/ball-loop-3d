import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GemEl } from '../levels/levelTypes'
import { useRunLogic } from '../RunContext'
import { COLORS } from '../theme'

const dummy = new THREE.Object3D()

/** All gems of a chunk as ONE instanced mesh. Collected gems shrink away; ids are tracked in RunLogic so a gem can
 *  never pay out twice. */
export function Collectibles({ gems }: { gems: readonly GemEl[] }) {
  const logicRef = useRunLogic()
  const ref = useRef<THREE.InstancedMesh>(null)
  const { geom, mat } = useMemo(() => ({
    geom: new THREE.OctahedronGeometry(0.34, 0),
    mat: new THREE.MeshStandardMaterial({
      color: COLORS.gold, emissive: '#ff9d00', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.35,
    }),
  }), [])
  const pop = useRef<Float32Array>(new Float32Array(gems.length).fill(1))

  useEffect(() => () => { geom.dispose(); mat.dispose() }, [geom, mat])

  useFrame(({ clock }, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    const collected = logicRef.current.collected
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i]
      if (collected.has(g.id)) pop.current[i] = Math.max(0, pop.current[i] - dt * 6)
      const s = pop.current[i]
      dummy.position.set(g.pos[0], g.pos[1] + Math.sin(t * 2 + i) * 0.08, g.pos[2])
      dummy.rotation.set(0, t * 1.8 + i * 0.7, 0)
      dummy.scale.set(s, s * 1.35, s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (gems.length === 0) return null
  return <instancedMesh ref={ref} args={[geom, mat, gems.length]} castShadow frustumCulled={false} />
}
