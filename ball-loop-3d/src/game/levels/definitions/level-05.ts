import type { LevelDefinition } from '../levelTypes'

export const level05: LevelDefinition = {
  id: 'moving-world',
  name: 'Moving World',
  subtitle: 'Ride the moving platforms',
  difficulty: 3,
  objective: 'Board each platform, brake to stay on, and step off when it reaches the other side.',
  tip: 'Slow down on platforms: tap back (S) to stay aboard, then roll off when you reach the far side.',
  parTime: 62,
  challenge: 'noFalls',
  segments: [
    { t: 'start', length: 14 },
    { t: 'straight', length: 10, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'platform', axis: 'forward', gap: 18, size: [6, 5], period: 7 },
    { t: 'straight', length: 12, features: [{ k: 'checkpoint', at: 0.4 }, { k: 'gems', from: 0.3, to: 0.8, count: 3 }] },
    { t: 'platform', axis: 'vertical', rise: 6, size: [6, 5], period: 8 },
    { t: 'straight', length: 14, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 3 }] },
    { t: 'platform', axis: 'forward', gap: 24, size: [5, 5], period: 9, phase: 0.3 },
    { t: 'straight', length: 12, features: [{ k: 'checkpoint', at: 0.4 }] },
    { t: 'curve', angle: 90, radius: 12, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'platform', axis: 'vertical', rise: -5, size: [6, 5], period: 8, phase: 0.5 },
    { t: 'straight', length: 14, features: [{ k: 'gems', from: 0.2, to: 0.8, count: 3 }] },
    { t: 'platform', axis: 'forward', gap: 20, size: [6, 5], period: 8 },
    { t: 'finish' },
  ],
}
