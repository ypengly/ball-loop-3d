import { create } from 'zustand'
import type { GameMode, GamePhase, MenuScreen, RunResult } from '../types'
import { getLevel, getLevelIndex, LEVEL_DEFINITIONS } from '../game/levels/levelRegistry'
import { ACHIEVEMENTS, computeStars, isLevelUnlocked } from '../game/systems/LevelProgression'
import { resetRuntime, runtime } from '../game/systems/runtime'
import { useProgress } from './progressStore'
import { getDailySpec, localDateString } from '../features/challenges/daily'

/** Which phase may follow which. Anything else is ignored, so UI can't push the game into an invalid state. */
const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  Loading: ['MainMenu'],
  MainMenu: ['Playing'],
  Playing: ['Paused', 'Respawning', 'LevelComplete', 'GameOver', 'MainMenu'],
  Paused: ['Playing', 'Respawning', 'MainMenu'],
  Respawning: ['Playing', 'Paused', 'MainMenu'],
  LevelComplete: ['Playing', 'MainMenu'],
  GameOver: ['Playing', 'MainMenu'],
}

export const canTransition = (from: GamePhase, to: GamePhase): boolean => TRANSITIONS[from].includes(to)

export interface RunConfig {
  mode: GameMode
  /** Level id for adventure / time trial / level-type daily. Null for endless. */
  levelId: string | null
  seed: number
  /** Daily date label when mode === 'daily'. */
  date?: string
}

interface GameStore {
  phase: GamePhase
  screen: MenuScreen
  run: RunConfig | null
  /** Bumped on every (re)start so the scene rebuilds from scratch. */
  runId: number
  result: RunResult | null
  gems: number
  falls: number
  checkpoint: number
  tip: string | null
  tutorialOpen: boolean
  settingsOpen: boolean
  /** Phase to return to when un-pausing (Playing or Respawning). */
  resumePhase: GamePhase
  toasts: { id: number; text: string }[]

  boot: () => void
  setScreen: (s: MenuScreen) => void
  startRun: (cfg: Omit<RunConfig, 'seed'> & { seed?: number }) => boolean
  startDaily: () => boolean
  pause: () => void
  resume: () => void
  restart: () => void
  quitToMenu: () => void
  nextLevel: () => void
  beginRespawn: () => void
  endRespawn: () => void
  completeLevel: () => void
  gameOver: () => void
  addGem: () => void
  setCheckpoint: (i: number) => void
  setTip: (t: string | null) => void
  setTutorialOpen: (b: boolean) => void
  setSettingsOpen: (b: boolean) => void
  pushToast: (text: string) => void
  dismissToast: (id: number) => void
}

let toastId = 1

