# Pocket Arcade

Pocket Arcade is a responsive, zero-asset HTML5 retro arcade built with Vite, TypeScript, Phaser 3, Vitest, Playwright, ESLint, and Prettier. It is designed as a portfolio artifact for frontend architecture, pure game-logic design, mobile UX, and an AI-assisted spec-to-tested-code workflow.

## Tech Stack And Pins

The stack targets Node 22 LTS and uses exact pins for the requested game/test tooling:

- Phaser `3.90.0` — npm latest is now Phaser 4, but this project intentionally pins the latest Phaser 3 release line for the requested Phaser 3 architecture.
- Vitest `4.1.9`
- Playwright `1.61.1`
- Vite `8.1.3`
- TypeScript `6.0.3`
- ESLint `10.6.0`
- Prettier `3.9.4`

## Run Locally

```bash
npm install
npm run dev
```

Then open the Vite URL printed by the terminal.

## Validation

```bash
npm run build
npm run test
npm run lint
npm run test:e2e
npm run validate
```

`npm run validate` runs build, Vitest, ESLint/import-boundary/Prettier, and Playwright in sequence. Playwright requires its Chromium browser cache; install it with `npx playwright install chromium` if prompted.

The Playwright suites go beyond smoke: every game has a deep interaction test (deterministic progression/death runs, entity-bounds contracts), high-score persistence is verified against real gameplay and reloads, audio lifecycle is guarded by an AudioContext/listener-count instrumentation test, the shell has controls-hint and mobile first-viewport assertions, and a pixel-signature switching regression reads the rendered canvas to prove the selected game is actually the one on screen — bridge and DOM checks alone cannot catch stacked-scene bugs.

## Architecture

Each game is split into:

- A pure `*Logic.ts` engine with deterministic seeded randomness that exposes real entity positions in its state snapshot.
- A Phaser `*Scene.ts` renderer that translates semantic input, draws every entity at its true logic position, layers procedural feedback (particles, shake, flashes via the shared `src/games/effects.ts` helper), and publishes canvas state through `window.__ARCADE__`.
- A focused Vitest file for happy paths, edge cases, and snapshot contracts (positions in bounds, determinism, JSON-serializable and detached).

Logic engines do not import Phaser, touch the DOM, access storage, or play audio. This is enforced by ESLint plus `scripts/import-boundary.mjs`.

Shared systems live in `src/core/`:

- `InputManager` maps keyboard and virtual D-pad controls to semantic inputs.
- `AudioEngine` is a shared singleton that lazily unlocks one WebAudio context and synthesizes select, score, hit, and game-over cues; Phaser's own SoundManager is disabled.
- `ScoreManager` and `Storage` persist per-game high scores from live gameplay and announce new records via an `arcade-high-score` event that the shell renders on the selector cards.
- `TestBridge` exposes a JSON-serializable state snapshot (including entity positions and the high score) for Playwright assertions.
- `Viewport` centralizes reduced-motion and mobile checks; all decorative effects are gated on `prefers-reduced-motion`.

## Games

- Neon Serpent: grid snake with portal wrapping, a combo multiplier, seeded food and mine-styled obstacles, and a visible 17-level speed ramp — eating accelerates the step interval from 144 ms down to an 80 ms floor, surfaced as `Spd N` in the HUD.
- Bounce Circuit: procedural auto-runner — the world scrolls at a ramping capped speed past seeded chunks of spike clusters, one-way platforms, and orb pickups under a parallax skyline; jumping has coyote time and a landing buffer, orbs score immediately, and the distance run banks into the score on death.
- Star Courier: vertical shooter with straight-falling drones plus sinusoidally drifting weavers from wave 2, telegraphed un-shootable debris rocks that absorb shots and must be dodged, a dashed defense line, kill popups, wave banners, fixed object pools, and deterministic wave scaling.
- Lane Rush: neon three-lane racer — near-miss scoring with `+12`/`+5` popups, speed-scaled lane dashes and roadside posts, layered car shapes whose color variants derive from the spawn tick (no extra RNG draws), and crash feedback.
- Circuit Stack: falling-block puzzle with the full seven-piece tetromino set dealt from a seeded 7-bag, wall kicks (including the ±2 kicks the I piece needs), a ghost landing preview, a shape-accurate next-piece box, multi-row clear scoring, and spawn-blocked game-over.

## Responsive Shell

Desktop uses a three-column arcade layout: selector, canvas stage, and case-study panel. Mobile portrait hides secondary panels, keeps the canvas and controls in the first viewport, disables gameplay page scrolling, and exposes large touch controls.

The shell supports per-game aspect metadata; all five games use portrait-friendly layouts. Selecting a game stops the outgoing Phaser scene before starting the next one, shows that game's control hints, and keeps per-game high scores visible on the selector cards.

## Zero-Asset And Legal Note

The project does not load external images, audio, fonts, or sprite sheets. Visuals are drawn with Phaser Graphics primitives, and sound is generated with WebAudio oscillators after a user gesture. System font stacks only; no webfont downloads.

## Portfolio Positioning

The app itself contains no runtime AI or ML. The case-study framing is intentionally honest: it demonstrates an AI-assisted engineering workflow, including checkpointed delivery, deterministic tests, import-boundary enforcement, and cross-viewport Playwright smoke testing.

## Current Limitations

- Phaser ships as its own ~319 kB gzip vendor chunk (the app chunk is ~9 kB gzip); the build still warns about Phaser's size, which is inherent to the pinned engine. Per-scene lazy loading is a possible further optimization.
- Synthesized audio is intentionally minimal and is not asserted in headless E2E (only that audio paths do not throw and exactly one AudioContext exists).
- Row-clear celebrations in Circuit Stack are covered by logic tests but not exercised end-to-end (setting up a full row honestly in e2e is too slow).
