import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { runtime } from '../systems/runtime'
import { useSettings } from '../../store/settingsStore'

/** Lighting rig. The shadow-casting sun follows the ball so a small shadow map stays sharp wherever you are. */
export function Lights() {
  const quality = useSettings(s => s.quality)
  const gl = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  const sun = useRef<THREE.DirectionalLight>(null)
  const shadows = quality !== 'low'
  const size = quality === 'high' ? 2048 : 1024

  useEffect(() => {
    gl.shadowMap.enabled = shadows
    gl.shadowMap.type = THREE.PCFShadowMap
    // Existing materials must be rebuilt when shadows are toggled at runtime.
    scene.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m) return
      if (Array.isArray(m)) m.forEach(x => { x.needsUpdate = true })
      else m.needsUpdate = true
    })
  }, [gl, scene, shadows])

  useEffect(() => {
    const l = sun.current
    if (!l) return
    l.shadow.map?.dispose()
    l.shadow.map = null
  }, [size])

  useFrame(() => {
    const l = sun.current
    if (!l) return
    const p = runtime.ballPos
    l.position.set(p[0] + 18, p[1] + 36, p[2] + 14)
    l.target.position.set(p[0], p[1], p[2])
    l.target.updateMatrixWorld()
  })

  return (
    <>
      <hemisphereLight args={['#c9deff', '#6a5acd', 0.85]} />
      <directionalLight
        ref={sun}
        intensity={2.3}
        color="#fff1dd"
        castShadow={shadows}
        shadow-mapSize={[size, size]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {quality !== 'low' && (
        <Environment resolution={64} frames={1} background={false}>
          <Lightformer form="rect" intensity={2.4} position={[0, 6, -6]} scale={[14, 5, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.4} position={[-7, 2, 3]} scale={[4, 6, 1]} color="#9cc2ff" />
          <Lightformer form="rect" intensity={1.2} position={[7, 1, 3]} scale={[4, 6, 1]} color="#ffd6ee" />
          <Lightformer form="ring" intensity={1.2} position={[0, 8, 0]} scale={8} color="#ffffff" rotation-x={Math.PI / 2} />
        </Environment>
      )}
    </>
  )
}
