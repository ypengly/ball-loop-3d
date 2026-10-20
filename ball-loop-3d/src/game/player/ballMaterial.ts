import * as THREE from 'three'
import type { SkinDef } from '../../types'

const cache = new Map<string, THREE.MeshPhysicalMaterial>()

function patternTexture(skin: SkinDef): THREE.CanvasTexture | null {
  if (skin.pattern === 'solid') return null
  const W = 512
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const a = skin.color
  const b = skin.color2 ?? '#ffffff'
  g.fillStyle = a
  g.fillRect(0, 0, W, H)
  g.fillStyle = b
  if (skin.pattern === 'stripes') {
    const n = 12
    for (let i = 0; i < n; i += 2) g.fillRect((i * W) / n, 0, W / n, H)
  } else if (skin.pattern === 'checker') {
    const cols = 12
    const rows = 6
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if ((x + y) % 2) g.fillRect((x * W) / cols, (y * H) / rows, W / cols, H / rows)
  } else if (skin.pattern === 'rings') {
    const n = 8
    for (let i = 1; i < n; i += 2) g.fillRect(0, (i * H) / n, W, H / n)
  } else if (skin.pattern === 'dots') {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 10; x++) {
        g.beginPath()
        g.arc(((x + (y % 2) * 0.5) * W) / 10 + 26, (y * H) / 5 + 26, 11, 0, Math.PI * 2)
        g.fill()
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Cached per skin. `highQuality` enables the clearcoat layer. */
export function getBallMaterial(skin: SkinDef, highQuality: boolean): THREE.MeshPhysicalMaterial {
  const key = `${skin.id}:${highQuality}`
  const hit = cache.get(key)
  if (hit) return hit
  const map = patternTexture(skin)
  const m = new THREE.MeshPhysicalMaterial({
    color: map ? '#ffffff' : skin.color,
    roughness: skin.material === 'metal' ? 0.18 : skin.material === 'glass' ? 0.05 : 0.22,
    metalness: skin.material === 'metal' ? 0.95 : 0.05,
    clearcoat: highQuality && skin.material !== 'metal' ? 1 : 0,
    clearcoatRoughness: 0.08,
    envMapIntensity: skin.material === 'metal' ? 1.6 : 1.1,
  })
  if (map) m.map = map
  if (skin.material === 'glass') {
    m.transparent = true
    m.opacity = 0.78
    m.ior = 1.45
  }
  if (skin.material === 'neon') {
    m.emissive = new THREE.Color(skin.color)
    m.emissiveIntensity = 0.45
    if (map) m.emissiveMap = map
  }
  cache.set(key, m)
  return m
}
