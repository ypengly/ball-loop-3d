import { useGame } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import { Button } from '../../components/ui/Button'
import { getDailySpec, localDateString } from './daily'
import { formatDistance, formatTime } from '../../utils/formatTime'
import { LEVEL_DEFINITIONS } from '../../game/levels/levelRegistry'

export function DailyScreen() {
  const setScreen = useGame(s => s.setScreen)
  const startDaily = useGame(s => s.startDaily)
  const bests = useProgress(s => s.progress.dailyBests)
  const date = localDateString()
  const spec = getDailySpec(date)
  const best = bests[date]
  const level = spec.levelId ? LEVEL_DEFINITIONS.find(l => l.id === spec.levelId) : null
  const tomorrow = getDailySpec(localDateString(new Date(Date.now() + 86400000)))

  return (
    <div className="absolute inset-0 z-20 flex flex-col safe-pad bg-[#071040]/70 backdrop-blur-sm overflow-y-auto anim-fade">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between py-3">
          <h2 className="text-3xl font-black uppercase tracking-wide title-grad">Daily Challenge</h2>
          <Button onClick={() => setScreen('main')}>Back</Button>
        </div>
        <div className="glass rounded-3xl p-6 anim-pop">
          <div className="text-xs font-black uppercase tracking-widest text-gold">{date}</div>
          <h3 className="mt-1 text-2xl font-black">{spec.title}</h3>
          <p className="mt-1 text-sm text-white/75">{spec.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-xs text-white/55">Course</div>
              <div className="font-bold">{level ? `${level.name} (level ${LEVEL_DEFINITIONS.indexOf(level) + 1})` : `Endless · seed ${spec.seed.toString(16)}`}</div>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-xs text-white/55">Your best today</div>
              <div className="font-bold tabular-nums">
                {!best ? '—' : level ? formatTime(best.time) : formatDistance(best.distance)}
              </div>
            </div>
          </div>
          <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => startDaily()}>Play today's course</Button>
          <p className="mt-4 rounded-xl bg-white/6 p-3 text-xs leading-relaxed text-white/65">
            <b className="text-white/85">Local date, not a global one.</b> The daily course is chosen from this device's
            clock ({Intl.DateTimeFormat().resolvedOptions().timeZone}), so there is no shared leaderboard and players in other
            time zones may see a different day. Tomorrow on this device: <b>{tomorrow.title}</b>.
          </p>
        </div>
      </div>
    </div>
  )
}
