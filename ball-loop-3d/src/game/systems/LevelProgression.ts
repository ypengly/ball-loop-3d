import type { Challenge, LevelDefinition } from '../levels/levelTypes'
import type { AchievementDef, RunResult, SkinDef } from '../../types'

/* ---------------------------- stars ---------------------------- */

export interface StarInput {
  def: Pick<LevelDefinition, 'parTime' | 'challenge' | 'expertTime'>
  time: number
  gems: number
  totalGems: number
  falls: number
}

export interface StarOutcome {
  stars: 0 | 1 | 2 | 3
  reasons: { finished: boolean; par: boolean; challenge: boolean }
}

export function challengeMet(i: StarInput): boolean {
  const c: Challenge = i.def.challenge
  if (c === 'allGems') return i.totalGems > 0 && i.gems >= i.totalGems
  if (c === 'noFalls') return i.falls === 0
  return i.time <= (i.def.expertTime ?? i.def.parTime * 0.8)
}

/** 1 star for finishing, 2 for beating the par time, 3 for also meeting the level's optional challenge. */
export function computeStars(i: StarInput): StarOutcome {
  const par = i.time <= i.def.parTime
  const challenge = challengeMet(i)
  const stars = (1 + (par ? 1 : 0) + (challenge ? 1 : 0)) as 1 | 2 | 3
  return { stars, reasons: { finished: true, par, challenge } }
}

export const challengeText = (def: Pick<LevelDefinition, 'challenge' | 'expertTime'>): string =>
  def.challenge === 'allGems'
    ? 'Collect every gem'
    : def.challenge === 'noFalls'
      ? 'Finish without falling'
      : `Finish in under ${(def.expertTime ?? 0).toFixed(0)}s`

/* ------------------------- unlocking --------------------------- */

export function isLevelUnlocked(index: number, completed: Readonly<Record<string, unknown>>, ids: readonly string[]): boolean {
  if (index <= 0) return true
  const prev = ids[index - 1]
  return !!prev && !!completed[prev]
}

export function nextLevelIndex(completed: Readonly<Record<string, unknown>>, ids: readonly string[]): number {
  for (let i = 0; i < ids.length; i++) if (!completed[ids[i]]) return i
  return -1
}

/* ------------------------ gem rewards -------------------------- */

/** Currency earned from a run. Gems are only cosmetics currency: they never affect gameplay. */
export function gemReward(r: { gems: number; stars: number; perfect: boolean; firstClear: boolean }): { base: number; bonus: number } {
  const base = r.gems
  let bonus = 0
  if (r.firstClear) bonus += 10
  bonus += r.stars * 2
  if (r.perfect) bonus += 5
  return { base, bonus }
}

/* ------------------------- skins ------------------------------- */

export const SKINS: readonly SkinDef[] = [
  { id: 'azure', name: 'Azure', color: '#2f8bff', pattern: 'solid', material: 'glossy', cost: 0 },
  { id: 'sunset', name: 'Sunset', color: '#ff7a3d', color2: '#ffd23d', pattern: 'stripes', material: 'glossy', cost: 40 },
  { id: 'mint', name: 'Mint Chip', color: '#3dffb0', color2: '#0b6b52', pattern: 'dots', material: 'glossy', cost: 60 },
  { id: 'checker', name: 'Checker', color: '#f2f5ff', color2: '#1b2250', pattern: 'checker', material: 'glossy', cost: 90 },
  { id: 'chrome', name: 'Chrome', color: '#cfd8ea', pattern: 'solid', material: 'metal', cost: 140 },
  { id: 'rose', name: 'Rose Gold', color: '#f0a08a', color2: '#ffe0d2', pattern: 'rings', material: 'metal', cost: 180 },
  { id: 'neon', name: 'Neon Pulse', color: '#ff3df0', color2: '#3df3ff', pattern: 'rings', material: 'neon', cost: 240 },
  { id: 'crystal', name: 'Crystal', color: '#a8e6ff', pattern: 'solid', material: 'glass', cost: 0, unlockedBy: 'perfectionist' },
  { id: 'gold', name: 'Champion Gold', color: '#ffc83d', color2: '#fff0a8', pattern: 'stripes', material: 'metal', cost: 0, unlockedBy: 'allStars' },
]

export const getSkin = (id: string): SkinDef => SKINS.find(s => s.id === id) ?? SKINS[0]

