import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fx } from './fx'
import { useSettings } from '../../store/settingsStore'

const MAX = 360

/** Pooled additive point sprites for gem sparkles, landing dust, boosts and confetti. */
export function Particles() {
  const quality = useSettings(s => s.quality)
  const max = quality === 'low' ? 120 : MAX
  const ref = useRef<THREE.Points>(null)

  const data = useMemo(() => ({
    pos: new Float32Array(MAX * 3),
    col: new Float32Array(MAX * 3),
    vel: new Float32Array(MAX * 3),
    life: new Float32Array(MAX),
    maxLife: new Float32Array(MAX),
    base: new Float32Array(MAX * 3),
    grav: new Float32Array(MAX),
    next: 0,
  }), [])

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(data.col, 3))
    return g
  }, [data])

  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 0.28, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }), [])

  useEffect(() => {
    fx.clear()
    return () => {
      geom.dispose()
      mat.dispose()
    }
  }, [geom, mat])

  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    for (const b of fx.drain()) {
      const colors = Array.isArray(b.color) ? b.color : [b.color]
      const n = quality === 'low' ? Math.ceil(b.count / 2) : b.count
      for (let k = 0; k < n; k++) {
        const i = data.next++ % max
        const th = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        const sp = b.speed * (0.4 + Math.random() * 0.6)
        data.pos.set([b.pos[0], b.pos[1], b.pos[2]], i * 3)
        data.vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp
        data.vel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp * 0.8 + (b.up ?? 0) * (0.5 + Math.random())
        data.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp
        data.life[i] = data.maxLife[i] = (b.life ?? 0.7) * (0.6 + Math.random() * 0.6)
        data.grav[i] = b.gravity ?? 6
        tmp.set(colors[Math.floor(Math.random() * colors.length)])
        data.base.set([tmp.r, tmp.g, tmp.b], i * 3)
      }
    }
    for (let i = 0; i < max; i++) {
      if (data.life[i] <= 0) {
        data.col[i * 3] = data.col[i * 3 + 1] = data.col[i * 3 + 2] = 0
        continue
      }
      data.life[i] -= dt
      data.vel[i * 3 + 1] -= data.grav[i] * dt
      data.pos[i * 3] += data.vel[i * 3] * dt
      data.pos[i * 3 + 1] += data.vel[i * 3 + 1] * dt
      data.pos[i * 3 + 2] += data.vel[i * 3 + 2] * dt
      const f = Math.max(0, data.life[i] / data.maxLife[i])
      data.col[i * 3] = data.base[i * 3] * f
      data.col[i * 3 + 1] = data.base[i * 3 + 1] * f
      data.col[i * 3 + 2] = data.base[i * 3 + 2] * f
    }
    geom.attributes.position.needsUpdate = true
    geom.attributes.color.needsUpdate = true
  })

  return <points ref={ref} geometry={geom} material={mat} frustumCulled={false} />
}
