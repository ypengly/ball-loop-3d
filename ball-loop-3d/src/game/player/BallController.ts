import type RAPIER from '@dimforge/rapier3d-compat'
import { UP, dot, length, scale, type V3 } from '../utils/math'
import {
  BALL, clampSpeed, computeDriveAccel, computeGripAccel, computeJumpDelta, defaultDriveParams, rollingAngvel, type DriveParams,
} from './BallPhysics'


export interface StepInput {
  /** World-space wish direction on the XZ plane, length 0..1. */
  wish: V3
  /** True on the fixed step in which the jump button was pressed. */
  jumpPressed: boolean
}

export interface StepModifiers {
  /** Scale on the input speed limit (slow zones). */
  speedScale: number
  /** Extra drag (1/s) applied to the whole velocity (slow zones). */
  drag: number
}

export interface StepResult {
  grounded: boolean
  normal: V3
  speed: number
  jumped: boolean
  /** Impact speed (m/s) on the step the ball touched down after being airborne, else 0. */
  landed: number
}

type R = typeof RAPIER

/**
 * Applies player intent to a Rapier rigid body. Framework independent so the very same code runs in the
 * React scene and in headless physics tests.
 */
export class BallController {
  grounded = false
  normal: V3 = [0, 1, 0]
  params: DriveParams = defaultDriveParams()
  jumpSpeed: number = BALL.jumpSpeed
  private coyote = 0
  private jumpBuffer = 0
  private airTime = 0
  private lastVy = 0
  private sinceJump = 1
  private ray: RAPIER.Ray

  constructor(rapier: R, private world: RAPIER.World, private body: RAPIER.RigidBody) {
    this.ray = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })
  }

  reset(): void {
    this.grounded = false
    this.normal = [0, 1, 0]
    this.coyote = 0
    this.jumpBuffer = 0
    this.airTime = 0
    this.sinceJump = 1
  }

  private castDir(origin: V3, dir: V3, maxToi: number): { n: V3; gv: V3 } | null {
    this.ray.origin = { x: origin[0], y: origin[1], z: origin[2] }
    this.ray.dir = { x: dir[0], y: dir[1], z: dir[2] }
    const hit = this.world.castRayAndGetNormal(this.ray, maxToi, true, undefined, undefined, undefined, this.body)
    if (!hit) return null
    let n: V3 = [hit.normal.x, hit.normal.y, hit.normal.z]
    if (dot(n, dir) > 0) n = scale(n, -1)
    // Velocity of the surface we are standing on (moving platforms), so braking/steering is platform-relative.
    let gv: V3 = [0, 0, 0]
    const rb = hit.collider.parent()
    if (rb && rb.isKinematic()) {
      const l = rb.linvel()
      gv = [l.x, l.y, l.z]
    }
    return { n, gv }
  }

  step(dt: number, input: StepInput, mods: StepModifiers): StepResult {
    const t = this.body.translation()
    const lv = this.body.linvel()
    const pos: V3 = [t.x, t.y, t.z]
    const vel: V3 = [lv.x, lv.y, lv.z]
    const reach = BALL.radius + BALL.groundRayExtra

    // Ground probe: along the last surface normal first (keeps contact through loops), then straight down.
    let hit = this.castDir(pos, scale(this.normal, -1), reach)
    if (!hit || hit.n[1] < -0.95) hit = this.castDir(pos, [0, -1, 0], reach) ?? hit
    const wasAir = !this.grounded
    const prevAir = this.airTime
    const impact = Math.max(0, -dot(vel, this.normal))
    this.grounded = !!hit && this.sinceJump > 0.12
    if (hit && this.grounded) this.normal = hit.n

    const gv: V3 = this.grounded && hit ? hit.gv : [0, 0, 0]
    let landed = 0
    if (this.grounded) {
      if (wasAir && prevAir > 0.22) landed = Math.max(impact, -this.lastVy)
      this.airTime = 0
      this.coyote = BALL.coyoteTime
    } else {
      this.airTime += dt
      this.coyote = Math.max(0, this.coyote - dt)
      if (!hit) this.normal = UP
    }
    this.sinceJump += dt
    this.jumpBuffer = input.jumpPressed ? BALL.jumpBuffer : Math.max(0, this.jumpBuffer - dt)

    let jumped = false
    if (this.jumpBuffer > 0 && this.coyote > 0 && this.sinceJump > 0.18) {
      const dv = computeJumpDelta(this.normal, vel, this.jumpSpeed)
      this.body.applyImpulse({ x: dv[0] * BALL.mass, y: dv[1] * BALL.mass, z: dv[2] * BALL.mass }, true)
      this.jumpBuffer = 0
      this.coyote = 0
      this.sinceJump = 0
      this.grounded = false
      jumped = true
    }

    const a = computeDriveAccel(
      { wish: input.wish, grounded: this.grounded, normal: this.normal, velocity: [vel[0] - gv[0], vel[1] - gv[1], vel[2] - gv[2]], speedScale: mods.speedScale },
      this.params,
    )
    let ax = a[0], ay = a[1], az = a[2]
    if (this.grounded) {
      const g = computeGripAccel(this.normal, length(vel))
      ax += g[0]; ay += g[1]; az += g[2]
    }
    if (mods.drag > 0) {
      ax -= vel[0] * mods.drag; ay -= vel[1] * mods.drag * 0.2; az -= vel[2] * mods.drag
    }
    if (this.grounded && length(input.wish) < 0.04 && length(vel) < 4) {
      // No input: sync spin to a pure roll so leftover spin does not push the ball along.
      const rel: V3 = [vel[0] - gv[0], vel[1] - gv[1], vel[2] - gv[2]]
      const w = rollingAngvel(rel, this.normal)
      const cur = this.body.angvel()
      this.body.setAngvel({ x: cur.x + (w[0] - cur.x) * 0.5, y: cur.y + (w[1] - cur.y) * 0.5, z: cur.z + (w[2] - cur.z) * 0.5 }, true)
    }
    this.body.applyImpulse({ x: ax * BALL.mass * dt, y: ay * BALL.mass * dt, z: az * BALL.mass * dt }, true)

    const after = this.body.linvel()
    const capped = clampSpeed([after.x, after.y, after.z], BALL.hardMaxSpeed)
    if (capped) this.body.setLinvel({ x: capped[0], y: capped[1], z: capped[2] }, true)

    this.lastVy = vel[1]
    return { grounded: this.grounded, normal: this.normal, speed: length(vel), jumped, landed }
  }
}
