import { useEffect } from 'react'
import { useGame } from '../../store/gameStore'
import { useSettings } from '../../store/settingsStore'
import { useProgress } from '../../store/progressStore'
import { Button } from '../../components/ui/Button'
import { Stars } from '../../components/ui/Stars'
import { getLevel, LEVEL_DEFINITIONS } from '../../game/levels/levelRegistry'
import { challengeText, isLevelUnlocked, nextLevelIndex } from '../../game/systems/LevelProgression'
import { formatTime } from '../../utils/formatTime'

export function LevelSelect({ mode }: { mode: 'adventure' | 'timetrial' }) {
  const setScreen = useGame(s => s.setScreen)
  const startRun = useGame(s => s.startRun)
  const setTutorialOpen = useGame(s => s.setTutorialOpen)
  const completed = useProgress(s => s.progress.completed)
  const ids = LEVEL_DEFINITIONS.map(l => l.id)
  const next = nextLevelIndex(completed, ids)
  const isTT = mode === 'timetrial'

  useEffect(() => {
    // Pre-resolve geometry so the first tap starts instantly.
    LEVEL_DEFINITIONS.forEach((_, i) => getLevel(i))
  }, [])

  return (
    <div className="absolute inset-0 z-20 flex flex-col safe-pad bg-[#071040]/70 backdrop-blur-sm overflow-y-auto anim-fade">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between py-3 gap-3">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-wide title-grad">{isTT ? 'Time Trial' : 'Adventure'}</h2>
            <p className="text-xs text-white/60">{isTT ? 'Beat your personal best. Unlocked levels can be replayed.' : 'Finish each level to unlock the next.'}</p>
          </div>
          <Button onClick={() => setScreen('main')}>Back</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-6">
          {LEVEL_DEFINITIONS.map((def, i) => {
            const rec = completed[def.id]
            const unlocked = isLevelUnlocked(i, completed, ids)
            const isNext = i === next
            const gemsTotal = getLevel(i).totalGems
            return (
              <button
                key={def.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (!useSettings.getState().tutorialSeen) setTutorialOpen(true)
                  startRun({ mode, levelId: def.id })
                }}
                aria-label={`${def.name}${unlocked ? '' : ' (locked)'}`}
                className={`glass text-left rounded-2xl p-4 transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-cyan/60 disabled:opacity-50 disabled:cursor-not-allowed relative ${isNext ? 'ring-2 ring-cyan shadow-[0_0_26px_rgba(47,216,255,0.35)]' : ''}`}
              >
                {isNext && <span className="absolute -top-2 right-3 rounded-full bg-cyan px-2.5 py-0.5 text-[10px] font-black uppercase text-[#04112e]">Next</span>}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-cyan/90">LEVEL {i + 1}</div>
                    <div className="text-lg font-black leading-tight">{def.name}</div>
                    <div className="text-xs text-white/60">{unlocked ? def.subtitle : 'Locked: finish the previous level'}</div>
                  </div>
                  <span className="text-2xl" aria-hidden>{unlocked ? '' : '🔒'}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex gap-1" aria-label={`Difficulty ${def.difficulty} of 5`}>
                    {[1, 2, 3, 4, 5].map(d => <span key={d} className={`h-2 w-4 rounded-full ${d <= def.difficulty ? 'bg-magenta' : 'bg-white/15'}`} />)}
                  </span>
                  <Stars count={rec?.stars ?? 0} size={20} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-white/70 tabular-nums">
                  <span>Best {formatTime(rec?.bestTime ?? null)}</span>
                  <span>💎 {rec?.bestGems ?? 0}/{gemsTotal}</span>
                </div>
                {unlocked && <div className="mt-1 text-[11px] text-white/45">★★★ {challengeText(def)} · par {def.parTime}s</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

