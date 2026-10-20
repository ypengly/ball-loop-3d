import { useGame } from '../store/gameStore'
import { MainMenu } from '../features/menu/MainMenu'
import { LevelSelect } from '../features/levels/LevelSelect'
import { DailyScreen } from '../features/challenges/DailyScreen'
import { CustomizeScreen } from '../features/customization/CustomizeScreen'
import { AchievementsScreen } from '../features/achievements/AchievementsScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'

/** Menu "router": chooses which menu screen shows while the game phase is MainMenu. */
export function MenuRouter() {
  const screen = useGame(s => s.screen)
  switch (screen) {
    case 'levels': return <LevelSelect mode="adventure" />
    case 'timetrial': return <LevelSelect mode="timetrial" />
    case 'daily': return <DailyScreen />
    case 'customize': return <CustomizeScreen />
    case 'achievements': return <AchievementsScreen />
    case 'settings': return <SettingsScreen />
    default: return <MainMenu />
  }
}
