import { useGame } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import { useSettings } from '../../store/settingsStore'
import { Button } from '../../components/ui/Button'
import { Logo } from '../../components/ui/Logo'
import { LEVEL_DEFINITIONS } from '../../game/levels/levelRegistry'
import { nextLevelIndex } from '../../game/systems/LevelProgression'
import { formatDistance } from '../../utils/formatTime'
import { getDailySpec, localDateString } from '../challenges/daily'

export function MainMenu() {
  const setScreen = useGame(s => s.setScreen)
  const startRun = useGame(s => s.startRun)
  const setTutorialOpen = useGame(s => s.setTutorialOpen)
  const progress = useProgress(s => s.progress)
  const tutorialSeen = useSettings(s => s.tutorialSeen)

  const ids = LEVEL_DEFINITIONS.map(l => l.id)
  const next = nextLevelIndex(progress.completed, ids)
  const done = Object.keys(progress.completed).length
  const daily = getDailySpec(localDateString())

  const play = () => {
    const idx = next === -1 ? 0 : next
    if (!tutorialSeen) setTutorialOpen(true)
    startRun({ mode: 'adventure', levelId: ids[idx] })
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col md:flex-row items-stretch safe-pad overflow-y-auto">
      <div className="flex flex-col justify-center gap-3 md:w-[26rem] w-full max-w-md mx-auto md:mx-0 md:ml-6 py-4 anim-pop">
        <Logo className="w-full max-w-[22rem] drop-shadow-[0_8px_24px_rgba(20,60,200,0.5)] self-center md:self-start" />
        <div className="glass rounded-3xl p-4 flex flex-col gap-2.5">
          <Button variant="primary" size="lg" onClick={play} className="w-full">
            {done === 0 ? 'Play' : next === -1 ? 'Play again' : `Continue · Level ${next + 1}`}
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button onClick={() => setScreen('levels')}>Levels</Button>
            <Button onClick={() => startRun({ mode: 'endless', levelId: null })}>Endless Loop</Button>
            <Button onClick={() => setScreen('timetrial')}>Time Trial</Button>
            <Button onClick={() => setScreen('daily')}>Daily<span className="ml-1 text-gold">★</span></Button>
            <Button onClick={() => setScreen('customize')}>Ball Skins</Button>
            <Button onClick={() => setScreen('achievements')}>Badges</Button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Button onClick={() => setScreen('settings')}>Settings</Button>
            <Button onClick={() => setTutorialOpen(true)}>How to play</Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-2 text-xs font-bold text-white/70">
          <span title="Gems are spent on ball skins">💎 {progress.gems} gems</span>
          <span>Best endless: {formatDistance(progress.bestDistance)}</span>
          <span title="Local device date">Daily: {daily.title}</span>
        </div>
      </div>
    </div>
  )
}
