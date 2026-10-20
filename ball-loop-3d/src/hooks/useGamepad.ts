import { useEffect } from 'react'
import { applyDeadzone, input, queueJump } from '../game/player/PlayerInput'

/**
 * Polls the first connected standard-mapping gamepad each animation frame. If none is connected the keyboard and
 * touch sources continue to work unchanged.
 */
export function useGamepad(enabled: boolean, onPause: () => void): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.getGamepads) return
    let raf = 0
    let prevJump = false
    let prevStart = false
    const poll = () => {
      raf = requestAnimationFrame(poll)
      const pads = navigator.getGamepads()
      const pad = Array.from(pads).find(p => p && p.connected)
      if (!pad) {
        input.pad.connected = false
        input.pad.x = input.pad.y = input.pad.lookX = input.pad.lookY = 0
        prevJump = false
        return
      }
      input.pad.connected = true
      input.pad.x = applyDeadzone(pad.axes[0] ?? 0)
      input.pad.y = -applyDeadzone(pad.axes[1] ?? 0)
      input.pad.lookX = applyDeadzone(pad.axes[2] ?? 0)
      input.pad.lookY = applyDeadzone(pad.axes[3] ?? 0)
      // D-pad
      if (pad.buttons[12]?.pressed) input.pad.y = 1
      if (pad.buttons[13]?.pressed) input.pad.y = -1
      if (pad.buttons[14]?.pressed) input.pad.x = -1
      if (pad.buttons[15]?.pressed) input.pad.x = 1
      const jump = !!(pad.buttons[0]?.pressed || pad.buttons[7]?.pressed)
      if (jump && !prevJump) queueJump()
      prevJump = jump
      const start = !!pad.buttons[9]?.pressed
      if (start && !prevStart) onPause()
      prevStart = start
    }
    raf = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(raf)
      input.pad.x = input.pad.y = input.pad.lookX = input.pad.lookY = 0
      input.pad.connected = false
    }
  }, [enabled, onPause])
}
