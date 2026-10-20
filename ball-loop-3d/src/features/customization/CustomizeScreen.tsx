import { useEffect } from 'react'
import { useGame } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/uiStore'
import { Button } from '../../components/ui/Button'
import { ACHIEVEMENTS, SKINS } from '../../game/systems/LevelProgression'
import type { SkinDef } from '../../types'
import { AudioManager } from '../../game/systems/AudioManager'

function swatch(s: SkinDef): string {
  return s.color2 ? `linear-gradient(135deg, ${s.color} 0 50%, ${s.color2} 50% 100%)` : `radial-gradient(circle at 35% 30%, #fff 0, ${s.color} 40%, #0b1230 140%)`
}

export function CustomizeScreen() {
  const setScreen = useGame(s => s.setScreen)
  const progress = useProgress(s => s.progress)
  const buy = useProgress(s => s.purchaseSkin)
  const select = useProgress(s => s.selectSkin)
  const preview = useUI(s => s.previewSkin)
  const setPreview = useUI(s => s.setPreviewSkin)
  useEffect(() => () => setPreview(null), [setPreview])

  return (
    <div className="absolute inset-0 z-20 flex flex-col safe-pad overflow-y-auto anim-fade">
      <div className="w-full max-w-md md:ml-6 md:mr-auto mx-auto">
        <div className="flex items-center justify-between py-3 gap-3">
          <h2 className="text-3xl font-black uppercase tracking-wide title-grad">Ball Skins</h2>
          <Button onClick={() => setScreen('main')}>Back</Button>
        </div>
        <div className="glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between text-sm font-bold">
            <span>💎 {progress.gems} gems</span>
            <span className="text-xs text-white/55">Cosmetic only. Skins never change gameplay.</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {SKINS.map(s => {
              const owned = progress.unlockedSkins.includes(s.id)
              const selected = progress.selectedSkin === s.id
              const ach = s.unlockedBy ? ACHIEVEMENTS.find(a => a.id === s.unlockedBy) : null
              return (
                <button
                  key={s.id} type="button"
                  onPointerEnter={() => setPreview(s.id)} onFocus={() => setPreview(s.id)} onPointerLeave={() => setPreview(null)}
                  onClick={() => {
                    setPreview(s.id)
                    if (owned) select(s.id)
                    else if (!s.unlockedBy) {
                      const r = buy(s.id)
                      if (r.ok) { select(s.id); AudioManager.play('star') }
                    }
                  }}
                  aria-label={`${s.name} ${owned ? (selected ? '(selected)' : '(owned)') : ach ? `(locked: ${ach.name})` : `(${s.cost} gems)`}`}
                  className={`rounded-2xl p-2 text-center transition-all bg-white/8 hover:bg-white/15 ${selected ? 'ring-2 ring-cyan' : ''} ${preview === s.id ? 'bg-white/20' : ''}`}
                >
                  <div className="mx-auto h-14 w-14 rounded-full border border-white/25" style={{ background: swatch(s), opacity: owned ? 1 : 0.55 }} />
                  <div className="mt-1.5 text-xs font-black leading-tight">{s.name}</div>
                  <div className="text-[11px] text-white/60">
                    {selected ? 'Selected' : owned ? 'Owned' : ach ? `🔒 ${ach.name}` : progress.gems >= s.cost ? `💎 ${s.cost} · buy` : `💎 ${s.cost}`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
