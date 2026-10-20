import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { appendSegments, emptyContent } from '../levels/levelBuilder'
import type { Segment } from '../levels/levelTypes'
import { Track } from '../tracks/Track'
import { BoostPad } from '../objects/BoostPad'
import { BallMesh } from '../player/Ball'
import { Lights } from './Lights'
import { Scenery } from './Scenery'
import { getSkin } from '../systems/LevelProgression'
import { useProgress } from '../../store/progressStore'
import { useSettings } from '../../store/settingsStore'
import { useUI } from '../../store/uiStore'
import { runtime } from '../systems/runtime'
import { cross, normalize, type V3 } from '../utils/math'

const SHOWCASE: Segment[] = [
  { t: 'start', length: 12 },
  { t: 'straight', length: 34, width: 6, features: [{ k: 'boost', at: 0.88, strength: 22 }] },
  { t: 'loop', radius: 5.5 },
  { t: 'straight', length: 14, width: 6 },
  { t: 'curve', angle: 120, radius: 16, width: 6 },
  { t: 'straight', length: 16, width: 6 },
  { t: 'ramp', length: 14, rise: 3, width: 6 },
  { t: 'straight', length: 14, width: 6 },
]

/** The main-menu backdrop: a real slice of track (with the loop) and a ball rolling along it. */
export function MenuScene() {
  const quality = useSettings(s => s.quality)
  const selected = useProgress(s => s.progress.selectedSkin)
  const preview = useUI(s => s.previewSkin)
  const skin = getSkin(preview ?? selected)
  const camera = useThree(s => s.camera)

  const { content, samples, total } = useMemo(() => {
    const c = emptyContent()
    appendSegments(c, { pos: [0, 0, 0], yaw: 0 }, SHOWCASE, 'menu-')
    // Ball path: concatenate piece samples (skipping the loop's gap-free joins) with cumulative distance.
    const pts: { p: V3; u: V3; t: V3; d: number }[] = []
    for (const piece of c.pieces) {
      for (const s of piece.samples) {
        const last = pts[pts.length - 1]
        const d = last ? last.d + Math.hypot(s.p[0] - last.p[0], s.p[1] - last.p[1], s.p[2] - last.p[2]) : 0
        if (last && d - last.d < 1e-4) continue
        pts.push({ p: s.p, u: s.u, t: s.t, d })
      }
    }
    return { content: c, samples: pts, total: pts[pts.length - 1].d }
  }, [])

  const ball = useRef<THREE.Group>(null)
  const spin = useRef(new THREE.Quaternion())
  const camPos = useRef(new THREE.Vector3())
  const focus = useRef(new THREE.Vector3())
  const lastS = useRef(0)
  const tmp = useMemo(() => ({ axis: new THREE.Vector3(), q: new THREE.Quaternion(), look: new THREE.Vector3(), right: new THREE.Vector3(), desired: new THREE.Vector3() }), [])

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = 58
    cam.updateProjectionMatrix()
  }, [camera])

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const speed = 10
    const s = (clock.elapsedTime * speed) % total
    let i = 1
    while (i < samples.length - 1 && samples[i].d < s) i++
    const a = samples[i - 1]
    const b = samples[i]
    const k = (s - a.d) / Math.max(1e-6, b.d - a.d)
    const px = a.p[0] + (b.p[0] - a.p[0]) * k
    const py = a.p[1] + (b.p[1] - a.p[1]) * k
    const pz = a.p[2] + (b.p[2] - a.p[2]) * k
    const u = normalize([a.u[0] + (b.u[0] - a.u[0]) * k, a.u[1] + (b.u[1] - a.u[1]) * k, a.u[2] + (b.u[2] - a.u[2]) * k])
    const t = normalize([a.t[0] + (b.t[0] - a.t[0]) * k, a.t[1] + (b.t[1] - a.t[1]) * k, a.t[2] + (b.t[2] - a.t[2]) * k])
    const wrapped = s < lastS.current
    lastS.current = s
    const pos = new THREE.Vector3(px + u[0] * 0.5, py + u[1] * 0.5, pz + u[2] * 0.5)
    if (ball.current) {
      ball.current.position.copy(pos)
      // Rolling without slipping: rotate about (normal x velocity) by distance / radius.
      const axis = cross(u, t)
      tmp.axis.set(axis[0], axis[1], axis[2]).normalize()
      tmp.q.setFromAxisAngle(tmp.axis, (speed * dt) / 0.5)
      spin.current.premultiply(tmp.q)
      ball.current.quaternion.copy(spin.current)
    }
    runtime.ballPos = [pos.x, pos.y, pos.z]
    runtime.speed = speed

    // Orbiting camera. Aim a little to the left of the ball so it sits right of the menu panel.
    const ang = clock.elapsedTime * 0.12 + 0.9
    tmp.desired.set(pos.x + Math.sin(ang) * 15, pos.y + 5.5, pos.z + Math.cos(ang) * 15)
    if (wrapped) {
      camPos.current.copy(tmp.desired)
      focus.current.copy(pos)
    }
    camPos.current.lerp(tmp.desired, 1 - Math.exp(-2.2 * dt))
    focus.current.lerp(pos, 1 - Math.exp(-5 * dt))
    camera.position.copy(camPos.current)
    tmp.look.copy(focus.current)
    camera.lookAt(tmp.look)
    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    camera.position.addScaledVector(tmp.right, -2.2)
    camera.lookAt(tmp.look.addScaledVector(tmp.right, -2.2))
  })

  return (
    <>
      <Lights />
      <Scenery baseY={-24} />
      {content.pieces.map(p => <Track key={p.id} piece={p} />)}
      {content.boosts.map(b => <BoostPad key={b.id} boost={b} />)}
      <group ref={ball}>
        <BallMesh skin={skin} quality={quality} />
      </group>
    </>
  )
}
