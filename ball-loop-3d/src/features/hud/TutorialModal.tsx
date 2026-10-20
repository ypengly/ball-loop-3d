import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useGame } from '../../store/gameStore'
import { useSettings } from '../../store/settingsStore'

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-block min-w-8 rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-center text-xs font-black shadow-[0_2px_0_rgba(255,255,255,0.25)]">{children}</kbd>
)

export function TutorialModal() {
  const open = useGame(s => s.tutorialOpen)
  const setOpen = useGame(s => s.setTutorialOpen)
  const markSeen = () => { useSettings.getState().set('tutorialSeen', true); setOpen(false) }
  return (
    <Modal open={open} title="How to play" onClose={markSeen}>
      <p className="text-sm text-white/80 mb-4">Roll to the finish gate, collect gems, and keep your speed up. Falling resets you to your last checkpoint.</p>
      <div className="grid gap-3 text-sm">
        <div className="flex items-center gap-3"><span className="flex gap-1"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></span><span>Roll (arrow keys work too)</span></div>
        <div className="flex items-center gap-3"><Key>Space</Key><span>Jump. You can jump a split second after leaving an edge.</span></div>
        <div className="flex items-center gap-3"><Key>Mouse drag</Key><span>Look around. The camera swings back behind you on its own.</span></div>
        <div className="flex items-center gap-3"><Key>Esc</Key><span>Pause</span></div>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs text-white/70">
        <li><b className="text-mint">Green pads</b> boost you. Loops need speed: roll over a pad without braking.</li>
        <li><b className="text-[#ff7a85]">Red things</b> (hammers, beams) are hazards. <b className="text-[#ffa133]">Orange tiles</b> fall after you touch them.</li>
        <li><b className="text-cyan">Cyan arches</b> are checkpoints. <b className="text-gold">Gems</b> are bonus currency for ball skins.</li>
        <li>On touch devices use the joystick and JUMP button; drag the right side to look.</li>
      </ul>
      <div className="mt-5 flex justify-end"><Button variant="primary" onClick={markSeen}>Got it</Button></div>
    </Modal>
  )
}
