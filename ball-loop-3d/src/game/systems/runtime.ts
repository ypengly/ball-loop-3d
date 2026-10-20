import type { V3 } from '../utils/math'

/**
 * Mutable per-frame run data. Deliberately NOT React state: the physics loop writes here every step and the HUD
 * samples it a few times per second, so nothing re-renders on every animation frame.
 */
export const runtime = {
  /** Fixed-step simulation clock (only advances while physics runs, so pausing freezes obstacles). */
  simTime: 0,
  /** Run timer in seconds (starts on first input). */
  elapsed: 0,
  started: false,
  speed: 0,
  grounded: false,
  ballPos: [0, 1, 0] as V3,
  ballVel: [0, 0, 0] as V3,
  /** 0..1 along the level route; for endless this is unused. */
  progress: 0,
  /** Distance travelled along the route in metres. */
  distance: 0,
  gems: 0,
  falls: 0,
  checkpoint: -1,
  hint: '' as string,
  shake: 0,
  boostFlash: 0,
  /** Seconds left of the respawn delay. */
  respawnLeft: 0,
}

export function resetRuntime(): void {
  runtime.simTime = 0
  runtime.elapsed = 0
  runtime.started = false
  runtime.speed = 0
  runtime.grounded = false
  runtime.ballPos = [0, 1, 0]
  runtime.ballVel = [0, 0, 0]
  runtime.progress = 0
  runtime.distance = 0
  runtime.gems = 0
  runtime.falls = 0
  runtime.checkpoint = -1
  runtime.hint = ''
  runtime.shake = 0
  runtime.boostFlash = 0
  runtime.respawnLeft = 0
}

/** Camera heading shared between the camera and the input mapping. */
export const cameraState = {
  yaw: 0,
  pitch: 0.42,
  lastManual: -10,
  snap: true,
}
