import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { BallController } from './player/BallController'
import { rollingAngvel } from './player/BallPhysics'
import { readMove, resetInput } from './player/PlayerInput'
import { applyBoostToVelocity } from './systems/CollisionSystem'
import { RunLogic } from './systems/RunLogic'
import { AudioManager } from './systems/AudioManager'
import { cameraState, runtime } from './systems/runtime'
import { runObstacleTicks, clearObstacleTicks } from './obstacles/registry'
import { fx } from './effects/fx'
import { useGame } from '../store/gameStore'
import { dist, dot, sub, yawForward, yawRight, type V3 } from './utils/math'
import type { LevelContent } from './levels/levelTypes'

export interface EndlessApi {
  /** Ensure the course is generated far enough ahead of `distance`; prunes chunks far behind. */
  ensure: (distance: number) => void
  /** Fall boundary near the given route distance. */
  killYFor: (distance: number) => number
}

interface Props {
  bodyRef: RefObject<RapierRigidBody | null>
  logicRef: MutableRefObject<RunLogic>
  totalLength: number
  endless: EndlessApi | null
}

const RESPAWN_DELAY = 0.9
const CONFETTI = ['#ffc83d', '#ff4fd8', '#2fd8ff', '#35ff9a', '#ffffff']

function nearestPathIndex(content: LevelContent, pos: V3, targetD?: number): number {
  let best = 0
  let bd = Infinity
  content.path.forEach((s, i) => {
    const d = targetD !== undefined ? Math.abs(s.d - targetD) : dist(s.p, pos)
    if (d < bd) { bd = d; best = i }
  })
  return best
}

/**
 * Runs the game once per FIXED physics step: reads input, drives the ball, evaluates triggers and handles
 * respawn / finish / game over. Per-frame work (audio, camera) lives elsewhere.
 */
