# Ball Loop 3D

A 3D arcade ball-rolling game that runs in the browser. Roll a physics-driven ball through twisting tracks, genuine
vertical loops, half-pipes, moving platforms and hazards; collect gems, earn stars and unlock ball skins. Everything is
procedural (geometry, textures, sound) and saved locally — there is no backend and no network access at runtime.

## 1. Overview and key features

- **Real physics.** A dynamic Rapier ball with acceleration/deceleration, friction, air steering, configurable jump,
  coyote time, jump buffering, slope/bank handling and a grip assist that lets it ride loops when it carries enough speed.
- **Third-person camera.** Follow camera with adjustable distance, mouse/touch/stick rotation, auto-recentre, camera
  collision and fall recovery.
- **Track pieces.** Straights, narrow bridges, curves, ramps, launches, gaps, **physical vertical loops**, half-pipes,
  moving platforms (horizontal and vertical), rotating beams, pendulum hammers, falling/disappearing platforms, boost pads,
  slow zones, checkpoints, finish gates and gems.
- **Modes.** Adventure (10 levels), Time Trial (replay unlocked levels for personal bests), Endless Loop (seeded,
  streamed, ever-harder course) and a Daily Challenge (deterministic from the **local device date**; no server, no
  leaderboard).
- **Progression.** 1–3 stars per level (finish / beat par / level challenge), gems, perfect-run (no falls) bonus,
  personal bests, 12 achievements, 9 ball skins bought with gems.
- **Presentation.** Glossy physical-material ball, neon accents, particles, speed trail, procedural audio, quality setting
  (low/medium/high) and an animated 3D main-menu background.
- **Input.** Keyboard, mouse, touch joystick + jump button, gamepad.

## 2. Screenshots

Screenshots have not been committed yet. Placeholders:

| Screen | File |
| --- | --- |
| Main menu | `docs/screenshots/menu.png` _(placeholder)_ |
| Level 1 gameplay | `docs/screenshots/gameplay.png` _(placeholder)_ |
| Vertical loop | `docs/screenshots/loop.png` _(placeholder)_ |
| Results screen | `docs/screenshots/results.png` _(placeholder)_ |
| Mobile layout | `docs/screenshots/mobile.png` _(placeholder)_ |

## 3. Technology stack

Vite 8 · TypeScript (strict) · React 19 · Three.js 0.186 · React Three Fiber 9 · @react-three/drei 10 ·
@react-three/rapier 2 (Rapier physics) · Zustand 5 · Tailwind CSS 4 · Howler.js · Vitest 5.

## 4. Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 8) and npm.
- A browser with WebGL2 (current Chrome, Edge, Firefox or Safari).

## 5. Installation

```bash
npm install
```

## 6. Development server

```bash
npm run dev
```

