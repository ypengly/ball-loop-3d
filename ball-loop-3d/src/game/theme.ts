import * as THREE from 'three'

/** One cohesive palette. Neon accents are reserved for interactive things (checkpoints, gems, boosts). */
export const COLORS = {
  ink: '#0b1230',
  sky: { top: '#2347c9', mid: '#5f9bff', horizon: '#ffd6ee' },
  fog: '#9cc2ff',
  cyan: '#2fd8ff',
  magenta: '#ff4fd8',
  gold: '#ffc83d',
  green: '#35ff9a',
  hazard: '#ff3b4a',
  hazardLight: '#fff1f0',
  tile: '#ffa133',
  platform: '#7d93e0',
  platformTop: '#d7e2ff',
  slow: '#b06bff',
} as const

let trackMat: THREE.MeshStandardMaterial | null = null
/** Shared by every track piece (colours come from vertex colours). */
export function getTrackMaterial(): THREE.MeshStandardMaterial {
  if (!trackMat) {
    trackMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.04 })
  }
  return trackMat
}

export function makeStripeTexture(a: string, b: string, stripes = 8, size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  const w = size / stripes
  for (let i = 0; i < stripes * 2; i++) {
    g.fillStyle = i % 2 ? a : b
    g.beginPath()
    g.moveTo(i * w - size, size)
    g.lineTo(i * w - size + w, size)
    g.lineTo(i * w + w, 0)
    g.lineTo(i * w, 0)
    g.closePath()
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function makeChevronTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 128, 256)
  g.fillStyle = 'rgba(0,0,0,0)'
  g.strokeStyle = '#eafff4'
  g.lineWidth = 16
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 0; i < 2; i++) {
    const y = 36 + i * 120
    g.beginPath()
    g.moveTo(20, y + 70)
    g.lineTo(64, y)
    g.lineTo(108, y + 70)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function makeCheckerTexture(cols = 8, rows = 3): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = cols * 32
  c.height = rows * 32
  const g = c.getContext('2d')!
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g.fillStyle = (x + y) % 2 ? '#10163a' : '#ffffff'
      g.fillRect(x * 32, y * 32, 32, 32)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
