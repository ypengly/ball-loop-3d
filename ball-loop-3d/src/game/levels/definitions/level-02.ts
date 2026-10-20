import type { LevelDefinition } from '../levelTypes'

export const level02: LevelDefinition = {
  id: 'narrow-path',
  name: 'Narrow Path',
  subtitle: 'Balance and precision',
  difficulty: 2,
  objective: 'Keep the ball on the narrow track. Falling resets you to the last checkpoint.',
  tip: 'Ease off the throttle on thin sections. Small, early corrections beat big late ones.',
  parTime: 34,
  challenge: 'noFalls',
  segments: [
    { t: 'start', length: 12 },
    { t: 'straight', length: 20, width: 3.6, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 4 }] },
    { t: 'curve', angle: -60, radius: 16, width: 3.4, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'straight', length: 16, width: 3.2, features: [{ k: 'gem', at: 0.3, lat: 1.0 }, { k: 'gem', at: 0.7, lat: -1.0 }] },
    { t: 'bridge', length: 28, width: 2.4, features: [{ k: 'checkpoint', at: 0.08 }, { k: 'gems', from: 0.3, to: 0.9, count: 5 }] },
    { t: 'curve', angle: 75, radius: 15, width: 3.2, features: [{ k: 'gems', from: 0.3, to: 0.7, count: 2 }] },
    { t: 'straight', length: 14, width: 2.8 },
    { t: 'ramp', length: 12, rise: 3, width: 3.2, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'straight', length: 14, width: 3.2, features: [{ k: 'checkpoint', at: 0.1 }] },
    { t: 'curve', angle: -75, radius: 13, width: 3.2, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'bridge', length: 22, width: 2.2, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 4 }] },
    { t: 'finish' },
  ],
}
