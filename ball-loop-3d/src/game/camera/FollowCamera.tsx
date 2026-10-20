import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { cameraState, runtime } from '../systems/runtime'
import { getSettings, useSettings } from '../../store/settingsStore'
import { useGame } from '../../store/gameStore'
import { input } from '../player/PlayerInput'
import { clamp, damp, dampAngle } from '../utils/math'

interface CamState {
  focus: THREE.Vector3
  pos: THREE.Vector3
  tmp: THREE.Vector3
  dir: THREE.Vector3
  ray: InstanceType<ReturnType<typeof useRapier>['rapier']['Ray']>
  fov: number
  orbit: number
}

const MIN_PITCH = 0.08
const MAX_PITCH = 1.25

/**
 * Third-person chase camera. Drag (mouse or touch) or the right stick orbits; when you stop steering by hand the
 * camera eases behind your direction of travel. A ray from the ball keeps walls from blocking the view.
 */
export function FollowCamera({ bodyRef }: { bodyRef: RefObject<RapierRigidBody | null> }) {
  const { camera, gl } = useThree()
  const { world, rapier } = useRapier()

  useEffect(() => {
    const el = gl.domElement
    let active: number | null = null
    let lx = 0
    let ly = 0
    const down = (e: PointerEvent) => {
      if (active !== null) return
      active = e.pointerId
      lx = e.clientX
      ly = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== active) return
      const s = getSettings()
      const sens = (e.pointerType === 'mouse' ? s.mouseSensitivity : s.cameraSensitivity) * 0.0055
      const inv = s.invertCamera ? -1 : 1
      cameraState.yaw -= (e.clientX - lx) * sens
      cameraState.pitch = clamp(cameraState.pitch + (e.clientY - ly) * sens * inv, MIN_PITCH, MAX_PITCH)
      cameraState.lastManual = performance.now() / 1000
      lx = e.clientX
      ly = e.clientY
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId === active) active = null
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const st = useSettings.getState()
      st.set('cameraDistance', clamp(st.cameraDistance + Math.sign(e.deltaY) * 0.8, 5, 16))
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  const stateRef = useRef<CamState | null>(null)
  if (!stateRef.current) {
    stateRef.current = {
      focus: new THREE.Vector3(), pos: new THREE.Vector3(), tmp: new THREE.Vector3(), dir: new THREE.Vector3(),
      ray: new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }), fov: 62, orbit: 0,
    }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = stateRef.current!
    const body = bodyRef.current
    const phase = useGame.getState().phase
    const settings = getSettings()
    const now = performance.now() / 1000

    // Stick / touch look
    if (input.pad.lookX !== 0 || input.pad.lookY !== 0) {
      const inv = settings.invertCamera ? -1 : 1
      cameraState.yaw -= input.pad.lookX * 2.4 * settings.cameraSensitivity * dt
      cameraState.pitch = clamp(cameraState.pitch + input.pad.lookY * 1.6 * settings.cameraSensitivity * inv * dt, MIN_PITCH, MAX_PITCH)
      cameraState.lastManual = now
    }

    const bp = runtime.ballPos
    const falling = phase === 'Respawning'
    if (body && !falling) s.focus.set(bp[0], bp[1], bp[2])

    // Auto-align behind the direction of travel.
    const v = runtime.ballVel
    const sp = Math.hypot(v[0], v[2])
    if (phase === 'LevelComplete') {
      s.orbit += dt * 0.5
      cameraState.yaw += dt * 0.5
    } else if (!falling && sp > 2.5 && now - cameraState.lastManual > 1.1) {
      const target = Math.atan2(-v[0], -v[2])
      cameraState.yaw = dampAngle(cameraState.yaw, target, 2.4, dt)
    }

    const dist = settings.cameraDistance * (phase === 'LevelComplete' ? 0.75 : 1)
    const cp = Math.cos(cameraState.pitch)
    s.dir.set(Math.sin(cameraState.yaw) * cp, Math.sin(cameraState.pitch), Math.cos(cameraState.yaw) * cp)
    const look = s.tmp.copy(s.focus).add(new THREE.Vector3(0, 0.5, 0))

    // Camera collision: shorten the arm if something is in the way.
    let arm = dist
    if (!falling) {
      s.ray.origin = { x: look.x, y: look.y, z: look.z }
      s.ray.dir = { x: s.dir.x, y: s.dir.y, z: s.dir.z }
      const hit = world.castRay(s.ray, dist, true, undefined, undefined, undefined, body ?? undefined)
      if (hit) arm = clamp(hit.timeOfImpact - 0.35, 1.8, dist)
    }
    const desired = new THREE.Vector3().copy(look).addScaledVector(s.dir, arm)

    if (cameraState.snap) {
      s.pos.copy(desired)
      cameraState.snap = false
    } else if (!falling) {
      const k = 1 - Math.exp(-9 * dt)
      s.pos.lerp(desired, k)
    }
    // (While falling the camera stays put and only keeps looking at the ball: no dizzying dive.)

    camera.position.copy(s.pos)
    if (settings.screenShake && runtime.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * runtime.shake * 0.35
      camera.position.y += (Math.random() - 0.5) * runtime.shake * 0.35
    }
    runtime.shake = damp(runtime.shake, 0, 7, dt)
    camera.lookAt(falling ? new THREE.Vector3(bp[0], bp[1], bp[2]) : look)

    const cam = camera as THREE.PerspectiveCamera
    const fovTarget = 62 + clamp(runtime.speed - 8, 0, 18) * 0.6
    s.fov = damp(s.fov, fovTarget, 4, dt)
    if (Math.abs(cam.fov - s.fov) > 0.05) {
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
