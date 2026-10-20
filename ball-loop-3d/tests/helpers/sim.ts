import RAPIER from '@dimforge/rapier3d-compat'
import { BallController } from '../../src/game/player/BallController'
import { BALL, rollingAngvel } from '../../src/game/player/BallPhysics'
import { buildRibbonGeometry, trimeshBuffers } from '../../src/game/tracks/ribbon'
import { applyBoostToVelocity } from '../../src/game/systems/CollisionSystem'
import { startRespawn, type RespawnPoint } from '../../src/game/systems/CheckpointSystem'
import { RunLogic } from '../../src/game/systems/RunLogic'
import { movingPlatformPose, beamAngle, pendulumPose } from '../../src/game/obstacles/motion'
import { dist, dot, length, normalize, sub, yawForward, type V3 } from '../../src/game/utils/math'
import type { LevelContent } from '../../src/game/levels/levelTypes'

let ready: Promise<void> | null = null
export const initRapier = (): Promise<void> => (ready ??= RAPIER.init())

export interface SimOptions {
  /** Seconds the bot waits before starting (to test timing-based obstacles at different phases). */
  startDelay?: number
  maxTime?: number
  killY: number
  /** Called each step; may override the wish direction / jump (bot customisation). */
  jumpLeadIn?: number
  lookahead?: number
  maxFalls?: number
  speedBias?: number
  /** Emulate a human holding 'forward' (horizontal heading only) instead of following the loop tangent. */
  humanWish?: boolean
  onStep?: (info: { t: number; pos: V3; vel: V3; grounded: boolean; normal: V3 }) => void
}

export interface SimResult {
  finished: boolean
  time: number
  falls: number
  gems: number
  maxSpeed: number
  maxY: number
  checkpoints: number
  reason: string
  /** minimum distance travelled along the path (for debugging) */
  progress: number
}

