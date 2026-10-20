import type { TrackPalette } from '../levels/levelTypes'

export type Rgb = [number, number, number]

/** sRGB hex -> linear rgb (vertex colours are interpreted as linear by three.js). */
export function hexToLinear(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16)
  const c = (v: number) => Math.pow(v / 255, 2.2)
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)]
}

export interface PaletteColors {
  top: Rgb
  accent: Rgb
  side: Rgb
  bottom: Rgb
}

const make = (top: string, accent: string, side: string, bottom: string): PaletteColors => ({
  top: hexToLinear(top),
  accent: hexToLinear(accent),
  side: hexToLinear(side),
  bottom: hexToLinear(bottom),
})

export const PALETTES: Record<TrackPalette, PaletteColors> = {
  path: make('#e6eeff', '#2fd8ff', '#8ea2e8', '#3d4c9a'),
  bridge: make('#e0aa6e', '#ffd27a', '#94603a', '#5a3a22'),
  loop: make('#d9deff', '#ff4fd8', '#9276e8', '#4e3a9a'),
  halfpipe: make('#cdf2ff', '#2fd8ff', '#7fb0f0', '#3c5a94'),
  start: make('#c6f7d8', '#4dff9a', '#5fae83', '#2c6a4a'),
  finish: make('#fff0b8', '#ffb02e', '#c8993a', '#7a5a1c'),
}
