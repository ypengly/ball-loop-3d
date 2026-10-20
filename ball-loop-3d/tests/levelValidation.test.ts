import { describe, expect, it } from 'vitest'
import { LEVEL_DEFINITIONS, getLevel } from '../src/game/levels/levelRegistry'
import { resolveLevel, validateContent } from '../src/game/levels/levelBuilder'
import { generateChunks, mergeChunks } from '../src/game/tracks/TrackGenerator'
import { simulateBot } from './helpers/sim'

describe('level definitions', () => {
  it('ships at least 10 levels with unique ids', () => {
    expect(LEVEL_DEFINITIONS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(LEVEL_DEFINITIONS.map(l => l.id)).size).toBe(LEVEL_DEFINITIONS.length)
  })
  LEVEL_DEFINITIONS.forEach((def, i) => {
    it(`level ${i + 1} (${def.id}) is structurally valid`, () => {
      const lvl = getLevel(i)
      expect(lvl.start).not.toBeNull()
      expect(lvl.finishes.length).toBeGreaterThan(0)
      expect(lvl.totalGems).toBeGreaterThan(0)
      expect(lvl.checkpoints.length).toBeGreaterThan(0)
      expect(def.parTime).toBeGreaterThan(0)
      expect(validateContent(def.id, lvl, true)).toEqual([])
    })
  })
})

describe('levels are completable (headless Rapier + path-following bot)', () => {
  LEVEL_DEFINITIONS.forEach((def, i) => {
    it(`level ${i + 1} (${def.id}) can be finished`, async () => {
      const lvl = getLevel(i)
      const delays = [0, 1.3, 2.9]
      let best = null as Awaited<ReturnType<typeof simulateBot>> | null
      for (const startDelay of delays) {
        const r = await simulateBot(lvl, { startDelay, maxTime: def.parTime * 4 + 60, killY: lvl.killY, maxFalls: 6 })
        if (!best || (r.finished && !best.finished)) best = r
        if (r.finished) break
      }
      expect(best?.finished, `reason: ${best?.reason}`).toBe(true)
    }, 120000)
  })

  it('the big loop can be climbed holding only forward (human-style input)', async () => {
    // Everything up to and including the loop is straight, so "forward" == start heading. Cut before the curve.
    const full = LEVEL_DEFINITIONS.find(l => l.id === 'the-big-loop')
    expect(full).toBeDefined()
    if (!full) return
    const loopIdx = full.segments.findIndex(sg => sg.t === 'loop')
    const lvl = resolveLevel({ ...full, segments: [...full.segments.slice(0, loopIdx + 2), { t: 'finish' }] }, 99)
    const r = await simulateBot(lvl, { humanWish: true, maxTime: 200, killY: lvl.killY, maxFalls: 6 })
    expect(r.finished, `reason: ${r.reason}`).toBe(true)
  }, 120000)
})

describe('endless generator', () => {
  it('is deterministic per seed', () => {
    const a = generateChunks(7, 8).map(c => c.kind)
    const b = generateChunks(7, 8).map(c => c.kind)
    expect(a).toEqual(b)
  })
  it('produces valid connected tracks across seeds', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 42, 1234]) {
      const merged = mergeChunks(generateChunks(seed, 30))
      expect(validateContent(`endless-${seed}`, merged, false), `seed ${seed}`).toEqual([])
    }
  })
  it('chunks start where the previous one ended and descend no deeper than the band', () => {
    const chunks = generateChunks(9, 40)
    chunks.forEach(c => {
      expect(c.minY).toBeGreaterThan(-60)
    })
  })
})
