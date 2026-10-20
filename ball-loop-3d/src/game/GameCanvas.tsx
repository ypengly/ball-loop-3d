import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useGame, isSimulating } from '../store/gameStore'
import { useSettings } from '../store/settingsStore'
import { BALL } from './player/BallPhysics'
import { PlayScene } from './PlayScene'
import { MenuScene } from './scenery/MenuScene'

/** Tells the app the physics engine finished loading. */
function ReadySignal() {
  const boot = useGame(s => s.boot)
  useEffect(() => {
    const id = window.setTimeout(boot, 350)
    return () => window.clearTimeout(id)
  }, [boot])
  return null
}

export function GameCanvas() {
  const phase = useGame(s => s.phase)
  const run = useGame(s => s.run)
  const runId = useGame(s => s.runId)
  const quality = useSettings(s => s.quality)
  const inRun = run !== null && phase !== 'MainMenu' && phase !== 'Loading'

  return (
    <Canvas
      shadows={quality !== 'low' ? 'percentage' : false}
      dpr={quality === 'low' ? 1 : quality === 'medium' ? [1, 1.5] : [1, 2]}
      camera={{ fov: 62, near: 0.1, far: 1000, position: [0, 6, 14] }}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <Suspense fallback={null}>
        <Physics gravity={[0, -BALL.gravity, 0]} timeStep={1 / 60} paused={!isSimulating(phase)} interpolate>
          {inRun && run ? <PlayScene run={run} runId={runId} /> : <MenuScene />}
          <ReadySignal />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
