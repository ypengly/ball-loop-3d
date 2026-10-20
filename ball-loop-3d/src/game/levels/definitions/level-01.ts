import type { LevelDefinition } from '../levelTypes'

export const level01: LevelDefinition = {
  id: 'first-roll',
  name: 'First Roll',
  subtitle: 'Learn to roll and steer',
  difficulty: 1,
  objective: 'Reach the finish gate. Collect every gem for bonus stars.',
  tip: 'Steer with WASD or the arrow keys, drag to look around, and roll through the glowing gems.',
  parTime: 24,
  challenge: 'allGems',
  segments: [
    { t: 'start', length: 14 },
    { t: 'straight', length: 26, features: [{ k: 'gems', from: 0.15, to: 0.85, count: 6 }] },
    { t: 'curve', angle: 90, radius: 14, features: [{ k: 'gems', from: 0.25, to: 0.75, count: 3 }] },
    { t: 'straight', length: 18, features: [{ k: 'checkpoint', at: 0.5 }, { k: 'gem', at: 0.5, lat: 1.8 }] },
    { t: 'curve', angle: -90, radius: 14, features: [{ k: 'gems', from: 0.25, to: 0.75, count: 3 }] },
    {
      t: 'straight', length: 22,
      features: [{ k: 'gem', at: 0.25, lat: -1.6 }, { k: 'gem', at: 0.5, lat: 1.6 }, { k: 'gem', at: 0.75, lat: -1.6 }],
    },
    { t: 'ramp', length: 14, rise: 3, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 3 }] },
    { t: 'straight', length: 18, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 4 }] },
    { t: 'finish' },
  ],
}
