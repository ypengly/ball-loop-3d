export type GamePhase = 'Loading' | 'MainMenu' | 'Playing' | 'Paused' | 'Respawning' | 'LevelComplete' | 'GameOver'
export type GameMode = 'adventure' | 'timetrial' | 'endless' | 'daily'
export type MenuScreen = 'main' | 'levels' | 'customize' | 'achievements' | 'settings' | 'daily' | 'timetrial'
export type GraphicsQuality = 'low' | 'medium' | 'high'

export interface RunResult {
  mode: GameMode
  levelId: string | null
  victory: boolean
  time: number
  gems: number
  totalGems: number
  falls: number
  stars: 0 | 1 | 2 | 3
  /** Per-star breakdown shown on the results screen. */
  starReasons: { finished: boolean; par: boolean; challenge: boolean }
  newRecord: boolean
  perfect: boolean
  gemsEarned: number
  distance: number
  newBestDistance: boolean
  bonusGems: number
}

export interface SkinDef {
  id: string
  name: string
  color: string
  color2?: string
  pattern: 'solid' | 'stripes' | 'checker' | 'rings' | 'dots'
  material: 'glossy' | 'metal' | 'glass' | 'neon'
  cost: number
  /** Optional achievement that unlocks it for free. */
  unlockedBy?: string
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  gems: number
}
