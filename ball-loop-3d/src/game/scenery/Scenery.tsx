import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS } from '../theme'
import { createRng } from '../utils/math'
import { runtime } from '../systems/runtime'
import { useSettings } from '../../store/settingsStore'

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
void main() {
  float h = clamp(vDir.y, -0.25, 1.0);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.35, h));
  c = mix(c, top, smoothstep(0.3, 0.95, h));
  c = mix(c, horizon * 0.85, smoothstep(0.0, -0.25, vDir.y));
  float sun = pow(max(dot(normalize(vDir), normalize(vec3(0.5, 0.35, -0.7))), 0.0), 220.0);
  c += vec3(1.0, 0.92, 0.75) * sun * 0.9;
  gl_FragColor = vec4(c, 1.0);
}`

/** Gradient sky dome that follows the camera, so there is never a visible edge. */
function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(COLORS.sky.top) },
      mid: { value: new THREE.Color(COLORS.sky.mid) },
      horizon: { value: new THREE.Color(COLORS.sky.horizon) },
    },
  }), [])
  const ref = useRef<THREE.Mesh>(null)
  const camera = useThree(s => s.camera)
  useEffect(() => () => mat.dispose(), [mat])
  useFrame(() => { ref.current?.position.copy(camera.position) })
  return (
    <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[600, 24, 16]} />
    </mesh>
  )
}

const CELL = 520
const dummy = new THREE.Object3D()

/**
 * Clouds and distant floating islands. Positions are laid out in a repeating CELL x CELL tile around the ball, so the
 * same instances cover unlimited distance (endless mode) at no extra cost.
 */
function CloudField({ baseY, count, islands }: { baseY: number; count: number; islands: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const data = useMemo(() => {
    const rng = createRng(777)
    return Array.from({ length: count }, () => ({
      x: rng.range(0, CELL),
      z: rng.range(0, CELL),
      y: islands ? baseY - rng.range(30, 90) : baseY - rng.range(8, 70),
      s: islands ? rng.range(10, 26) : rng.range(14, 38),
      sy: islands ? rng.range(0.8, 1.4) : rng.range(0.28, 0.5),
      sp: rng.range(0.4, 1.6),
    }))
  }, [count, baseY, islands])
  const geom = useMemo(() => (islands ? new THREE.ConeGeometry(1, 1.6, 7) : new THREE.IcosahedronGeometry(1, 1)), [islands])
  const mat = useMemo(() => (islands
    ? new THREE.MeshStandardMaterial({ color: '#7fa0e8', roughness: 0.9, flatShading: true })
    : new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, fog: true })), [islands])
  useEffect(() => () => { geom.dispose(); mat.dispose() }, [geom, mat])

  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    const bx = runtime.ballPos[0]
    const bz = runtime.ballPos[2]
    data.forEach((d, i) => {
      const drift = islands ? 0 : t * d.sp
      const x = ((((d.x + drift - bx) % CELL) + CELL) % CELL) - CELL / 2 + bx
      const z = ((((d.z - bz) % CELL) + CELL) % CELL) - CELL / 2 + bz
      dummy.position.set(x, d.y, z)
      dummy.rotation.set(islands ? Math.PI : 0, 0, 0)
      dummy.scale.set(d.s, d.s * d.sy, d.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geom, mat, count]} frustumCulled={false} />
}

export function Scenery({ baseY = -20 }: { baseY?: number }) {
  const quality = useSettings(s => s.quality)
  const scene = useThree(s => s.scene)
  useEffect(() => {
    scene.fog = new THREE.Fog(COLORS.fog, 90, 420)
    return () => { scene.fog = null }
  }, [scene])
  const clouds = quality === 'low' ? 14 : quality === 'medium' ? 30 : 56
  const islands = quality === 'low' ? 0 : quality === 'medium' ? 6 : 12
  return (
    <>
      <Sky />
      <CloudField baseY={baseY} count={clouds} islands={false} />
      {islands > 0 && <CloudField baseY={baseY} count={islands} islands />}
    </>
  )
}
