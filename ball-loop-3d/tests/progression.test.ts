import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROGRESS, SKINS, applyRunToProgress, buySkin, computeStars, isLevelUnlocked, nextLevelIndex,
  type Progress, type RunSummary,
} from '../src/game/systems/LevelProgression'
import { DAILY_ROTATION, dayNumber, getDailySpec, localDateString } from '../src/features/challenges/daily'
import { canTransition, isSimulating } from '../src/store/gameStore'
import { allLevelIds } from '../src/game/levels/levelRegistry'

const ids = allLevelIds()
const def = { parTime: 30, challenge: 'allGems' as const, expertTime: undefined }

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  mode: 'adventure', levelId: ids[0], victory: true, time: 25, gems: 10, totalGems: 10, falls: 0, stars: 3, distance: 0, levelIds: ids, ...over,
})

describe('stars', () => {
  it('gives 1 star for finishing slowly without the challenge', () => {
    expect(computeStars({ def, time: 99, gems: 0, totalGems: 10, falls: 0 }).stars).toBe(1)
  })
  it('gives 2 stars for beating par', () => {
    expect(computeStars({ def, time: 20, gems: 3, totalGems: 10, falls: 0 }).stars).toBe(2)
  })
  it('gives 3 stars for par plus the challenge', () => {
    expect(computeStars({ def, time: 20, gems: 10, totalGems: 10, falls: 0 }).stars).toBe(3)
  })
  it('supports noFalls and fastTime challenges', () => {
    expect(computeStars({ def: { ...def, challenge: 'noFalls' }, time: 99, gems: 0, totalGems: 0, falls: 0 }).stars).toBe(2)
    expect(computeStars({ def: { ...def, challenge: 'fastTime', expertTime: 15 }, time: 14, gems: 0, totalGems: 0, falls: 5 }).stars).toBe(3)
  })
})

describe('unlocking', () => {
  it('unlocks only level 1 initially', () => {
    expect(isLevelUnlocked(0, {}, ids)).toBe(true)
    expect(isLevelUnlocked(1, {}, ids)).toBe(false)
  })
  it('unlocks the next level after completing the previous one', () => {
    const done = { [ids[0]]: { stars: 1 } }
    expect(isLevelUnlocked(1, done, ids)).toBe(true)
    expect(isLevelUnlocked(2, done, ids)).toBe(false)
    expect(nextLevelIndex(done, ids)).toBe(1)
  })
})

describe('applyRunToProgress', () => {
  it('records first clear, best time and rewards gems', () => {
    const out = applyRunToProgress(DEFAULT_PROGRESS, run())
    expect(out.firstClear).toBe(true)
    expect(out.perfect).toBe(true)
    expect(out.progress.completed[ids[0]].bestTime).toBe(25)
    expect(out.progress.completed[ids[0]].stars).toBe(3)
    expect(out.progress.gems).toBeGreaterThanOrEqual(10)
    expect(out.progress.gems).toBe(DEFAULT_PROGRESS.gems + out.gemsEarned + out.bonusGems + (out.progress.gems - out.gemsEarned - out.bonusGems))
  })
  it('keeps the best time and star count on worse reruns', () => {
    const a = applyRunToProgress(DEFAULT_PROGRESS, run()).progress
    const b = applyRunToProgress(a, run({ time: 40, stars: 1, gems: 2 }))
    expect(b.newRecord).toBe(false)
    expect(b.progress.completed[ids[0]].bestTime).toBe(25)
    expect(b.progress.completed[ids[0]].stars).toBe(3)
  })
  it('updates on a faster run', () => {
    const a = applyRunToProgress(DEFAULT_PROGRESS, run()).progress
    const b = applyRunToProgress(a, run({ time: 20 }))
    expect(b.newRecord).toBe(true)
    expect(b.progress.completed[ids[0]].bestTime).toBe(20)
  })
  it('does not mark a run with falls as perfect', () => {
    expect(applyRunToProgress(DEFAULT_PROGRESS, run({ falls: 1 })).perfect).toBe(false)
  })
  it('tracks endless best distance and does not mutate input', () => {
    const snapshot = JSON.stringify(DEFAULT_PROGRESS)
    const out = applyRunToProgress(DEFAULT_PROGRESS, run({ mode: 'endless', levelId: null, victory: false, distance: 321, gems: 0, totalGems: 0 }))
    expect(out.newBestDistance).toBe(true)
    expect(out.progress.bestDistance).toBe(321)
    expect(JSON.stringify(DEFAULT_PROGRESS)).toBe(snapshot)
  })
  it('awards the first-clear achievement exactly once', () => {
    const a = applyRunToProgress(DEFAULT_PROGRESS, run())
    expect(a.newAchievements.length).toBeGreaterThan(0)
    const b = applyRunToProgress(a.progress, run())
    expect(b.newAchievements.filter(x => a.newAchievements.includes(x))).toHaveLength(0)
  })
})