/* ----------------------- achievements -------------------------- */

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstRoll', name: 'First Roll', description: 'Finish any level.', gems: 5 },
  { id: 'gemCollector', name: 'Gem Collector', description: 'Collect 100 gems in total.', gems: 15 },
  { id: 'loopMaster', name: 'Loop Master', description: 'Clear The Big Loop.', gems: 10 },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Finish a level without falling and with every gem.', gems: 20 },
  { id: 'threeStars', name: 'Triple Threat', description: 'Earn 3 stars on any level.', gems: 10 },
  { id: 'adventurer', name: 'Adventurer', description: 'Complete all adventure levels.', gems: 40 },
  { id: 'allStars', name: 'Star Collector', description: 'Earn 3 stars on every level.', gems: 80 },
  { id: 'speedster', name: 'Speedster', description: 'Beat the par time on 5 different levels.', gems: 20 },
  { id: 'endless500', name: 'Endless Runner', description: 'Reach 500 m in Endless Loop.', gems: 20 },
  { id: 'endless1500', name: 'Marathon Roller', description: 'Reach 1,500 m in Endless Loop.', gems: 40 },
  { id: 'dailyPlayer', name: 'Daily Roller', description: 'Finish a daily challenge.', gems: 10 },
  { id: 'fashion', name: 'Fashionista', description: 'Unlock a new ball skin.', gems: 5 },
]

/** The slice of persistent progress that achievements are derived from. */
export interface AchievementProgress {
  completed: Record<string, { stars: number; bestTime: number | null; bestGems: number; parBeaten?: boolean }>
  totalGemsCollected: number
  bestDistance: number
  dailiesFinished: number
  unlockedSkins: string[]
  levelIds: readonly string[]
}

/** Returns achievements that are earned according to the progress + this run, minus ones already owned. */
export function evaluateAchievements(
  owned: readonly string[], p: AchievementProgress, run?: Pick<RunResult, 'victory' | 'falls' | 'gems' | 'totalGems' | 'mode' | 'levelId' | 'distance'>,
): string[] {
  const have = new Set(owned)
  const out: string[] = []
  const grant = (id: string, cond: boolean) => { if (cond && !have.has(id)) out.push(id) }
  const done = Object.keys(p.completed)
  grant('firstRoll', done.length > 0)
  grant('gemCollector', p.totalGemsCollected >= 100)
  grant('loopMaster', !!p.completed['the-big-loop'])
  grant('perfectionist', !!run && run.victory && run.mode !== 'endless' && run.falls === 0 && run.totalGems > 0 && run.gems >= run.totalGems)
  grant('threeStars', done.some(id => p.completed[id].stars >= 3))
  grant('adventurer', p.levelIds.length > 0 && p.levelIds.every(id => !!p.completed[id]))
  grant('allStars', p.levelIds.length > 0 && p.levelIds.every(id => (p.completed[id]?.stars ?? 0) >= 3))
  grant('speedster', done.filter(id => p.completed[id].stars >= 2).length >= 5)
  grant('endless500', p.bestDistance >= 500)
  grant('endless1500', p.bestDistance >= 1500)
  grant('dailyPlayer', p.dailiesFinished > 0)
  grant('fashion', p.unlockedSkins.length > 1)
  return out
}

/* ------------------- persistent progress model ------------------ */

export interface LevelRecord {
  stars: number
  bestTime: number | null
  bestGems: number
  bestFalls: number | null
  parBeaten?: boolean
}

export interface Progress {
  version: 1
  completed: Record<string, LevelRecord>
  gems: number
  totalGemsCollected: number
  bestDistance: number
  dailiesFinished: number
  /** date -> best result for that daily (time for level dailies, distance for endless). */
  dailyBests: Record<string, { time: number | null; distance: number }>
  unlockedSkins: string[]
  selectedSkin: string
  achievements: string[]
  totalFalls: number
  totalRuns: number
}

export const DEFAULT_PROGRESS: Progress = {
  version: 1,
  completed: {},
  gems: 0,
  totalGemsCollected: 0,
  bestDistance: 0,
  dailiesFinished: 0,
  dailyBests: {},
  unlockedSkins: ['azure'],
  selectedSkin: 'azure',
  achievements: [],
  totalFalls: 0,
  totalRuns: 0,
}

export interface RunSummary {
  mode: RunResult['mode']
  levelId: string | null
  /** For daily runs, the date string; used for daily bests. */
  date?: string
  victory: boolean
  time: number
  gems: number
  totalGems: number
  falls: number
  stars: number
  distance: number
  levelIds: readonly string[]
}

export interface ApplyOutcome {
  progress: Progress
  newRecord: boolean
  firstClear: boolean
  perfect: boolean
  gemsEarned: number
  bonusGems: number
  newBestDistance: boolean
  newAchievements: string[]
}

