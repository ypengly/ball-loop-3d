import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { TrackPiece } from '../levels/levelTypes'
import { frameRight } from '../levels/levelBuilder'
import { RAIL_HEIGHT, RAIL_WIDTH } from './profiles'
import { COLORS } from '../theme'

/** Neon outline along both loop rails so the loop reads as a special, high-speed element. */
export function LoopTrack({ piece }: { piece: TrackPiece }) {
  const { geoms, mat } = useMemo(() => {
    const off = piece.width / 2 - RAIL_WIDTH / 2
    const geoms = [-1, 1].map(side => {
      const pts = piece.samples.map(s => {
        const r = frameRight(s)
        return new THREE.Vector3(
          s.p[0] + r[0] * off * side + s.u[0] * (RAIL_HEIGHT + 0.04),
          s.p[1] + r[1] * off * side + s.u[1] * (RAIL_HEIGHT + 0.04),
          s.p[2] + r[2] * off * side + s.u[2] * (RAIL_HEIGHT + 0.04),
        )
      })
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), piece.samples.length * 2, 0.07, 6, false)
    })
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.magenta })
    return { geoms, mat }
  }, [piece])
  useEffect(() => () => { geoms.forEach(g => g.dispose()); mat.dispose() }, [geoms, mat])
  return <>{geoms.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}</>
}
