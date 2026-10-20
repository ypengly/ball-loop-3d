import { useEffect } from 'react'
import { input, queueJump, resetInput } from '../game/player/PlayerInput'

const MAP: Record<string, 'forward' | 'back' | 'left' | 'right'> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
}

interface Options {
  enabled: boolean
  onEscape: () => void
}

/** Keyboard controls. Listeners are removed on unmount/disable and keys are released on blur. */
export function useKeyboard({ enabled, onEscape }: Options): void {
  useEffect(() => {
    if (!enabled) return
    const down = (e: KeyboardEvent) => {
      if (e.repeat) {
        if (MAP[e.code] || e.code === 'Space') e.preventDefault()
        return
      }
      const dir = MAP[e.code]
      if (dir) {
        input.keys[dir] = true
        e.preventDefault()
      } else if (e.code === 'Space') {
        queueJump()
        e.preventDefault()
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        onEscape()
      }
    }
    const up = (e: KeyboardEvent) => {
      const dir = MAP[e.code]
      if (dir) input.keys[dir] = false
      else if (e.code === 'Space') input.jumpHeld = false
    }
    const blur = () => resetInput()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      resetInput()
    }
  }, [enabled, onEscape])
}
