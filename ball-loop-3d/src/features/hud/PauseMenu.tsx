import { useGame } from '../../store/gameStore'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { SettingsPanel } from '../settings/SettingsPanel'

export function PauseMenu() {
  const phase = useGame(s => s.phase)
  const settingsOpen = useGame(s => s.settingsOpen)
  const { resume, restart, quitToMenu, setSettingsOpen, setTutorialOpen } = useGame.getState()
  if (phase !== 'Paused') return null
  return (
    <>
      <Modal open={!settingsOpen} title="Paused">
        <div className="flex flex-col gap-2.5">
          <Button variant="primary" size="lg" onClick={() => resume()}>Resume</Button>
          <Button onClick={() => restart()}>Restart level</Button>
          <Button onClick={() => setSettingsOpen(true)}>Settings</Button>
          <Button onClick={() => setTutorialOpen(true)}>Controls</Button>
          <Button variant="ghost" onClick={() => quitToMenu()}>Main menu</Button>
        </div>
      </Modal>
      <Modal open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)} wide>
        <SettingsPanel showReset={false} />
        <div className="mt-4 flex justify-end"><Button variant="primary" onClick={() => setSettingsOpen(false)}>Back</Button></div>
      </Modal>
    </>
  )
}
