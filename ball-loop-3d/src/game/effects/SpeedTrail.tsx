import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from '../systems/runtime'
import { useSettings } from '../../store/settingsStore'

const N = 28

/** A world-space ribbon behind the ball that only shows up at high speed (boosts, loops, long drops). */
export function SpeedTrail({ color = '#7fe9ff' }: { color?: string }) {
  const quality = useSettings(s => s.quality)
  const camera = useThree(s => s.camera)
  const pts = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), [])
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3))
    const idx: number[] = []
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    g.setIndex(idx)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), [])
  const c = useMemo(() => new THREE.Color(color), [color])
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), side: new THREE.Vector3(), view: new THREE.Vector3() }), [])

  useEffect(() => () => { geom.dispose(); mat.dispose() }, [geom, mat])

  useFrame(() => {
    if (quality === 'low') return
    const bp = runtime.ballPos
    for (let i = N - 1; i > 0; i--) pts[i].copy(pts[i - 1])
    pts[0].set(bp[0], bp[1], bp[2])
    const intensity = THREE.MathUtils.clamp((runtime.speed - 12) / 9, 0, 1)
    const pos = geom.attributes.position as THREE.BufferAttribute
    const col = geom.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      const a = pts[i]
      const b = pts[Math.min(N - 1, i + 1)]
      tmp.dir.subVectors(i === N - 1 ? a : b, i === N - 1 ? pts[i - 1] : a)
      tmp.view.subVectors(camera.position, a)
      tmp.side.crossVectors(tmp.dir, tmp.view)
      if (tmp.side.lengthSq() < 1e-8) tmp.side.set(0, 1, 0)
      tmp.side.normalize().multiplyScalar(0.28 * (1 - i / N))
      pos.setXYZ(i * 2, a.x + tmp.side.x, a.y + tmp.side.y, a.z + tmp.side.z)
      pos.setXYZ(i * 2 + 1, a.x - tmp.side.x, a.y - tmp.side.y, a.z - tmp.side.z)
      const f = intensity * Math.pow(1 - i / N, 1.6)
      col.setXYZ(i * 2, c.r * f, c.g * f, c.b * f)
      col.setXYZ(i * 2 + 1, c.r * f, c.g * f, c.b * f)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })

  if (quality === 'low') return null
  return <mesh geometry={geom} material={mat} frustumCulled={false} />
}
