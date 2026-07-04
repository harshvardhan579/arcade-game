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

`npm run validate` runs build, Vitest, ESLint/import-boundary/Prettier, and Playwright smoke tests in sequence. Playwright requires its Chromium browser cache; install it with `npx playwright install chromium` if prompted.

## Architecture

Each game is split into:

- A pure `*Logic.ts` engine with deterministic seeded randomness.
- A Phaser `*Scene.ts` renderer that translates semantic input, draws procedural shapes, plays synthesized audio cues, and publishes canvas state through `window.__ARCADE__`.
- A focused Vitest file for happy paths and edge cases.

Logic engines do not import Phaser, touch the DOM, access storage, or play audio. This is enforced by ESLint plus `scripts/import-boundary.mjs`.

Shared systems live in `src/core/`:

- `InputManager` maps keyboard and virtual D-pad controls to semantic inputs.
- `AudioEngine` lazily unlocks WebAudio and synthesizes select, score, hit, and game-over cues.
- `ScoreManager` and `Storage` handle safe local high-score persistence.
- `TestBridge` exposes a small serializable state snapshot for Playwright assertions.
- `Viewport` centralizes reduced-motion and mobile checks.

## Games

- Neon Serpent: polished vertical slice with grid movement, portal wrapping, food, combo decay, speed ramping, obstacles, collision, and restart.
- Bounce Circuit: portrait single-screen platformer with jump physics, spike hazard, key pickup, locked door, win, and game-over.
- Star Courier: vertical shooter with projectiles, enemy spawning, object pools, collisions, and deterministic wave scaling.
- Lane Rush: three-lane racer with lane clamping, traffic spawning, speed ramping, collision, and near-miss scoring.
- Circuit Stack: falling-block puzzle with grid occupancy, rotation with wall-kick attempt, row clearing, scoring, next-piece state, and spawn-blocked game-over.

## Responsive Shell

Desktop uses a three-column arcade layout: selector, canvas stage, and case-study panel. Mobile portrait hides secondary panels, keeps the canvas and controls in the first viewport, disables gameplay page scrolling, and exposes large touch controls.

The shell supports per-game aspect metadata. The current MVP set uses portrait-friendly layouts for all games, including a vertical shooter treatment for Star Courier and a portrait single-screen Bounce Circuit.

## Zero-Asset And Legal Note

The project does not load external images, audio, fonts, or sprite sheets. Visuals are drawn with Phaser Graphics primitives, and sound is generated with WebAudio oscillators after a user gesture. System font stacks only; no webfont downloads.

## Portfolio Positioning

The app itself contains no runtime AI or ML. The case-study framing is intentionally honest: it demonstrates an AI-assisted engineering workflow, including checkpointed delivery, deterministic tests, import-boundary enforcement, and cross-viewport Playwright smoke testing.

## Current Limitations

- Phaser is bundled into one production chunk, so Vite warns about bundle size. Code-splitting scenes would be a natural next optimization.
- The four non-Serpent games are complete MVPs rather than deeply tuned arcade games.
- Synthesized audio is intentionally minimal and is not asserted in headless E2E.
