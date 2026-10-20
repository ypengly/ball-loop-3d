import { clamp } from '../utils/math'

/**
 * Raw input state. Sources (keyboard / gamepad / touch) write into this object from event handlers and per-frame
 * polling; the physics step reads a combined snapshot once per fixed step. Input processing never touches physics.
 */
export interface InputSources {
  keys: { forward: boolean; back: boolean; left: boolean; right: boolean }
  pad: { x: number; y: number; connected: boolean; lookX: number; lookY: number }
  touch: { x: number; y: number; active: boolean }
  /** Jump presses waiting to be consumed (edge triggered, so a quick tap is never lost between steps). */
  jumpQueued: number
  jumpHeld: boolean
  /** Accumulated camera look deltas (radians-ish, pre-sensitivity) from stick/touch. */
  lookX: number
  lookY: number
  /** True when any control input has been given since reset. */
  anyInput: boolean
}

export const input: InputSources = {
  keys: { forward: false, back: false, left: false, right: false },
  pad: { x: 0, y: 0, connected: false, lookX: 0, lookY: 0 },
  touch: { x: 0, y: 0, active: false },
  jumpQueued: 0,
  jumpHeld: false,
  lookX: 0,
  lookY: 0,
  anyInput: false,
}

export function resetInput(): void {
  input.keys.forward = input.keys.back = input.keys.left = input.keys.right = false
  input.pad.x = input.pad.y = input.pad.lookX = input.pad.lookY = 0
  input.touch.x = input.touch.y = 0
  input.touch.active = false
  input.jumpQueued = 0
  input.jumpHeld = false
  input.lookX = input.lookY = 0
  input.anyInput = false
}

export interface MoveSnapshot {
  /** Strafe: +1 = right. */
  x: number
  /** Forward: +1 = away from the camera. */
  y: number
  jump: boolean
}

/** Combine every source. Keyboard and touch keep working when a gamepad is connected and idle. */
export function readMove(): MoveSnapshot {
  const k = input.keys
  let x = (k.right ? 1 : 0) - (k.left ? 1 : 0)
  let y = (k.forward ? 1 : 0) - (k.back ? 1 : 0)
  x += input.pad.x + input.touch.x
  y += input.pad.y + input.touch.y
  const len = Math.hypot(x, y)
  if (len > 1) {
    x /= len
    y /= len
  }
  const jump = input.jumpQueued > 0
  if (jump) input.jumpQueued = 0
  if (len > 0.05 || jump) input.anyInput = true
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1), jump }
}

export function queueJump(): void {
  input.jumpQueued = 1
  input.jumpHeld = true
}

/** Dead-zone with smooth rescale so small stick drift does nothing. */
export function applyDeadzone(v: number, dz = 0.15): number {
  const a = Math.abs(v)
  if (a < dz) return 0
  return Math.sign(v) * ((a - dz) / (1 - dz))
}
