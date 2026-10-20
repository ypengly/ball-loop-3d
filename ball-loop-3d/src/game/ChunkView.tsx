import { memo } from 'react'
import type { LevelContent } from './levels/levelTypes'
import { Track } from './tracks/Track'
import { Collectibles } from './objects/Collectible'
import { Checkpoint } from './objects/Checkpoint'
import { BoostPad, SlowZone } from './objects/BoostPad'
import { FinishGate } from './objects/FinishGate'
import { MovingPlatform } from './obstacles/MovingPlatform'
import { RotatingBeam } from './obstacles/RotatingBeam'
import { Pendulum } from './obstacles/Pendulum'
import { FallingPlatform } from './obstacles/FallingPlatform'

/** Renders one block of course content (a whole level, or one endless chunk) with physics colliders. */
export const ChunkView = memo(function ChunkView({ content }: { content: LevelContent }) {
  return (
    <>
      {content.pieces.map(p => <Track key={p.id} piece={p} />)}
      <Collectibles gems={content.gems} />
      {content.checkpoints.map(c => <Checkpoint key={c.id} cp={c} />)}
      {content.boosts.map(b => <BoostPad key={b.id} boost={b} />)}
      {content.slows.map(s => <SlowZone key={s.id} zone={s} />)}
      {content.finishes.map(f => <FinishGate key={f.id} finish={f} />)}
      {content.platforms.map(p => <MovingPlatform key={p.id} platform={p} />)}
      {content.beams.map(b => <RotatingBeam key={b.id} beam={b} />)}
      {content.pendulums.map(p => <Pendulum key={p.id} pendulum={p} />)}
      {content.falling.map(f => <FallingPlatform key={f.id} tile={f} />)}
    </>
  )
})
