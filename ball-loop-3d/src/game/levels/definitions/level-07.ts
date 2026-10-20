import type { LevelDefinition } from '../levelTypes'

export const level07: LevelDefinition = {
  id: 'pendulum-run',
  name: 'Pendulum Run',
  subtitle: 'Dodge the swinging hammers',
  difficulty: 4,
  objective: 'Slip past the hammers and sweepers. Wait for the swing to clear the lane.',
  tip: 'Hammers are red. Watch the swing, wait for it to pass the edge, then roll through.',
  parTime: 60,
  challenge: 'noFalls',
  segments: [
    { t: 'start', length: 14 },
    { t: 'straight', length: 12, width: 7, features: [{ k: 'gem', at: 0.5 }] },
    {
      t: 'straight', length: 20, width: 7,
      features: [{ k: 'pendulum', at: 0.5, period: 3.6, amplitude: 0.85 }, { k: 'gems', from: 0.1, to: 0.35, count: 2, lat: 2.2 }],
    },
    { t: 'straight', length: 12, width: 7, features: [{ k: 'checkpoint', at: 0.4 }] },
    {
      t: 'straight', length: 34, width: 7,
      features: [
        { k: 'pendulum', at: 0.3, period: 3.4, amplitude: 0.85 },
        { k: 'pendulum', at: 0.7, period: 3.4, amplitude: 0.85, phase: 2.2 },
        { k: 'gem', at: 0.5, lat: -2.4 },
      ],
    },
    { t: 'curve', angle: 90, radius: 14, width: 7 },
    { t: 'straight', length: 12, width: 7, features: [{ k: 'checkpoint', at: 0.3 }] },
    {
      t: 'straight', length: 24, width: 7,
      features: [{ k: 'beam', at: 0.5, speed: 1.35 }, { k: 'gems', from: 0.15, to: 0.3, count: 2, lat: 2.4 }],
    },
    { t: 'straight', length: 10, width: 7 },
    {
      t: 'straight', length: 36, width: 7,
      features: [
        { k: 'pendulum', at: 0.2, period: 3.2, amplitude: 0.9 },
        { k: 'beam', at: 0.55, speed: -1.5 },
        { k: 'pendulum', at: 0.88, period: 3.2, amplitude: 0.9, phase: 1.6 },
      ],
    },
    { t: 'straight', length: 8, width: 7, features: [{ k: 'gem', at: 0.5 }] },
    { t: 'finish' },
  ],
}
