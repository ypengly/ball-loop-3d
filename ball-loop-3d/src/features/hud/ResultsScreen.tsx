import { useEffect } from 'react'
import { useGame } from '../../store/gameStore'
import { Button } from '../../components/ui/Button'
import { Stars } from '../../components/ui/Stars'
import { LEVEL_DEFINITIONS, getLevel } from '../../game/levels/levelRegistry'
import { challengeText } from '../../game/systems/LevelProgression'
import { formatDistance, formatTime } from '../../utils/formatTime'
import { AudioManager } from '../../game/systems/AudioManager'
import { useProgress } from '../../store/progressStore'

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/8 px-3 py-2.5 text-center">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</div>
      <div className={`text-xl font-black tabular-nums ${accent ? 'text-gold' : ''}`}>{value}</div>
    </div>
  )
}

export function ResultsScreen() {
  const phase = useGame(s => s.phase)
  const result = useGame(s => s.result)
  const run = useGame(s => s.run)
  const { restart, quitToMenu, nextLevel } = useGame.getState()
  const best = useProgress(s => (run?.levelId ? s.progress.completed[run.levelId]?.bestTime ?? null : null))
  const open = (phase === 'LevelComplete' || phase === 'GameOver') && !!result

  useEffect(() => {
    if (!open || !result) return
    if (result.victory) {
      const id = window.setTimeout(() => AudioManager.play('star'), 500)
      return () => window.clearTimeout(id)
    }
  }, [open, result])

  if (!open || !result || !run) return null
  const level = result.levelId ? getLevel(result.levelId) : null
  const idx = result.levelId ? LEVEL_DEFINITIONS.findIndex(l => l.id === result.levelId) : -1
  const hasNext = result.victory && (run.mode === 'adventure' || run.mode === 'timetrial') && idx >= 0 && idx < LEVEL_DEFINITIONS.length - 1
  const endless = !level

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050a22]/55 safe-pad anim-fade">
      <div className="glass anim-pop w-full max-w-lg rounded-3xl p-6 max-h-[94dvh] overflow-y-auto" role="dialog" aria-label="Results">
        <div className="text-center">
          <div className={`text-xs font-black uppercase tracking-[0.3em] ${result.victory ? 'text-mint' : 'text-[#ff7a85]'}`}>
            {result.victory ? 'Level complete' : 'Run over'}
          </div>
          <h2 className="mt-1 text-3xl font-black title-grad">
            {level ? level.def.name : result.mode === 'daily' ? 'Daily Endless' : 'Endless Loop'}
          </h2>
          {result.victory && <div className="mt-3 flex justify-center"><Stars count={result.stars} size={44} animate /></div>}
        </div>

        {result.victory && level && (
          <ul className="mt-3 space-y-1 text-center text-xs text-white/75">
            <li className="text-white/90">★ Finished the level</li>
            <li className={result.starReasons.par ? 'text-white/90' : 'text-white/40'}>{result.starReasons.par ? '★' : '☆'} Under par time ({level.def.parTime}s)</li>
            <li className={result.starReasons.challenge ? 'text-white/90' : 'text-white/40'}>{result.starReasons.challenge ? '★' : '☆'} {challengeText(level.def)}</li>
          </ul>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {endless ? (
            <>
              <Stat label="Distance" value={formatDistance(result.distance)} accent={result.newBestDistance} />
              <Stat label="Gems" value={String(result.gems)} />
              <Stat label="Time" value={formatTime(result.time)} />
              <Stat label="Best distance" value={formatDistance(useProgress.getState().progress.bestDistance)} />
            </>
          ) : (
            <>
              <Stat label="Time" value={formatTime(result.time)} accent={result.newRecord} />
              <Stat label="Personal best" value={formatTime(best)} />
              <Stat label="Gems" value={`${result.gems}/${result.totalGems}`} />
              <Stat label="Falls" value={String(result.falls)} />
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-black uppercase">
          {result.newRecord && <span className="rounded-full bg-gold px-3 py-1 text-[#3a2500]">New record!</span>}
          {result.newBestDistance && <span className="rounded-full bg-gold px-3 py-1 text-[#3a2500]">New best distance!</span>}
          {result.perfect && <span className="rounded-full bg-mint px-3 py-1 text-[#04321d]">Perfect run: no falls</span>}
        </div>
        <p className="mt-2 text-center text-xs text-white/60">
          Earned 💎 {result.gemsEarned + result.bonusGems}
          {result.bonusGems > 0 ? ` (${result.gemsEarned} collected + ${result.bonusGems} bonus)` : ''}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {hasNext && <Button variant="primary" size="lg" onClick={() => nextLevel()}>Next level</Button>}
          <Button variant={hasNext ? 'secondary' : 'primary'} size={hasNext ? 'md' : 'lg'} onClick={() => restart()}>{result.victory ? 'Replay' : 'Try again'}</Button>
          <Button variant="ghost" onClick={() => quitToMenu()}>Menu</Button>
        </div>
      </div>
    </div>
  )
}
