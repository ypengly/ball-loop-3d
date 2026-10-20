import { useCallback } from 'react'
import { GameCanvas } from '../../game/GameCanvas'
import { useGame } from '../../store/gameStore'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useGamepad } from '../../hooks/useGamepad'
import { useIsTouchDevice } from '../../hooks/useMobileControls'
import { resetInput } from '../../game/player/PlayerInput'
import { LoadingScreen } from './LoadingScreen'
import { MenuRouter } from '../../app/router'
import { Hud } from '../../features/hud/Hud'
import { PauseMenu } from '../../features/hud/PauseMenu'
import { ResultsScreen } from '../../features/hud/ResultsScreen'
import { MobileControls } from '../../features/hud/MobileControls'
import { TutorialModal } from '../../features/hud/TutorialModal'
import { Toasts } from '../../features/hud/Toasts'

/** Composes the 3D canvas with the HUD / menus and owns global input routing (Esc, gamepad Start). */
export function GameShell() {
  const phase = useGame(s => s.phase)
  const run = useGame(s => s.run)
  const tutorialOpen = useGame(s => s.tutorialOpen)
  const touch = useIsTouchDevice()

  const inRun = phase === 'Playing' || phase === 'Respawning' || phase === 'Paused'
  const showHud = inRun || phase === 'LevelComplete' || phase === 'GameOver'

  const onEscape = useCallback(() => {
    const g = useGame.getState()
    if (g.tutorialOpen) { g.setTutorialOpen(false); return }
    if (g.phase === 'Playing' || g.phase === 'Respawning') {
      resetInput()
      g.pause()
    } else if (g.phase === 'Paused') {
      if (g.settingsOpen) g.setSettingsOpen(false)
      else g.resume()
    } else if (g.phase === 'MainMenu' && g.screen !== 'main') {
      g.setScreen('main')
    }
  }, [])

  useKeyboard({ enabled: phase !== 'Loading' && !tutorialOpen, onEscape })
  useGamepad(inRun, onEscape)

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1230]" style={{ touchAction: 'none' }}>
      <GameCanvas />
      {phase === 'Loading' && <LoadingScreen />}
      {phase === 'MainMenu' && <MenuRouter />}
      {showHud && run && <Hud touch={touch} />}
      {touch && (phase === 'Playing' || phase === 'Respawning') && <MobileControls />}
      <PauseMenu />
      <ResultsScreen />
      <TutorialModal />
      <Toasts />
    </div>
  )
}
