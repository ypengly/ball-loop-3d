import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { RunContext } from './RunContext'
import { ChunkView } from './ChunkView'
import { Ball } from './player/Ball'
import { FollowCamera } from './camera/FollowCamera'
import { RunDriver, type EndlessApi } from './RunDriver'
import { Particles } from './effects/Particles'
import { SpeedTrail } from './effects/SpeedTrail'
import { Scenery } from './scenery/Scenery'
import { Lights } from './scenery/Lights'
import { getLevel } from './levels/levelRegistry'
import { RunLogic } from './systems/RunLogic'
import { EndlessGenerator, mergeChunks, type EndlessChunk } from './tracks/TrackGenerator'
import { runtime } from './systems/runtime'
import type { LevelContent, ResolvedLevel } from './levels/levelTypes'
import type { RunConfig } from '../store/gameStore'
import type { V3 } from './utils/math'

const AHEAD = 190
const BEHIND = 140

/** One run of a handcrafted level. Remounted (via key) on every restart so nothing leaks between attempts. */
function LevelRun({ level }: { level: ResolvedLevel }) {
  const body = useRef<RapierRigidBody>(null)
  const logicRef = useRef<RunLogic>(null as unknown as RunLogic)
  if (!logicRef.current) logicRef.current = new RunLogic(level, level.killY)
  const start = level.start!
  return (
    <RunContext.Provider value={{ logicRef }}>
      <Lights />
      <Scenery baseY={level.killY + 18} />
      <ChunkView content={level} />
      <Ball ref={body} position={start.pos} />
      <RunDriver bodyRef={body} logicRef={logicRef} totalLength={level.totalLength} endless={null} />
      <FollowCamera bodyRef={body} />
      <SpeedTrail />
      <Particles />
    </RunContext.Provider>
  )
}

/** An endless course streamed in chunks ahead of the ball and pruned behind it. */
function EndlessRun({ seed }: { seed: number }) {
  const body = useRef<RapierRigidBody>(null)
  const init = useMemo(() => {
    const gen = new EndlessGenerator(seed)
    const chunks: EndlessChunk[] = []
    for (let i = 0; i < 5; i++) chunks.push(gen.next())
    return { gen, chunks }
  }, [seed])
  const genRef = useRef(init.gen)
  const chunksRef = useRef(init.chunks)
  const [chunks, setChunks] = useState(init.chunks)
  const logicRef = useRef<RunLogic>(null as unknown as RunLogic)
  if (!logicRef.current) {
    const merged = mergeChunks(init.chunks)
    logicRef.current = new RunLogic(merged, -20)
  }

  const api = useMemo<EndlessApi>(() => ({
    ensure: distance => {
      const cur = chunksRef.current
      const last = cur[cur.length - 1]
      let next = cur
      let changed = false
      if (last.baseDistance + last.length - distance < AHEAD) {
        next = [...next]
        while (next[next.length - 1].baseDistance + next[next.length - 1].length - distance < AHEAD) next.push(genRef.current.next())
        changed = true
      }
      // Drop chunks well behind the ball (keep at least the one it is on).
      const keepFrom = next.findIndex(c => c.baseDistance + c.length > distance - BEHIND)
      if (keepFrom > 0) {
        next = next.slice(keepFrom)
        changed = true
      }
      if (!changed) return
      chunksRef.current = next
      logicRef.current.setContent(mergeChunks(next))
      setChunks(next)
    },
    killYFor: distance => {
      let m = Infinity
      for (const c of chunksRef.current) {
        if (distance >= c.baseDistance - 30 && distance <= c.baseDistance + c.length + 30) m = Math.min(m, c.minY)
      }
      if (!Number.isFinite(m)) m = chunksRef.current[0].minY
      return m - 14
    },
  }), [])

  useEffect(() => () => { runtime.distance = 0 }, [])
  const start = init.chunks[0].content.start!
  const startPos: V3 = start.pos
  const content: LevelContent[] = useMemo(() => chunks.map(c => c.content), [chunks])
  return (
    <RunContext.Provider value={{ logicRef }}>
      <Lights />
      <Scenery baseY={-14} />
      {content.map((c, i) => <ChunkView key={chunks[i].index} content={c} />)}
      <Ball ref={body} position={startPos} />
      <RunDriver bodyRef={body} logicRef={logicRef} totalLength={0} endless={api} />
      <FollowCamera bodyRef={body} />
      <SpeedTrail />
      <Particles />
    </RunContext.Provider>
  )
}

export function PlayScene({ run, runId }: { run: RunConfig; runId: number }) {
  const level = useMemo(() => (run.levelId ? getLevel(run.levelId) : null), [run.levelId])
  const useKey = useCallback(() => `${runId}`, [runId])
  return level ? <LevelRun key={useKey()} level={level} /> : <EndlessRun key={useKey()} seed={run.seed} />
}
