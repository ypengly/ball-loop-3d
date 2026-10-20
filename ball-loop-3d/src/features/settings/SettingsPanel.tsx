import { useState } from 'react'
import { useSettings } from '../../store/settingsStore'
import { useProgress } from '../../store/progressStore'
import { useGame } from '../../store/gameStore'
import { Slider } from '../../components/ui/Slider'
import { Toggle } from '../../components/ui/Toggle'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { AudioManager } from '../../game/systems/AudioManager'
import type { GraphicsQuality } from '../../types'

const pct = (v: number) => `${Math.round(v * 100)}%`

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-bold text-white/85">{label}</span>
      {children}
    </div>
  )
}

export function SettingsPanel({ showReset = true }: { showReset?: boolean }) {
  const s = useSettings()
  const resetProgress = useProgress(p => p.resetAll)
  const setTutorialOpen = useGame(g => g.setTutorialOpen)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-black uppercase tracking-widest text-cyan/90 pt-1">Audio</h3>
      <Slider label="Master volume" value={s.masterVolume} min={0} max={1} onChange={v => { s.set('masterVolume', v); AudioManager.setVolumes(v, s.sfxVolume) }} format={pct} />
      <Slider label="Sound effects" value={s.sfxVolume} min={0} max={1} onChange={v => { s.set('sfxVolume', v); AudioManager.setVolumes(s.masterVolume, v) }} format={pct} />

      <h3 className="text-xs font-black uppercase tracking-widest text-cyan/90 pt-3">Camera & controls</h3>
      <Slider label="Mouse sensitivity" value={s.mouseSensitivity} min={0.2} max={3} onChange={v => s.set('mouseSensitivity', v)} format={v => v.toFixed(1)} />
      <Slider label="Camera sensitivity" value={s.cameraSensitivity} min={0.2} max={3} onChange={v => s.set('cameraSensitivity', v)} format={v => v.toFixed(1)} />
      <Slider label="Camera distance" value={s.cameraDistance} min={5} max={16} step={0.5} onChange={v => s.set('cameraDistance', v)} format={v => `${v.toFixed(1)} m`} />
      <Row label="Invert camera"><Toggle label="Invert camera" checked={s.invertCamera} onChange={v => s.set('invertCamera', v)} /></Row>
      <Row label="Screen shake"><Toggle label="Screen shake" checked={s.screenShake} onChange={v => s.set('screenShake', v)} /></Row>

      <h3 className="text-xs font-black uppercase tracking-widest text-cyan/90 pt-3">Graphics</h3>
      <div className="flex gap-2 py-1" role="radiogroup" aria-label="Graphics quality">
        {(['low', 'medium', 'high'] as GraphicsQuality[]).map(q => (
          <button
            key={q} type="button" role="radio" aria-checked={s.quality === q} onClick={() => s.set('quality', q)}
            className={`flex-1 rounded-xl py-2 text-sm font-extrabold uppercase transition-colors ${s.quality === q ? 'bg-cyan text-[#04112e]' : 'bg-white/10 hover:bg-white/20'}`}
          >{q}</button>
        ))}
      </div>
      <p className="text-xs text-white/55">Low disables shadows, reflections and the speed trail for older devices.</p>

      <h3 className="text-xs font-black uppercase tracking-widest text-cyan/90 pt-3">Control hints</h3>
      <ul className="text-xs text-white/70 space-y-1 leading-relaxed">
        <li><b className="text-white">Keyboard:</b> WASD / arrows roll · Space jump · drag mouse to look · Esc pause</li>
        <li><b className="text-white">Touch:</b> left joystick roll · JUMP button · drag the right side to look</li>
        <li><b className="text-white">Gamepad:</b> left stick roll · A / RT jump · right stick look · Start pause</li>
      </ul>
      <div className="flex flex-wrap gap-2 pt-3">
        <Button size="sm" onClick={() => setTutorialOpen(true)}>Show controls tutorial</Button>
        <Button size="sm" onClick={() => s.reset()}>Reset settings</Button>
        {showReset && <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>Erase progress</Button>}
      </div>
      <Modal open={confirm} title="Erase all progress?" onClose={() => setConfirm(false)}>
        <p className="text-sm text-white/75 mb-5">This deletes unlocked levels, records, gems, skins and achievements on this device. Settings are kept.</p>
        <div className="flex gap-3 justify-end">
          <Button onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { resetProgress(); setConfirm(false) }}>Erase</Button>
        </div>
      </Modal>
    </div>
  )
}
