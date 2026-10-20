import { useEffect } from 'react'
import { useGame } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import { useRuntimeSample } from '../../hooks/useRuntimeSample'
import { getLevel } from '../../game/levels/levelRegistry'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { formatDistance, formatTime } from '../../utils/formatTime'
import { challengeText } from '../../game/systems/LevelProgression'

export function Hud({ touch }: { touch: boolean }) {
  const phase = useGame(s => s.phase)
  const run = useGame(s => s.run)!
  const gems = useGame(s => s.gems)
  const falls = useGame(s => s.falls)
  const checkpoint = useGame(s => s.checkpoint)
  const tip = useGame(s => s.tip)
  const setTip = useGame(s => s.setTip)
  const pause = useGame(s => s.pause)
  const bestTime = useProgress(s => (run.levelId ? s.progress.completed[run.levelId]?.bestTime ?? null : null))
  const bestDist = useProgress(s => s.progress.bestDistance)
  const active = phase === 'Playing' || phase === 'Respawning' || phase === 'Paused'
  const rt = useRuntimeSample(active)
  const level = run.levelId ? getLevel(run.levelId) : null
  const endless = !level

  useEffect(() => {
    if (!tip) return
    const id = window.setTimeout(() => setTip(null), 9000)
    return () => window.clearTimeout(id)
  }, [tip, setTip])

  return (
    <div className="pointer-events-none absolute inset-0 z-10 safe-pad select-none">
      {/* top bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="glass pointer-events-none rounded-2xl px-3.5 py-2 max-w-[46%]">
          <div className="text-[10px] font-black uppercase tracking-widest text-cyan/90">
            {run.mode === 'daily' ? 'Daily' : run.mode === 'timetrial' ? 'Time trial' : run.mode === 'endless' ? 'Endless loop' : `Level ${level!.index + 1}`}
          </div>
          <div className="text-base font-black leading-tight truncate">{level ? level.def.name : 'Endless Loop'}</div>
          <div className="hidden sm:block text-[11px] text-white/65 leading-snug">
            {level ? level.def.objective : 'Roll as far as you can. One fall ends the run.'}
          </div>
        </div>

        <div className="glass rounded-2xl px-5 py-2 text-center min-w-36">
          {endless ? (
            <>
              <div className="text-2xl font-black tabular-nums leading-none">{formatDistance(rt.distance)}</div>
              <div className="mt-1 text-[11px] text-white/60">Best {formatDistance(Math.max(bestDist, rt.distance))}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-black tabular-nums leading-none" aria-label="Elapsed time">{formatTime(rt.elapsed)}</div>
              <div className="mt-1 flex justify-center gap-3 text-[11px] text-white/70">
                <span title="Gems">💎 {gems}/{level!.totalGems}</span>
                {run.mode !== 'adventure' && <span title="Personal best">Best {formatTime(bestTime)}</span>}
              </div>
            </>
          )}
          {endless && <div className="text-[11px] text-white/70">💎 {gems}</div>}
        </div>

        <button
          type="button" aria-label="Pause"
          onClick={() => pause()}
          className="glass pointer-events-auto grid h-12 w-12 place-items-center rounded-2xl text-xl font-black hover:bg-white/20 active:scale-95"
        >❚❚</button>
      </div>

      {/* progress + checkpoint */}
      {level && (
        <div className="mx-auto mt-2 w-full max-w-md">
          <ProgressBar value={rt.progress} />
          <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wide text-white/55">
            <span>Start</span>
            <span>{checkpoint >= 0 ? `Checkpoint ${checkpoint + 1}/${level.checkpoints.length}` : 'No checkpoint yet'}{falls > 0 ? ` · ${falls} fall${falls > 1 ? 's' : ''}` : ''}</span>
            <span>Finish</span>
          </div>
        </div>
      )}

      {/* center messages */}
      <div className="absolute inset-x-0 top-[26%] flex flex-col items-center gap-2 px-4">
        {!rt.started && phase === 'Playing' && (
          <div className="glass rounded-2xl px-5 py-2.5 text-sm font-black uppercase tracking-wide animate-pulse">
            {touch ? 'Use the joystick to start' : 'Press W / arrows to start'}
          </div>
        )}
        {phase === 'Respawning' && <div className="glass rounded-2xl px-5 py-2.5 text-lg font-black uppercase tracking-wide text-gold">{endless ? 'Falling…' : 'Back to checkpoint…'}</div>}
      </div>

      {/* tip + contextual hint */}
      <div className="absolute inset-x-0 bottom-[22%] md:bottom-[12%] flex flex-col items-center gap-2 px-4">
        {rt.hint === 'jump' && phase === 'Playing' && (
          <div className="rounded-full bg-gold px-5 py-2 text-sm font-black uppercase tracking-wide text-[#3a2500] shadow-lg">
            {touch ? 'Tap JUMP!' : 'Press SPACE to jump!'}
          </div>
        )}
        {tip && phase !== 'Paused' && (
          <button type="button" onClick={() => setTip(null)} className="glass pointer-events-auto max-w-lg rounded-2xl px-4 py-3 text-center text-sm text-white/90 anim-pop">
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan/90">Tip</div>
            {tip}
            {level && <div className="mt-1 text-[11px] text-white/55">★★★ {challengeText(level.def)}</div>}
          </button>
        )}
      </div>
      {/* boost flash */}
      <div className="absolute inset-0 transition-opacity" style={{ opacity: rt.boost * 0.35, background: 'radial-gradient(circle at center, transparent 45%, rgba(53,255,154,0.6) 100%)' }} />
    </div>
  )
}
