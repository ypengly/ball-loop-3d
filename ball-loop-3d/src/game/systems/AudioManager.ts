import { Howl, Howler } from 'howler'
import { createRng } from '../utils/math'

/**
 * Sound effects are synthesised at start-up into tiny WAV buffers (no binary assets to ship) and played through
 * Howler. Everything is created lazily after the first user gesture because browsers block audio before that.
 */

const SR = 22050

type Gen = (t: number, i: number) => number

function render(dur: number, gen: Gen): Float32Array {
  const n = Math.floor(dur * SR)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = gen(i / SR, i)
  return out
}

function toWavUrl(samples: Float32Array): string {
  const n = samples.length
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

const env = (t: number, dur: number, attack = 0.005) => Math.min(1, t / attack) * Math.pow(Math.max(0, 1 - t / dur), 2)
const sine = (f: number, t: number) => Math.sin(2 * Math.PI * f * t)

export type SoundName =
  | 'gem' | 'jump' | 'land' | 'checkpoint' | 'boost' | 'fall' | 'finish' | 'click' | 'hit' | 'tile' | 'star' | 'gameover'

const BASE_VOLUME: Record<SoundName, number> = {
  gem: 0.55, jump: 0.5, land: 0.6, checkpoint: 0.6, boost: 0.55, fall: 0.6, finish: 0.7, click: 0.4, hit: 0.7, tile: 0.5, star: 0.6, gameover: 0.6,
}

function synth(): Record<SoundName | 'roll', Float32Array> {
  const rng = createRng(1234)
  const noise = () => rng.next() * 2 - 1
  const gem = render(0.28, (t) => env(t, 0.28) * (sine(880, t) * 0.5 + sine(1320, t) * (t > 0.07 ? 0.5 : 0)) * 0.6)
  const jump = render(0.22, (t) => env(t, 0.22) * sine(280 + 700 * t, t) * 0.6)
  const land = render(0.2, (t) => env(t, 0.2, 0.002) * (sine(90 - 40 * t, t) * 0.8 + noise() * 0.25 * Math.max(0, 1 - t * 10)))
  const checkpoint = render(0.5, (t) => env(t, 0.5) * (sine(523, t) + sine(659, t) * (t > 0.09 ? 1 : 0) + sine(784, t) * (t > 0.18 ? 1 : 0)) * 0.3)
  let lp = 0
  const boost = render(0.45, (t) => {
    lp += (noise() - lp) * (0.05 + t * 0.9)
    return env(t, 0.45, 0.04) * (lp * 0.9 + sine(180 + 900 * t, t) * 0.25)
  })
  const fall = render(0.7, (t) => env(t, 0.7, 0.01) * sine(520 - 440 * t, t) * 0.5)
  const finish = render(1.1, (t) => {
    const notes = [523, 659, 784, 1047]
    let s = 0
    notes.forEach((f, i) => { if (t > i * 0.14) s += sine(f, t) * Math.pow(Math.max(0, 1 - (t - i * 0.14) / 0.8), 2) })
    return s * 0.28
  })
  const click = render(0.07, (t) => env(t, 0.07, 0.001) * sine(660, t) * 0.5)
  let hp = 0
  const hit = render(0.3, (t) => {
    hp += (noise() - hp) * 0.25
    return env(t, 0.3, 0.001) * (hp * 0.9 + sine(70, t) * 0.7)
  })
  let tp = 0
  const tile = render(0.35, (t) => { tp += (noise() - tp) * 0.1; return env(t, 0.35, 0.02) * tp * 0.8 })
  const star = render(0.35, (t) => env(t, 0.35) * (sine(988, t) + sine(1480, t) * 0.6) * 0.35)
  const gameover = render(0.9, (t) => env(t, 0.9, 0.01) * (sine(330 - 150 * t, t) + sine(247 - 110 * t, t)) * 0.3)
  // Loopable rolling rumble: brown noise, crossfaded so the loop point is seamless.
  const len = SR
  const raw = new Float32Array(len)
  let b = 0
  for (let i = 0; i < len; i++) { b = (b + noise() * 0.12) * 0.985; raw[i] = b }
  const fade = 2000
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    raw[i] = raw[i] * k + raw[len - fade + i] * (1 - k)
  }
  const roll = raw.slice(0, len - fade)
  let peak = 0
  for (const v of roll) peak = Math.max(peak, Math.abs(v))
  for (let i = 0; i < roll.length; i++) roll[i] = (roll[i] / (peak || 1)) * 0.8
  return { gem, jump, land, checkpoint, boost, fall, finish, click, hit, tile, star, gameover, roll }
}

class AudioManagerImpl {
  private sounds: Partial<Record<SoundName, Howl>> = {}
  private roll: Howl | null = null
  private rollId: number | null = null
  private ready = false
  private sfx = 0.8
  private master = 0.7
  private lastPlay: Partial<Record<SoundName, number>> = {}

  /** Create all sounds. Safe to call repeatedly; does nothing on the server or in tests. */
  init(): void {
    if (this.ready || typeof window === 'undefined') return
    this.ready = true
    try {
      const data = synth()
      ;(Object.keys(BASE_VOLUME) as SoundName[]).forEach(name => {
        this.sounds[name] = new Howl({ src: [toWavUrl(data[name])], format: ['wav'], volume: BASE_VOLUME[name] * this.sfx, html5: false })
      })
      this.roll = new Howl({ src: [toWavUrl(data.roll)], format: ['wav'], loop: true, volume: 0, html5: false })
      Howler.volume(this.master)
    } catch {
      this.ready = false
    }
  }

  setVolumes(master: number, sfx: number): void {
    this.master = master
    this.sfx = sfx
    if (typeof window === 'undefined') return
    Howler.volume(master)
  }

  play(name: SoundName, opts: { rate?: number; volume?: number } = {}): void {
    const h = this.sounds[name]
    if (!h) return
    const now = performance.now()
    // Collapse bursts of the same sound (e.g. several gems in one frame).
    if (now - (this.lastPlay[name] ?? 0) < 40) return
    this.lastPlay[name] = now
    const id = h.play()
    h.volume(BASE_VOLUME[name] * this.sfx * (opts.volume ?? 1), id)
    if (opts.rate) h.rate(opts.rate, id)
  }

  /** Drive the looping roll sound from ball speed. Pass grounded=false (or speed 0) to silence it. */
  setRoll(speed: number, grounded: boolean): void {
    if (!this.roll) return
    const target = grounded ? Math.min(1, speed / 18) * 0.55 * this.sfx : 0
    if (target < 0.01) {
      if (this.rollId !== null) {
        this.roll.volume(0, this.rollId)
      }
      return
    }
    if (this.rollId === null || !this.roll.playing(this.rollId)) this.rollId = this.roll.play()
    this.roll.volume(target, this.rollId)
    this.roll.rate(0.7 + Math.min(1.2, speed / 16), this.rollId)
  }

  stopRoll(): void {
    if (this.roll && this.rollId !== null) this.roll.volume(0, this.rollId)
  }

  suspend(muted: boolean): void {
    if (typeof window === 'undefined') return
    Howler.mute(muted)
  }
}

export const AudioManager = new AudioManagerImpl()