Open the printed local URL (default http://localhost:5173).

## 7. Production build

```bash
npm run build      # type-checks (tsc --noEmit) then bundles to dist/
npm run typecheck  # type-check only
```

## 8. Production preview

```bash
npm run preview    # serves dist/ (default http://localhost:4173)
```

## 9. Project structure

```
src/
├── app/                    App shell, providers, screen router
├── components/
│   ├── layout/             GameShell, LoadingScreen, ErrorBoundary
│   └── ui/                 Button, Modal, Toggle, Slider, Stars, ProgressBar, Logo
├── features/               React UI screens
│   ├── menu/ levels/ challenges/ customization/ achievements/ settings/
│   └── hud/                Hud, PauseMenu, ResultsScreen, MobileControls, TutorialModal, Toasts
├── game/                   Everything 3D
│   ├── GameCanvas.tsx      Canvas + Physics setup; PlayScene.tsx / RunDriver.tsx: run orchestration
│   ├── camera/             FollowCamera
│   ├── effects/            Particles, SpeedTrail
│   ├── levels/             levelTypes, levelBuilder (segment → geometry), levelRegistry, definitions/level-01..10
│   ├── objects/            Collectible, Checkpoint, BoostPad/SlowZone, FinishGate
│   ├── obstacles/          MovingPlatform, RotatingBeam, Pendulum, FallingPlatform, motion (pure), registry
│   ├── player/             Ball, BallController, BallPhysics (pure math), PlayerInput, ballMaterial
│   ├── scenery/            Sky/scenery, Lights, MenuScene
│   ├── systems/            RunLogic, CollisionSystem, CollectibleSystem, CheckpointSystem, AudioManager,
│   │                       LevelProgression, runtime (mutable per-frame state)
│   ├── tracks/             Track, LoopTrack, Bridge, Ramp, ribbon/profiles, palette, TrackGenerator (endless)
│   └── utils/math.ts
├── hooks/                  useKeyboard, useGamepad, useMobileControls, useRuntimeSample
├── store/                  gameStore (state machine), progressStore, settingsStore, uiStore
├── styles/globals.css      Tailwind entry + theme tokens
├── types/ utils/           Shared types, formatTime, safe localStorage wrapper
tests/
├── helpers/sim.ts          Headless Rapier world + path-following bot (uses the real controller)
├── formatTime.test.ts
├── progression.test.ts
└── levelValidation.test.ts
```

## 10. Controls

| Input | Action |
| --- | --- |
| **W A S D / arrow keys** | Roll |
| **Space** | Jump (coyote time + input buffering) |
| **Mouse drag** | Rotate camera |
| **Esc / P** | Pause / resume |
| **Gamepad** | Left stick or D-pad roll · right stick camera · A or right trigger jump · Start pause |
| **Touch** | Left on-screen joystick roll · JUMP button · drag the right side to look · pause button |

Sensitivity, inversion and camera distance are adjustable in Settings.

## 11. Modes and progression

- **Adventure** — 10 levels; finishing a level unlocks the next. Stars: ★ finish, ★★ beat the par time, ★★★ also meet
  the level's challenge (collect all gems, no falls, or an expert time).
- **Time Trial** — replay any unlocked level; personal best time is stored per level.
- **Endless Loop** — a seeded generator streams valid, connected chunks ahead and prunes them behind; difficulty ramps
  with distance; one fall ends the run; best distance is stored.
- **Daily Challenge** — the date (device-local `YYYY-MM-DD`) picks a rotation entry and seed, so every launch on the same
  local date gets the same course. It is labelled as local; it is not a global daily.
- **Rewards** — gems collected are banked on completion; first clears and perfect runs give bonus gems; achievements
  grant gems; skins are purchased in Ball Skins (cosmetic only).

## 12. Adding a level

Levels are data. Create `src/game/levels/definitions/level-11.ts`:

```ts
import type { LevelDefinition } from '../levelTypes'

export const level11: LevelDefinition = {
  id: 'my-level', title: 'My Level', subtitle: 'Short tagline',
  objective: 'What to do', tip: 'A helpful hint',
  parTime: 40, challenge: 'allGems',           // or 'noFalls' | 'fastTime' (+ expertTime)
  segments: [
    { t: 'start', length: 16 },
    { t: 'straight', length: 30, features: [
      { k: 'checkpoint', at: 0.2 },
      { k: 'gems', from: 0.3, to: 0.8, count: 4 },
      { k: 'boost', at: 0.95, strength: 24 },
    ] },
    { t: 'loop', radius: 5 },
    { t: 'curve', angle: 90, radius: 14 },
    { t: 'finish' },
  ],
}
```

Then add it to `LEVEL_DEFINITIONS` in `src/game/levels/levelRegistry.ts`. Segments are laid out turtle-style so they
always connect. `tests/levelValidation.test.ts` automatically validates every registered level and runs the bot through it,
so a broken or impossible level fails `npm run test`.

## 13. Adding an obstacle

1. Add a feature (`{ k: 'myThing', ... }`) to `levelTypes.ts`, a matching element interface, and an array on
   `LevelContent` (also add it to `emptyContent` and the merge code in `levelBuilder.ts`).
2. Handle the feature in `appendSegments` (levelBuilder) to push the element with its resolved position.
3. Write a component in `src/game/obstacles/`. Use a kinematic `RigidBody` and drive it inside `useObstacleTick`
   (see `registry.ts`) as a **pure function of simulation time** — put that function in `motion.ts` so it is testable
   and the headless bot can reproduce it. This keeps motion fixed-step, pausable and reset with the level.
4. Render it from `ChunkView.tsx`. For hazards, mark the collider with the hazard user data used by
   `CollisionSystem.ts`.
5. Teach `tests/helpers/sim.ts` about it if the bot must reason about it.

## 14. Saving

Only `localStorage` is used, via a safe wrapper (`src/utils/storage.ts`) that falls back to memory when storage is
unavailable and merges stored data over defaults, so old or corrupted data never crashes the game.

- `ballloop3d:settings` — volume, sensitivities, invert, quality, shake, camera distance, tutorial-seen.
- `ballloop3d:progress` — per-level stars/best time/best gems, gems, best endless distance, daily bests, skins,
  selected skin, achievements, totals.

Clear the site's storage to reset everything.

## 15. Performance and compatibility

- Use **Low** quality on older or integrated GPUs (disables shadows, reflections and the speed trail). Medium is the default.
- Close other GPU-heavy tabs; keep the browser hardware-accelerated. Physics runs at a fixed 60 Hz independent of frame rate.
- Tested in headless Chromium (software WebGL). Other current browsers with WebGL2 are expected to work but were not
  tested here. Audio starts after the first user interaction (browser autoplay rules).
- The HUD reads game state at 10 Hz; no React state updates happen per animation frame.

## 16. Testing

```bash
npm run test       # Vitest
npm run typecheck
```

- `formatTime.test.ts` — time/distance formatting and invalid input.
- `progression.test.ts` — stars, unlocks, progress reducer, skins, daily determinism, game-state transitions.
- `levelValidation.test.ts` — all levels are structurally valid; a path-following bot using the real ball controller in
  a headless Rapier world finishes every level at several start timings; the big loop is climbed with plain
  "hold forward" input; endless seeds produce valid connected tracks.

## 17. Known limitations

- The test bot does not dodge hazards and can fail endless seeds at obstacles; level completability is proven only for
  authored levels (by the bot with limited falls), not by human playtesting.
- No SSAO or post-processing; visuals are deliberately lightweight.
- The daily challenge uses the device's local date and has no leaderboard or anti-tamper; saves are editable.
- The level builder supports `branch` segments (secret routes), but no shipped level uses them yet.
- Not verified on real GPUs, Safari/Firefox, physical touch devices or gamepads (touch layout was checked in an emulated viewport).
- The JavaScript bundle is large (~3.6 MB before gzip) because Three.js and Rapier are not code-split.
- Library warnings in the console (`THREE.Clock` deprecation from R3F, Rapier init parameters) come from dependencies.

## 18. License

MIT — see [LICENSE](./LICENSE).