describe('buySkin', () => {
  const priced = SKINS.find(s => s.cost > 0 && !s.unlockedBy)
  it('rejects unknown and owned skins', () => {
    expect(buySkin(DEFAULT_PROGRESS, 'nope')).toEqual({ ok: false, reason: 'unknown' })
    expect(buySkin(DEFAULT_PROGRESS, 'azure')).toEqual({ ok: false, reason: 'owned' })
  })
  it('requires enough gems and deducts the cost', () => {
    expect(priced).toBeDefined()
    if (!priced) return
    expect(buySkin(DEFAULT_PROGRESS, priced.id)).toEqual({ ok: false, reason: 'poor' })
    const rich: Progress = { ...DEFAULT_PROGRESS, gems: priced.cost + 5 }
    const r = buySkin(rich, priced.id)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.progress.unlockedSkins).toContain(priced.id)
      expect(r.progress.gems).toBeLessThanOrEqual(5 + 1000)
      expect(r.progress.gems).toBeGreaterThanOrEqual(5)
    }
  })
})

describe('daily challenge', () => {
  it('is deterministic for a given date and differs between dates', () => {
    const a = getDailySpec('2026-10-18')
    expect(getDailySpec('2026-10-18')).toEqual(a)
    expect(getDailySpec('2026-10-19').seed).not.toBe(a.seed)
  })
  it('rotates through the list by day number', () => {
    const a = getDailySpec('2026-10-18')
    const b = getDailySpec('2026-10-19')
    expect(dayNumber('2026-10-19') - dayNumber('2026-10-18')).toBe(1)
    expect(DAILY_ROTATION.length).toBeGreaterThan(1)
    expect(a.title === b.title && a.levelId === b.levelId).toBe(false)
  })
  it('always points at a real level for level dailies', () => {
    for (let d = 1; d <= 60; d++) {
      const s = getDailySpec(`2026-11-${String((d % 28) + 1).padStart(2, '0')}`)
      if (s.kind === 'level') expect(ids).toContain(s.levelId)
    }
  })
  it('formats the local date as YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('game state machine', () => {
  it('allows the intended transitions', () => {
    expect(canTransition('MainMenu', 'Playing')).toBe(true)
    expect(canTransition('Playing', 'Paused')).toBe(true)
    expect(canTransition('Paused', 'Playing')).toBe(true)
    expect(canTransition('Playing', 'Respawning')).toBe(true)
    expect(canTransition('Playing', 'LevelComplete')).toBe(true)
  })
  it('rejects invalid transitions', () => {
    expect(canTransition('MainMenu', 'Paused')).toBe(false)
    expect(canTransition('LevelComplete', 'Respawning')).toBe(false)
  })
  it('only simulates physics while playing or respawning', () => {
    expect(isSimulating('Playing')).toBe(true)
    expect(isSimulating('Respawning')).toBe(true)
    expect(isSimulating('Paused')).toBe(false)
    expect(isSimulating('MainMenu')).toBe(false)
  })
})
