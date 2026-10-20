import type { ProfileKind, TrackPalette } from '../levels/levelTypes'
import { PALETTES, type Rgb } from './palette'

export const TRACK_THICKNESS = 0.6
export const BRIDGE_THICKNESS = 0.3
export const RAIL_WIDTH = 0.3
export const RAIL_HEIGHT = 0.65
export const EDGE_STRIPE = 0.28

export interface Profile {
  /** Closed polygon in (x = right, y = up) track-local coordinates, y=0 is the driving surface. */
  points: [number, number][]
  /** Colour for the edge from points[i] to points[i+1] (wrapping). */
  edgeColors: Rgb[]
}

export const thicknessFor = (kind: ProfileKind): number => (kind === 'bridge' ? BRIDGE_THICKNESS : TRACK_THICKNESS)

/** Width of the drivable surface for a profile of the given nominal width. */
export const drivableWidth = (kind: ProfileKind, width: number): number =>
  kind === 'rails' ? width - RAIL_WIDTH * 2 : width

export function makeProfile(kind: ProfileKind, width: number, palette: TrackPalette): Profile {
  const c = PALETTES[palette]
  const hw = width / 2
  const t = thicknessFor(kind)

  if (kind === 'rails') {
    const rw = RAIL_WIDTH
    const rh = RAIL_HEIGHT
    return {
      points: [
        [-hw, -t], [hw, -t], [hw, rh], [hw - rw, rh], [hw - rw, 0], [-hw + rw, 0], [-hw + rw, rh], [-hw, rh],
      ],
      edgeColors: [c.bottom, c.side, c.accent, c.side, c.top, c.side, c.accent, c.side],
    }
  }

  if (kind === 'halfpipe') {
    const wallR = Math.min(2.4, width * 0.36)
    const floorHalf = hw - wallR
    const pts: [number, number][] = []
    const cols: Rgb[] = []
    const seg = 8
    // Top surface from left rim to right rim.
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * (Math.PI / 2)
      pts.push([-floorHalf - wallR * Math.sin(a), wallR * (1 - Math.cos(a))])
    }
    // ^ goes from floor-left outward and up; reverse so it runs left rim -> floor.
    pts.reverse()
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * (Math.PI / 2)
      pts.push([floorHalf + wallR * Math.sin(a), wallR * (1 - Math.cos(a))])
    }
    const topCount = pts.length
    for (let i = 0; i < topCount - 1; i++) {
      const mid = Math.abs(pts[i][0] + pts[i + 1][0]) / 2
      cols.push(mid > floorHalf + wallR * 0.82 ? c.accent : c.top)
    }
    // Close underneath.
    const [lx, ly] = pts[0]
    const [rx, ry] = pts[topCount - 1]
    void ry
    void ly
    pts.push([rx, -t])
    pts.push([lx, -t])
    cols.push(c.side) // right rim -> down
    cols.push(c.bottom) // underside
    cols.push(c.side) // left rim up (wraps to pts[0])
    return { points: pts, edgeColors: cols }
  }

  // flat / bridge
  const e = Math.min(EDGE_STRIPE, hw * 0.4)
  return {
    points: [[-hw, -t], [hw, -t], [hw, 0], [hw - e, 0], [-hw + e, 0], [-hw, 0]],
    edgeColors: [c.bottom, c.side, c.accent, c.top, c.accent, c.side],
  }
}
