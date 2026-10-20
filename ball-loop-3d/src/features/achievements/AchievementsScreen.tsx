import { useGame } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import { Button } from '../../components/ui/Button'
import { ACHIEVEMENTS } from '../../game/systems/LevelProgression'

export function AchievementsScreen() {
  const setScreen = useGame(s => s.setScreen)
  const owned = useProgress(s => s.progress.achievements)
  return (
    <div className="absolute inset-0 z-20 flex flex-col safe-pad bg-[#071040]/70 backdrop-blur-sm overflow-y-auto anim-fade">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between py-3">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-wide title-grad">Badges</h2>
            <p className="text-xs text-white/60">{owned.length} of {ACHIEVEMENTS.length} earned</p>
          </div>
          <Button onClick={() => setScreen('main')}>Back</Button>
        </div>
        <div className="grid gap-2.5 pb-6 sm:grid-cols-2">
          {ACHIEVEMENTS.map(a => {
            const has = owned.includes(a.id)
            return (
              <div key={a.id} className={`glass rounded-2xl p-3.5 flex items-center gap-3 ${has ? '' : 'opacity-60'}`}>
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl ${has ? 'bg-linear-to-b from-gold to-[#ff9d00]' : 'bg-white/10'}`} aria-hidden>{has ? '🏅' : '🔒'}</div>
                <div className="min-w-0">
                  <div className="font-black leading-tight">{a.name}</div>
                  <div className="text-xs text-white/65">{a.description}</div>
                  <div className="text-[11px] text-gold/90">Reward: 💎 {a.gems}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
