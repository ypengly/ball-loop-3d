import { useCallback, useEffect, useRef, useState } from 'react'
import { input, queueJump } from '../game/player/PlayerInput'

/** True on devices whose primary input is touch. */
export function useIsTouchDevice(): boolean {
  const [touch, setTouch] = useState(() =>
    typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window),
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)')
    if (!mq) return
    const on = () => setTouch(mq.matches || 'ontouchstart' in window)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}

/** Virtual joystick. Writes straight to the shared input object; React state is only used for the knob visual. */
export function useJoystick(radius = 56) {
  const baseRef = useRef<HTMLDivElement | null>(null)
  const pointerId = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })

  const update = useCallback((clientX: number, clientY: number) => {
    const el = baseRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let dx = clientX - (r.left + r.width / 2)
    let dy = clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > radius) {
      dx = (dx / len) * radius
      dy = (dy / len) * radius
    }
    input.touch.x = dx / radius
    input.touch.y = -dy / radius
    input.touch.active = true
    setKnob({ x: dx, y: dy, active: true })
  }, [radius])

  const end = useCallback(() => {
    pointerId.current = null
    input.touch.x = 0
    input.touch.y = 0
    input.touch.active = false
    setKnob({ x: 0, y: 0, active: false })
  }, [])

  useEffect(() => end, [end])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (pointerId.current !== null) return
      pointerId.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      update(e.clientX, e.clientY)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerId === pointerId.current) update(e.clientX, e.clientY)
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerId === pointerId.current) end()
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (e.pointerId === pointerId.current) end()
    },
  }
  return { baseRef, knob, handlers, radius }
}

export { queueJump }
