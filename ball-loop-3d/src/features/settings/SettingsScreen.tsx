import { useGame } from '../../store/gameStore'
import { Button } from '../../components/ui/Button'
import { SettingsPanel } from './SettingsPanel'

export function SettingsScreen() {
  const setScreen = useGame(s => s.setScreen)
  return (
    <div className="absolute inset-0 z-20 flex flex-col safe-pad bg-[#071040]/70 backdrop-blur-sm overflow-y-auto anim-fade">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between py-3">
          <h2 className="text-3xl font-black uppercase tracking-wide title-grad">Settings</h2>
          <Button onClick={() => setScreen('main')}>Back</Button>
        </div>
        <div className="glass rounded-3xl p-5 mb-6 anim-pop"><SettingsPanel /></div>
      </div>
    </div>
  )
}