export function RunDriver({ bodyRef, logicRef, totalLength, endless }: Props) {
  const { rapier } = useRapier()
  const ctrl = useRef<BallController | null>(null)
  const pathIdx = useRef(0)
  const lastContent = useRef<LevelContent | null>(null)
  const boostCooldown = useRef(0)
  const finished = useRef(false)

  useEffect(() => {
    clearObstacleTicks()
    resetInput()
    cameraState.snap = true
    const start = logicRef.current.content.start
    cameraState.yaw = start ? start.yaw : 0
    cameraState.pitch = 0.42
    finished.current = false
    return () => {
      clearObstacleTicks()
      resetInput()
      AudioManager.stopRoll()
    }
  }, [logicRef])

  useBeforePhysicsStep(world => {
    const body = bodyRef.current
    if (!body) return
    const game = useGame.getState()
    if (game.phase !== 'Playing' && game.phase !== 'Respawning') return
    if (finished.current) return
    const dt = world.timestep
    const logic = logicRef.current
    if (!ctrl.current) ctrl.current = new BallController(rapier, world, body)

    runtime.simTime += dt
    runObstacleTicks(runtime.simTime, dt)

    const t = body.translation()
    const lv = body.linvel()
    const pos: V3 = [t.x, t.y, t.z]
    const vel: V3 = [lv.x, lv.y, lv.z]
    runtime.ballPos = pos
    runtime.ballVel = vel
    runtime.speed = Math.hypot(vel[0], vel[1], vel[2])

    // Route progress (also drives endless generation and the fall boundary).
    if (lastContent.current !== logic.content) {
      pathIdx.current = nearestPathIndex(logic.content, pos, runtime.distance)
      lastContent.current = logic.content
    }
    const path = logic.content.path
    pathIdx.current = logic.progressIndex(pos, pathIdx.current)
    if (path.length) {
      // Never move the distance backwards (falling back to a checkpoint should not erase progress on the HUD).
      runtime.distance = Math.max(runtime.distance, path[pathIdx.current].d)
      runtime.progress = totalLength > 0 ? Math.min(1, runtime.distance / totalLength) : 0
    }
    if (endless) {
      endless.ensure(runtime.distance)
      logic.killY = endless.killYFor(path[pathIdx.current]?.d ?? runtime.distance)
    }

    if (game.phase === 'Respawning') {
      runtime.respawnLeft -= dt
      logic.step(runtime.simTime, dt, pos, vel, false)
      if (runtime.elapsed > 0 || runtime.started) runtime.elapsed += dt
      if (runtime.respawnLeft <= 0) {
        const r = logic.respawn
        body.setTranslation({ x: r.pos[0], y: r.pos[1], z: r.pos[2] }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        ctrl.current.reset()
        logic.resetTiles()
        cameraState.yaw = r.yaw
        cameraState.snap = true
        pathIdx.current = nearestPathIndex(logic.content, r.pos)
        runtime.ballPos = r.pos
        runtime.ballVel = [0, 0, 0]
        game.endRespawn()
      }
      return
    }

    // ----- Playing -----
    const mv = readMove()
    if (!runtime.started && (mv.x !== 0 || mv.y !== 0 || mv.jump)) runtime.started = true
    if (runtime.started) runtime.elapsed += dt

    const fwd = yawForward(cameraState.yaw)
    const right = yawRight(cameraState.yaw)
    const wish: V3 = [right[0] * mv.x + fwd[0] * mv.y, 0, right[2] * mv.x + fwd[2] * mv.y]

    // Slow zones are evaluated first from last step's events (see below) via logic.step; use a cheap pre-check.
    const ev = logic.step(runtime.simTime, dt, pos, vel, true)
    const res = ctrl.current.step(dt, { wish, jumpPressed: mv.jump }, { speedScale: ev.slowFactor, drag: ev.slowFactor < 1 ? 2.5 : 0 })
    runtime.grounded = res.grounded

    if (res.jumped) {
      AudioManager.play('jump', { rate: 0.95 + Math.random() * 0.1 })
      fx.burst({ pos: [pos[0], pos[1] - 0.4, pos[2]], color: '#ffffff', count: 6, speed: 1.6, life: 0.4, gravity: 3 })
    }
    if (res.landed > 5) {
      AudioManager.play('land', { volume: Math.min(1, res.landed / 14) })
      fx.burst({ pos: [pos[0], pos[1] - 0.4, pos[2]], color: ['#ffffff', '#cfe0ff'], count: Math.min(16, 4 + Math.floor(res.landed)), speed: 2.2, life: 0.5, gravity: 4 })
      runtime.shake = Math.max(runtime.shake, Math.min(0.35, res.landed / 40))
    }

    boostCooldown.current = Math.max(0, boostCooldown.current - dt)
    for (const b of ev.boosts) {
      const cur = body.linvel()
      const nv = applyBoostToVelocity([cur.x, cur.y, cur.z], b.dir, b.strength)
      body.setLinvel({ x: nv[0], y: nv[1], z: nv[2] }, true)
      const w = rollingAngvel(nv, res.grounded ? res.normal : [0, 1, 0])
      body.setAngvel({ x: w[0], y: w[1], z: w[2] }, true)
      if (boostCooldown.current <= 0) {
        boostCooldown.current = 0.7
        AudioManager.play('boost')
        runtime.boostFlash = 1
        runtime.shake = Math.max(runtime.shake, 0.3)
        fx.burst({ pos, color: ['#35ff9a', '#b8ffe0'], count: 22, speed: 5, life: 0.5, gravity: 1 })
      }
    }

    for (const id of ev.gems) {
      const g = logic.content.gems.find(x => x.id === id)
      game.addGem()
      AudioManager.play('gem', { rate: 1 + Math.min(0.6, runtime.gems * 0.03) })
      if (g) fx.burst({ pos: g.pos, color: ['#ffc83d', '#fff3b0', '#ff9d00'], count: 14, speed: 3.2, life: 0.55, gravity: 3 })
    }

    if (ev.checkpoint) {
      game.setCheckpoint(logic.respawn.index)
      game.pushToast('Checkpoint')
      AudioManager.play('checkpoint')
      fx.burst({ pos: [ev.checkpoint.pos[0], ev.checkpoint.pos[1] + 1.5, ev.checkpoint.pos[2]], color: ['#2fd8ff', '#35ff9a'], count: 28, speed: 4.5, life: 0.8, gravity: 1, up: 2 })
    }

    // Contextual hint: a gap edge just ahead.
    let hint = ''
    if (res.grounded) {
      for (const m of logic.content.jumpMarks) {
        const d = sub(m.pos, pos)
        if (Math.hypot(d[0], d[2]) < 9 && dot(d, m.dir) > -0.5 && Math.abs(d[1]) < 2.5) { hint = 'jump'; break }
      }
    }
    runtime.hint = hint

    if (ev.finished) {
      finished.current = true
      AudioManager.play('finish')
      AudioManager.stopRoll()
      fx.burst({ pos: [pos[0], pos[1] + 1.5, pos[2]], color: CONFETTI, count: 90, speed: 8, life: 1.4, gravity: 7, up: 7 })
      game.completeLevel()
      return
    }

    if (ev.fell) {
      AudioManager.stopRoll()
      if (!logic.content.finishes.length && endless) {
        AudioManager.play('gameover')
        game.gameOver()
      } else {
        AudioManager.play('fall')
        runtime.respawnLeft = RESPAWN_DELAY
        game.beginRespawn()
      }
    }
  })

  useFrame(() => {
    const phase = useGame.getState().phase
    if (phase === 'Playing') AudioManager.setRoll(runtime.speed, runtime.grounded)
    else AudioManager.stopRoll()
    runtime.boostFlash = Math.max(0, runtime.boostFlash - 0.03)
  })

  return null
}