export const useGame = create<GameStore>((set, get) => {
  const go = (to: GamePhase, extra: Partial<GameStore> = {}): boolean => {
    const from = get().phase
    if (!canTransition(from, to)) return false
    set({ phase: to, ...extra })
    return true
  }

  return {
    phase: 'Loading',
    screen: 'main',
    run: null,
    runId: 0,
    result: null,
    gems: 0,
    falls: 0,
    checkpoint: -1,
    tip: null,
    tutorialOpen: false,
    settingsOpen: false,
    resumePhase: 'Playing',
    toasts: [],

    boot: () => { go('MainMenu') },
    setScreen: screen => set({ screen }),

    startRun: cfg => {
      const state = get()
      if (!canTransition(state.phase, 'Playing')) return false
      if (cfg.mode !== 'endless') {
        if (!cfg.levelId || getLevelIndex(cfg.levelId) < 0) return false
        // Adventure respects unlocks; Time Trial can replay any unlocked level; Daily can use any level.
        if (cfg.mode !== 'daily') {
          const completed = useProgress.getState().progress.completed
          const ids = LEVEL_DEFINITIONS.map(l => l.id)
          if (!isLevelUnlocked(getLevelIndex(cfg.levelId), completed, ids)) return false
        }
      }
      resetRuntime()
      const seed = cfg.seed ?? (Math.floor(Math.random() * 2 ** 31) >>> 0)
      const def = cfg.levelId ? LEVEL_DEFINITIONS[getLevelIndex(cfg.levelId)] : null
      const seen = !!(cfg.levelId && useProgress.getState().progress.completed[cfg.levelId])
      set({
        phase: 'Playing', run: { ...cfg, seed }, runId: state.runId + 1, result: null, gems: 0, falls: 0, checkpoint: -1,
        tip: def && !seen ? def.tip : cfg.mode === 'endless' ? 'Roll as far as you can. The course never ends, but it keeps getting harder.' : null,
        resumePhase: 'Playing', settingsOpen: false,
      })
      return true
    },

    startDaily: () => {
      const spec = getDailySpec(localDateString())
      if (spec.kind === 'endless') return get().startRun({ mode: 'daily', levelId: null, seed: spec.seed, date: spec.date })
      return get().startRun({ mode: 'daily', levelId: spec.levelId, seed: spec.seed, date: spec.date })
    },

    pause: () => {
      const { phase } = get()
      if (phase === 'Playing' || phase === 'Respawning') go('Paused', { resumePhase: phase, settingsOpen: false })
    },
    resume: () => {
      const { phase, resumePhase } = get()
      if (phase === 'Paused') go(resumePhase === 'Respawning' ? 'Respawning' : 'Playing', { settingsOpen: false })
    },
    restart: () => {
      const { run, phase, runId } = get()
      if (!run) return
      if (phase !== 'Paused' && phase !== 'LevelComplete' && phase !== 'GameOver' && phase !== 'Playing' && phase !== 'Respawning') return
      resetRuntime()
      // Restart is a re-entry into Playing from any in-run phase.
      set({
        phase: 'Playing', runId: runId + 1, result: null, gems: 0, falls: 0, checkpoint: -1, resumePhase: 'Playing', settingsOpen: false,
        tip: null,
      })
    },
    quitToMenu: () => {
      const { phase } = get()
      if (phase === 'MainMenu' || phase === 'Loading') return
      resetRuntime()
      set({ phase: 'MainMenu', run: null, result: null, tip: null, settingsOpen: false, screen: 'main' })
    },
    nextLevel: () => {
      const { run } = get()
      if (!run || !run.levelId) return
      const idx = getLevelIndex(run.levelId)
      const next = LEVEL_DEFINITIONS[idx + 1]
      if (!next) { get().quitToMenu(); return }
      const mode = run.mode === 'timetrial' ? 'timetrial' : 'adventure'
      get().startRun({ mode, levelId: next.id })
    },

    beginRespawn: () => {
      const { phase, falls } = get()
      if (phase !== 'Playing') return
      runtime.falls += 1
      go('Respawning', { falls: falls + 1 })
    },
    endRespawn: () => { go('Playing') },

    completeLevel: () => {
      const { run, phase, falls, gems } = get()
      if (!run || (phase !== 'Playing' && phase !== 'Respawning')) return
      if (!run.levelId) return
      const level = getLevel(run.levelId)
      const time = runtime.elapsed
      const total = level.totalGems
      const outcome = computeStars({ def: level.def, time, gems, totalGems: total, falls })
      const ids = LEVEL_DEFINITIONS.map(l => l.id)
      const applied = useProgress.getState().recordRun({
        mode: run.mode, levelId: run.levelId, date: run.date, victory: true, time, gems, totalGems: total, falls,
        stars: outcome.stars, distance: 0, levelIds: ids,
      })
      const result: RunResult = {
        mode: run.mode, levelId: run.levelId, victory: true, time, gems, totalGems: total, falls,
        stars: outcome.stars, starReasons: outcome.reasons, newRecord: applied.newRecord, perfect: applied.perfect,
        gemsEarned: applied.gemsEarned, bonusGems: applied.bonusGems, distance: 0, newBestDistance: false,
      }
      for (const id of applied.newAchievements) get().pushToast(`Achievement: ${ACHIEVEMENTS.find(a => a.id === id)?.name ?? id}`)
      go('LevelComplete', { result })
    },

    gameOver: () => {
      const { run, phase, falls, gems } = get()
      if (!run || (phase !== 'Playing' && phase !== 'Respawning')) return
      const distance = Math.floor(runtime.distance)
      const ids = LEVEL_DEFINITIONS.map(l => l.id)
      const applied = useProgress.getState().recordRun({
        mode: run.mode === 'daily' ? 'endless' : run.mode, levelId: run.levelId, date: run.date, victory: false, time: runtime.elapsed, gems,
        totalGems: 0, falls: falls + 1, stars: 0, distance, levelIds: ids,
      })
      const result: RunResult = {
        mode: run.mode, levelId: null, victory: false, time: runtime.elapsed, gems, totalGems: 0, falls: falls + 1, stars: 0,
        starReasons: { finished: false, par: false, challenge: false }, newRecord: false, perfect: false,
        gemsEarned: applied.gemsEarned, bonusGems: applied.bonusGems, distance, newBestDistance: applied.newBestDistance,
      }
      for (const id of applied.newAchievements) get().pushToast(`Achievement: ${ACHIEVEMENTS.find(a => a.id === id)?.name ?? id}`)
      go('GameOver', { result })
    },

    addGem: () => { runtime.gems += 1; set(s => ({ gems: s.gems + 1 })) },
    setCheckpoint: i => { runtime.checkpoint = i; set({ checkpoint: i }) },
    setTip: tip => set({ tip }),
    setTutorialOpen: tutorialOpen => set({ tutorialOpen }),
    setSettingsOpen: settingsOpen => set({ settingsOpen }),
    pushToast: text => {
      const id = toastId++
      set(s => ({ toasts: [...s.toasts.slice(-3), { id, text }] }))
    },
    dismissToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  }
})

/** True while the physics simulation should step. */
export const isSimulating = (p: GamePhase): boolean => p === 'Playing' || p === 'Respawning'
