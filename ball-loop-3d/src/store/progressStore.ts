import { create } from 'zustand'
import { loadJSON, mergeDefaults, removeKey, saveJSON } from '../utils/storage'
import {
  DEFAULT_PROGRESS, applyRunToProgress, buySkin, type ApplyOutcome, type BuySkinResult, type Progress, type RunSummary,
} from '../game/systems/LevelProgression'

const KEY = 'progress'

/** Persistent progress only: unlocked levels, records, currency, skins, achievements. Run state lives in gameStore. */
interface ProgressStore {
  progress: Progress
  recordRun: (run: RunSummary) => ApplyOutcome
  purchaseSkin: (id: string) => BuySkinResult
  selectSkin: (id: string) => void
  resetAll: () => void
}

function load(): Progress {
  const merged = mergeDefaults(DEFAULT_PROGRESS, loadJSON<unknown>(KEY, null))
  // Guard against corrupted saves.
  if (!merged.unlockedSkins.includes('azure')) merged.unlockedSkins = ['azure', ...merged.unlockedSkins]
  if (!merged.unlockedSkins.includes(merged.selectedSkin)) merged.selectedSkin = 'azure'
  return merged
}

export const useProgress = create<ProgressStore>((set, get) => ({
  progress: load(),
  recordRun: run => {
    const out = applyRunToProgress(get().progress, run)
    set({ progress: out.progress })
    saveJSON(KEY, out.progress)
    return out
  },
  purchaseSkin: id => {
    const res = buySkin(get().progress, id)
    if (res.ok) {
      set({ progress: res.progress })
      saveJSON(KEY, res.progress)
    }
    return res
  },
  selectSkin: id => {
    const p = get().progress
    if (!p.unlockedSkins.includes(id)) return
    const next = { ...p, selectedSkin: id }
    set({ progress: next })
    saveJSON(KEY, next)
  },
  resetAll: () => {
    removeKey(KEY)
    set({ progress: { ...DEFAULT_PROGRESS, completed: {}, dailyBests: {}, achievements: [], unlockedSkins: ['azure'] } })
  },
}))
