import type { LevelDefinition } from '../levelTypes'

export const level04: LevelDefinition = {
  id: 'the-big-loop',
  name: 'The Big Loop',
  subtitle: 'Build speed to ride the loop',
  difficulty: 3,
  objective: 'Hit the boost pad, keep rolling forward and ride the full vertical loop.',
  tip: 'The loop needs real speed. Roll down the long straight and cross the green boost pad without braking.',
  parTime: 36,
  challenge: 'allGems',
  segments: [
    { t: 'start', length: 16 },
    {
      t: 'halfpipe', length: 30, width: 10,
      features: [{ k: 'gems', from: 0.15, to: 0.85, count: 4, lat: 3.8, h: 0.4 }, { k: 'gems', from: 0.15, to: 0.85, count: 4, lat: -3.8, h: 0.4 }],
    },
    {
      t: 'straight', length: 44,
      features: [{ k: 'checkpoint', at: 0.12 }, { k: 'gems', from: 0.3, to: 0.7, count: 3 }, { k: 'boost', at: 0.93, strength: 24 }],
    },
    { t: 'loop', radius: 5, features: [{ k: 'gem', at: 0.5, h: -0.2 }, { k: 'gem', at: 0.25 }, { k: 'gem', at: 0.75 }] },
    { t: 'straight', length: 26, features: [{ k: 'checkpoint', at: 0.1 }, { k: 'gems', from: 0.2, to: 0.8, count: 4 }] },
    { t: 'curve', angle: 90, radius: 14, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'straight', length: 14 },
    { t: 'finish' },
  ],
}
