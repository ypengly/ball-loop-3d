import { useEffect, type ReactNode } from 'react'
import { AudioManager } from '../game/systems/AudioManager'
import { useSettings } from '../store/settingsStore'
import { useGame } from '../store/gameStore'

/** App-wide side effects: audio unlock, volume sync, and pausing when the tab is hidden. */
export function Providers({ children }: { children: ReactNode }) {
  const master = useSettings(s => s.masterVolume)
  const sfx = useSettings(s => s.sfxVolume)

  useEffect(() => {
    const unlock = () => {
      AudioManager.init()
      AudioManager.setVolumes(useSettings.getState().masterVolume, useSettings.getState().sfxVolume)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => { AudioManager.setVolumes(master, sfx) }, [master, sfx])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        useGame.getState().pause()
        AudioManager.suspend(true)
      } else {
        AudioManager.suspend(false)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return <>{children}</>
}
