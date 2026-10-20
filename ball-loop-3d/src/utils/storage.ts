/** Safe localStorage wrapper: never throws (private mode / quota / disabled storage). */
const PREFIX = 'ballloop3d:'

let memoryFallback: Record<string, string> = {}

function backend(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const probe = `${PREFIX}__probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const store = backend()
    const raw = store ? store.getItem(PREFIX + key) : (memoryFallback[PREFIX + key] ?? null)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value)
    const store = backend()
    if (store) store.setItem(PREFIX + key, raw)
    else memoryFallback[PREFIX + key] = raw
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string): void {
  try {
    const store = backend()
    if (store) store.removeItem(PREFIX + key)
    else delete memoryFallback[PREFIX + key]
  } catch {
    /* ignore */
  }
}

export function resetMemoryStorageForTests(): void {
  memoryFallback = {}
}

/** Deep-merge saved data onto defaults so older saves gain new fields. */
export function mergeDefaults<T extends object>(defaults: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) }
  const src = saved as Record<string, unknown>
  for (const k of Object.keys(defaults)) {
    const d = (defaults as Record<string, unknown>)[k]
    const s = src[k]
    if (s === undefined) continue
    if (d && typeof d === 'object' && !Array.isArray(d) && s && typeof s === 'object' && !Array.isArray(s)) {
      // Records keyed by id keep all saved keys; fixed-shape objects merge.
      out[k] = Object.keys(d as object).length === 0 ? s : mergeDefaults(d as object, s)
    } else if (typeof d === typeof s || d === null) {
      out[k] = s
    }
  }
  return out as T
}
