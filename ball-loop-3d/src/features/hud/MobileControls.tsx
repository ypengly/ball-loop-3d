import { useJoystick, queueJump } from '../../hooks/useMobileControls'

/** On-screen joystick + jump button. Large touch targets; touch-action:none stops the page from scrolling. */
export function MobileControls() {
  const { baseRef, knob, handlers, radius } = useJoystick(56)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between safe-pad pb-[max(1.25rem,env(safe-area-inset-bottom))]" style={{ touchAction: 'none' }}>
      <div
        ref={baseRef}
        {...handlers}
        className="pointer-events-auto relative h-36 w-36 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm"
        style={{ touchAction: 'none' }}
        role="application"
        aria-label="Movement joystick"
      >
        <div
          className={`absolute left-1/2 top-1/2 h-16 w-16 rounded-full border border-white/50 shadow-lg transition-colors ${knob.active ? 'bg-cyan/80' : 'bg-white/35'}`}
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
        <span className="sr-only">radius {radius}</span>
      </div>
      <button
        type="button"
        aria-label="Jump"
        onPointerDown={e => { e.preventDefault(); queueJump() }}
        className="pointer-events-auto h-28 w-28 rounded-full border-2 border-white/40 bg-linear-to-b from-[#ffe38a] to-[#ffb02e] text-lg font-black uppercase text-[#3a2500] shadow-[0_6px_0_#a8680a] active:translate-y-1 active:shadow-[0_2px_0_#a8680a]"
        style={{ touchAction: 'none' }}
      >Jump</button>
    </div>
  )
}