/** Pure reducer: fold a finished run into persistent progress. */
export function applyRunToProgress(prev: Progress, run: RunSummary): ApplyOutcome {
  const p: Progress = {
    ...prev,
    completed: { ...prev.completed },
    dailyBests: { ...prev.dailyBests },
    achievements: [...prev.achievements],
    unlockedSkins: [...prev.unlockedSkins],
  }
  p.totalRuns += 1
  p.totalFalls += run.falls
  let newRecord = false
  let firstClear = false
  let newBestDistance = false
  const perfect = run.victory && run.falls === 0 && run.mode !== 'endless'
  let base = 0
  let bonus = 0

  if (run.mode === 'endless') {
    base = Math.floor(run.distance / 25) + run.gems
    if (run.distance > p.bestDistance) {
      p.bestDistance = Math.floor(run.distance)
      newBestDistance = true
    }
    if (run.date) {
      const cur = p.dailyBests[run.date]
      if (!cur || run.distance > cur.distance) p.dailyBests[run.date] = { time: null, distance: Math.floor(run.distance) }
    }
  } else if (run.victory && run.levelId) {
    const prevRec = p.completed[run.levelId]
    firstClear = !prevRec
    const par = run.stars >= 2
    const rec: LevelRecord = prevRec
      ? { ...prevRec }
      : { stars: 0, bestTime: null, bestGems: 0, bestFalls: null }
    if (rec.bestTime === null || run.time < rec.bestTime) {
      rec.bestTime = run.time
      newRecord = true
    }
    rec.stars = Math.max(rec.stars, run.stars)
    rec.bestGems = Math.max(rec.bestGems, run.gems)
    rec.bestFalls = rec.bestFalls === null ? run.falls : Math.min(rec.bestFalls, run.falls)
    rec.parBeaten = !!rec.parBeaten || par
    p.completed[run.levelId] = rec
    const reward = gemReward({ gems: run.gems, stars: run.stars, perfect, firstClear })
    base = reward.base
    bonus = reward.bonus
    if (run.mode === 'daily') {
      p.dailiesFinished += 1
      if (run.date) {
        const cur = p.dailyBests[run.date]
        if (!cur || cur.time === null || run.time < cur.time) p.dailyBests[run.date] = { time: run.time, distance: 0 }
      }
    }
  } else {
    // A failed non-endless run still banks gems collected so far, without bonuses.
    base = 0
  }

  p.totalGemsCollected += run.gems
  const earnedNow = base + bonus
  p.gems += earnedNow

  const newAchievements = evaluateAchievements(
    p.achievements,
    {
      completed: p.completed,
      totalGemsCollected: p.totalGemsCollected,
      bestDistance: p.bestDistance,
      dailiesFinished: p.dailiesFinished,
      unlockedSkins: p.unlockedSkins,
      levelIds: run.levelIds,
    },
    { victory: run.victory, falls: run.falls, gems: run.gems, totalGems: run.totalGems, mode: run.mode, levelId: run.levelId, distance: run.distance },
  )
  for (const id of newAchievements) {
    p.achievements.push(id)
    const a = ACHIEVEMENTS.find(x => x.id === id)
    if (a) p.gems += a.gems
    if (id === 'perfectionist' && !p.unlockedSkins.includes('crystal')) p.unlockedSkins.push('crystal')
    if (id === 'allStars' && !p.unlockedSkins.includes('gold')) p.unlockedSkins.push('gold')
  }
  return { progress: p, newRecord, firstClear, perfect, gemsEarned: base, bonusGems: bonus, newBestDistance, newAchievements }
}

export type BuySkinResult = { ok: true; progress: Progress } | { ok: false; reason: 'owned' | 'poor' | 'locked' | 'unknown' }

export function buySkin(prev: Progress, skinId: string): BuySkinResult {
  const skin = SKINS.find(s => s.id === skinId)
  if (!skin) return { ok: false, reason: 'unknown' }
  if (prev.unlockedSkins.includes(skinId)) return { ok: false, reason: 'owned' }
  if (skin.unlockedBy) return { ok: false, reason: 'locked' }
  if (prev.gems < skin.cost) return { ok: false, reason: 'poor' }
  const p: Progress = { ...prev, gems: prev.gems - skin.cost, unlockedSkins: [...prev.unlockedSkins, skinId] }
  const fashion = evaluateAchievements(
    p.achievements,
    { completed: p.completed, totalGemsCollected: p.totalGemsCollected, bestDistance: p.bestDistance, dailiesFinished: p.dailiesFinished, unlockedSkins: p.unlockedSkins, levelIds: [] },
  )
  if (fashion.includes('fashion')) {
    p.achievements = [...p.achievements, 'fashion']
    p.gems += ACHIEVEMENTS.find(a => a.id === 'fashion')?.gems ?? 0
  }
  return { ok: true, progress: p }
}
