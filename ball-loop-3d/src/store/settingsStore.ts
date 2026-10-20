import { create } from 'zustand'
import type { GraphicsQuality } from '../types'
import { loadJSON, mergeDefaults, saveJSON } from '../utils/storage'

export interface Settings {
  masterVolume: number
  sfxVolume: number
  mouseSensitivity: number
  cameraSensitivity: number
  invertCamera: boolean
  quality: GraphicsQuality
  screenShake: boolean
  cameraDistance: number
  tutorialSeen: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  mouseSensitivity: 1,
  cameraSensitivity: 1,
  invertCamera: false,
  quality: 'medium',
  screenShake: true,
  cameraDistance: 9,
  tutorialSeen: false,
}

const KEY = 'settings'

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function sanitizeSettings(s: Settings): Settings {
  return {
    ...s,
    masterVolume: clampNum(s.masterVolume, 0, 1),
    sfxVolume: clampNum(s.sfxVolume, 0, 1),
    mouseSensitivity: clampNum(s.mouseSensitivity, 0.2, 3),
    cameraSensitivity: clampNum(s.cameraSensitivity, 0.2, 3),
    cameraDistance: clampNum(s.cameraDistance, 5, 16),
    quality: (['low', 'medium', 'high'] as const).includes(s.quality) ? s.quality : 'medium',
  }
}

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

const initial = (): Settings => sanitizeSettings(mergeDefaults(DEFAULT_SETTINGS, loadJSON<unknown>(KEY, null)))

export const useSettings = create<SettingsStore>((set, get) => ({
  ...initial(),
  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>)
    const { set: _s, reset: _r, ...rest } = get()
    void _s
    void _r
    saveJSON(KEY, sanitizeSettings(rest))
  },
  reset: () => {
    set({ ...DEFAULT_SETTINGS, tutorialSeen: true })
    saveJSON(KEY, { ...DEFAULT_SETTINGS, tutorialSeen: true })
  },
}))

/** Non-reactive snapshot for game loops. */
export const getSettings = (): Settings => {
  const { set: _s, reset: _r, ...rest } = useSettings.getState()
  void _s
  void _r
  return rest
}
