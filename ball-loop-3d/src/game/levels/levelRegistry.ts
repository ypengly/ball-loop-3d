import type { LevelDefinition, ResolvedLevel } from './levelTypes'
import { resolveLevel } from './levelBuilder'
import { level01 } from './definitions/level-01'
import { level02 } from './definitions/level-02'
import { level03 } from './definitions/level-03'
import { level04 } from './definitions/level-04'
import { level05 } from './definitions/level-05'
import { level06 } from './definitions/level-06'
import { level07 } from './definitions/level-07'
import { level08 } from './definitions/level-08'
import { level09 } from './definitions/level-09'
import { level10 } from './definitions/level-10'

/** Add new levels here. Order = adventure order. */
export const LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  level01, level02, level03, level04, level05, level06, level07, level08, level09, level10,
]

const cache = new Map<string, ResolvedLevel>()

export const levelCount = (): number => LEVEL_DEFINITIONS.length

export function getLevelIndex(id: string): number {
  return LEVEL_DEFINITIONS.findIndex(l => l.id === id)
}

/** Resolve (and memoise) a level's geometry. */
export function getLevel(idOrIndex: string | number): ResolvedLevel {
  const index = typeof idOrIndex === 'number' ? idOrIndex : getLevelIndex(idOrIndex)
  const def = LEVEL_DEFINITIONS[index]
  if (!def) throw new Error(`Unknown level: ${String(idOrIndex)}`)
  let r = cache.get(def.id)
  if (!r) {
    r = resolveLevel(def, index)
    cache.set(def.id, r)
  }
  return r
}

export const allLevelIds = (): string[] => LEVEL_DEFINITIONS.map(l => l.id)