/** Runs the real BallController + Rapier world headlessly with a simple path-following bot. */
export async function simulateBot(content: LevelContent, opt: SimOptions): Promise<SimResult> {
  await initRapier()
  const dt = 1 / 60
  const world = new RAPIER.World({ x: 0, y: -BALL.gravity, z: 0 })
  world.timestep = dt

  // Static track.
  for (const piece of content.pieces) {
    if (piece.cuboids) {
      for (const c of piece.cuboids) {
        const desc = RAPIER.ColliderDesc.cuboid(c.half[0], c.half[1], c.half[2])
          .setTranslation(c.pos[0], c.pos[1], c.pos[2])
          .setRotation({ x: c.quat[0], y: c.quat[1], z: c.quat[2], w: c.quat[3] })
          .setFriction(1)
        world.createCollider(desc)
      }
    } else {
      const g = buildRibbonGeometry(piece)
      const { vertices, indices } = trimeshBuffers(g)
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(1))
      g.dispose()
    }
  }

  // Moving kinematic bodies.
  const platBodies = content.platforms.map(p => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.a[0], p.a[1], p.a[2]))
    world.createCollider(RAPIER.ColliderDesc.cuboid(p.size[0] / 2, p.size[1] / 2, p.size[2] / 2).setFriction(1.2), body)
    return body
  })
  const beamBodies = content.beams.map(b => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(b.center[0], b.center[1], b.center[2]))
    const armLen = b.length / 2
    world.createCollider(RAPIER.ColliderDesc.cuboid(armLen, 0.28, 0.28), body)
    if (b.arms === 2) world.createCollider(RAPIER.ColliderDesc.cuboid(0.28, 0.28, armLen), body)
    return body
  })
  const pendBodies = content.pendulums.map(p => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.pivot[0], p.pivot[1], p.pivot[2]))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.7, 0.6, 0.8).setTranslation(0, -p.length, 0), body)
    return body
  })
  const fallBodies = content.falling.map(f => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(f.pos[0], f.pos[1], f.pos[2]))
    body.setRotation({ x: 0, y: Math.sin(f.yaw / 2), z: 0, w: Math.cos(f.yaw / 2) }, true)
    const col = world.createCollider(RAPIER.ColliderDesc.cuboid(f.size[0] / 2, f.size[1] / 2, f.size[2] / 2).setFriction(1), body)
    return { body, col }
  })
  const logic = new RunLogic(content, opt.killY)

  const respawn0: RespawnPoint = startRespawn(content)
  let respawn = respawn0
  void respawn
  const startPos = respawn0.pos
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(startPos[0], startPos[1], startPos[2])
      .setLinearDamping(BALL.linearDamping)
      .setAngularDamping(BALL.angularDamping)
      .setCcdEnabled(true),
  )
  const ballCol = world.createCollider(
    RAPIER.ColliderDesc.ball(BALL.radius).setFriction(BALL.friction).setRestitution(BALL.restitution).setMass(BALL.mass), body,
  )
  void ballCol
  const ctrl = new BallController(RAPIER, world, body)

  let falls = 0
  let finished = false
  let time = 0
  let maxSpeed = 0
  let maxY = -Infinity
  let pathIdx = 0
  let reason = 'timeout'
  const maxTime = opt.maxTime ?? 120
  const delay = opt.startDelay ?? 0
  const lookahead = opt.lookahead ?? 4
  const jumpLead = opt.jumpLeadIn ?? 1.1
  let simT = 0
  let respawnT = -1
  let jumpMarkUsed = new Set<number>()
  let slowT = 0
  let checkpoints = 0

  const steps = Math.ceil((maxTime + delay) / dt)
  for (let s = 0; s < steps; s++) {
    simT += dt
    // Move obstacles for this step.
    content.platforms.forEach((p, i) => {
      const pose = movingPlatformPose(p, simT)
      platBodies[i].setNextKinematicTranslation({ x: pose[0], y: pose[1], z: pose[2] })
      const q = { x: 0, y: Math.sin(p.yaw / 2), z: 0, w: Math.cos(p.yaw / 2) }
      platBodies[i].setNextKinematicRotation(q)
    })
    content.beams.forEach((b, i) => {
      const a = beamAngle(b, simT)
      beamBodies[i].setNextKinematicRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) })
    })
    content.pendulums.forEach((p, i) => {
      const pose = pendulumPose(p, simT)
      pendBodies[i].setNextKinematicRotation({ x: pose.quat[0], y: pose.quat[1], z: pose.quat[2], w: pose.quat[3] })
    })

    const t = body.translation()
    const pos: V3 = [t.x, t.y, t.z]
    const lv = body.linvel()
    const vel: V3 = [lv.x, lv.y, lv.z]
    const sp = length(vel)
    maxSpeed = Math.max(maxSpeed, sp)
    maxY = Math.max(maxY, pos[1])

    // Triggers (shared with the real game).
    const ev = logic.step(simT, dt, pos, vel, respawnT < 0)
    logic.tiles.forEach((tl, k) => {
      if (tl.fallen) {
        const f = content.falling[k]
        fallBodies[k].body.setNextKinematicTranslation({ x: f.pos[0], y: f.pos[1] + tl.dy, z: f.pos[2] })
      }
    })
    for (const k of ev.tilesReleased) fallBodies[k].col.setEnabled(false)
    if (respawnT < 0) {
      for (const b of ev.boosts) {
        const nv = applyBoostToVelocity(vel, b.dir, b.strength)
        body.setLinvel({ x: nv[0], y: nv[1], z: nv[2] }, true)
        const w = rollingAngvel(nv, ctrl.grounded ? ctrl.normal : [0, 1, 0])
        body.setAngvel({ x: w[0], y: w[1], z: w[2] }, true)
      }
      if (ev.checkpoint) { respawn = logic.respawn; checkpoints++ }
      slowT = ev.slowFactor < 1 ? 1 : 0
      if (ev.finished) { finished = true; reason = 'finished'; break }
      if (ev.fell) {
        falls++
        if (opt.maxFalls != null && falls > opt.maxFalls) { reason = 'too many falls'; break }
        respawnT = 0
      }
    }
    if (respawnT >= 0) {
      respawnT += dt
      if (respawnT > 0.3) {
        body.setTranslation({ x: respawn.pos[0], y: respawn.pos[1], z: respawn.pos[2] }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        ctrl.reset()
        logic.resetTiles()
        fallBodies.forEach((fb, k) => { const f = content.falling[k]; fb.col.setEnabled(true); fb.body.setNextKinematicTranslation({ x: f.pos[0], y: f.pos[1], z: f.pos[2] }) })
        respawnT = -1
        pathIdx = 0
        let best = Infinity
        content.path.forEach((p, i) => { const d = dist(p.p, respawn.pos); if (d < best) { best = d; pathIdx = i } })
      }
      world.step()
      continue
    }

    // Bot: follow path.
    while (pathIdx < content.path.length - 1 && dist(content.path[pathIdx + 1].p, pos) < dist(content.path[pathIdx].p, pos)) pathIdx++
    let ahead = pathIdx
    const targetD = content.path[pathIdx].d + lookahead
    while (ahead < content.path.length - 1 && content.path[ahead].d < targetD) ahead++
    let wish: V3 = normalize(sub(content.path[ahead].p, pos))
    // On a loop, follow the local track tangent instead of a straight line to the target.
    let nearestTangent: V3 | null = null
    for (const piece of content.pieces) {
      if (!piece.isLoop) continue
      let bestD = 3
      piece.samples.forEach(smp => { const d = dist(smp.p, pos); if (d < bestD) { bestD = d; nearestTangent = smp.t } })
    }
    if (opt.humanWish) {
      wish = yawForward(content.start!.yaw)
    } else if (nearestTangent) wish = nearestTangent
    else wish = normalize([wish[0], 0, wish[2]])
    // Moving platforms: park just before the edge, board when the platform is back at its near end, ride
    // standing still (the controller brakes relative to the platform), step off at the far end.
    for (const pl of content.platforms) {
      const pose = movingPlatformPose(pl, simT)
      const fwd = yawForward(pl.yaw)
      const rel = sub(pos, pose)
      const alongP = dot(rel, fwd)
      const latP = Math.abs(dot(rel, [Math.cos(pl.yaw), 0, -Math.sin(pl.yaw)]))
      const onPlat = Math.abs(alongP) < pl.size[2] / 2 + 0.1 && latP < pl.size[0] / 2 && pos[1] > pose[1] && pos[1] - pose[1] < 1.6
      const aheadOfA = dot(sub(pos, pl.a), fwd)
      const edgeAhead = -(pl.size[2] / 2 + 0.2)
      const approaching = aheadOfA > edgeAhead - 9 && aheadOfA <= 0.2 && Math.abs(pos[1] - (pl.a[1] + pl.size[1] / 2)) < 2.2 && latP < pl.size[0]
      if (onPlat) {
        if (dist(pose, pl.b) > 1.2) wish = [0, 0, 0]
      } else if (approaching && (Math.abs(pl.a[1] - pl.b[1]) > 0.5 ? dist(pose, pl.a) > 0.4 : dist(pose, pl.a) > 2.6)) {
        const spot = edgeAhead - 0.9
        const e = spot - aheadOfA
        const vAlong = dot(vel, fwd)
        const m = Math.max(-1, Math.min(1, e * 0.8 - vAlong * 0.4))
        wish = scaleV(fwd, m)
      }
    }
    // Narrow track: ease off like a careful player.
    {
      let w = 99
      let bd = 3
      for (const piece of content.pieces) piece.samples.forEach(smp => { const d = dist(smp.p, pos); if (d < bd) { bd = d; w = piece.width } })
      if (w < 4.2 && !opt.humanWish) wish = scaleV(wish, 0.6)
    }
    const wasStarted = simT >= delay
    const jumpPressed = (() => {
      for (let i = 0; i < content.jumpMarks.length; i++) {
        if (jumpMarkUsed.has(i)) continue
        const m = content.jumpMarks[i]
        const along = dot(sub(pos, m.pos), m.dir)
        const near = dist([m.pos[0], pos[1], m.pos[2]], pos) < jumpLead + 0.2 && along > -jumpLead && Math.abs(pos[1] - m.pos[1]) < 2.5
        if (near && ctrl.grounded) { jumpMarkUsed.add(i); return true }
      }
      return false
    })()
    ctrl.step(
      dt,
      { wish: wasStarted ? scaleV(wish, opt.speedBias ?? 1) : [0, 0, 0], jumpPressed: wasStarted && jumpPressed },
      { speedScale: slowT ? 0.5 : 1, drag: slowT ? 2.5 : 0 },
    )
    // Detect standing on a falling tile / platform handled by trigger logic above.
    opt.onStep?.({ t: simT, pos, vel, grounded: ctrl.grounded, normal: ctrl.normal })
    world.step()
    if (wasStarted) time += dt
    if (opt.maxFalls != null && falls > opt.maxFalls) break
    if (time > maxTime) break
  }
  const prog = content.path.length ? content.path[pathIdx].d : 0
  world.free()
  return { finished, time, falls, gems: logic.collected.size, maxSpeed, maxY, checkpoints, reason, progress: prog }
}

const scaleV = (v: V3, s: number): V3 => [v[0] * s, v[1] * s, v[2] * s]
