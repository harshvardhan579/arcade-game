# 🕹️ Pocket Arcade

**Five original arcade games in one responsive web app — every pixel drawn in code, every sound synthesized, zero downloaded assets.**

**▶ [Play the live demo](https://arcade-game-five.vercel.app/)** &nbsp;·&nbsp; [Source on GitHub](https://github.com/harshvardhan579/arcade-game)

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Phaser](https://img.shields.io/badge/Phaser-3.90-8A4FFF)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/e2e-Playwright-2EAD33?logo=playwright&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=white)

Pocket Arcade is a portfolio project built to show what I care about as an engineer: **clean architecture, a real automated-testing discipline, and thoughtful UX** — not just a game that runs. It's a Vite + strict-TypeScript + Phaser 3 app where game rules live in pure, deterministic, framework-independent engines, and Phaser scenes only render them. That separation is enforced by a custom build-time guard, verified by 11 unit-test files and 8 Playwright end-to-end suites, and shipped to production on Vercel with an optional global leaderboard behind a serverless API.

---

## Why this project is worth a look

- **Architecture with a hard boundary.** Every game is a pure `*Logic.ts` engine (no Phaser, no DOM, no storage, no `Math.random`) plus a `*Scene.ts` renderer. A custom `scripts/import-boundary.mjs` guard fails the build if that boundary is ever crossed — so game logic stays unit-testable and deterministic by construction.
- **Testing that actually catches bugs.** Beyond unit tests, a Playwright suite reads rendered **canvas pixels** to prove the selected game is the one on screen — a class of "stacked scene" bug that DOM and state assertions physically cannot catch.
- **Zero runtime assets.** No images, audio files, fonts, or sprite sheets are ever downloaded. All visuals are procedural (Phaser Graphics, generated textures, particles, glow, scanlines, camera shake); all sound is synthesized with WebAudio.
- **Production-grade delivery.** Deterministic seeded RNG, a fixed-step game loop, safe `localStorage` high scores, a flag-gated, server-side validated leaderboard API, full mobile/desktop responsive layouts, two themes, and `prefers-reduced-motion` support.

---

## The games

Five distinct genres, each with its own logic engine, hand-built feel, and procedural rendering:

| Game               | Genre                | What makes it interesting                                                                                                                                                     |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Neon Serpent**   | Grid snake           | Portal wrapping, a combo multiplier, seeded food/obstacles, and a 17-level speed ramp (144 ms → 80 ms step floor) surfaced live in the HUD.                                   |
| **Bounce Circuit** | Auto-runner          | Ramping capped scroll past seeded chunks (spike fences, one-way platforms, orb bounties); coyote time, landing buffer, and a double jump; distance banks into score on death. |
| **Star Courier**   | Vertical shooter     | Straight drones + sinusoidal weavers, un-shootable debris to dodge, queued column-strafing that settles aim-exact, object pools, and deterministic wave scaling.              |
| **Lane Rush**      | Pseudo-3D racer      | Depth-eased three-lane road, near-miss scoring with popups, a double-tap boost (cooldown + exhaust), a capped speed ramp, and crash impact at the true collision depth.       |
| **Circuit Stack**  | Falling-block puzzle | Full seven-piece 7-bag dealing, wall kicks (incl. the I-piece ±2 kicks), ghost preview, multi-row clear scoring, and a gravity curve that quickens with lines cleared.        |

Every run draws a **fresh seed** (new game, Restart, or restart-after-death), so obstacles, enemies, traffic, and pieces vary — while tests can force exact seeds for fully reproducible outcomes.

---

## Architecture

The core idea: **game truth lives in pure logic; scenes only draw it.**

```
src/
├── games/<game>/
│   ├── <game>Logic.ts        # pure, deterministic engine — no Phaser/DOM/storage/RNG entropy
│   ├── <game>Scene.ts        # Phaser renderer: input → logic, draws every entity at its true position
│   └── <game>Logic.test.ts   # Vitest: happy paths, edge cases, snapshot contracts
│   BaseGameScene.ts          # shared fixed-step loop, HUD, audio cues, TestBridge publishing
├── core/                     # InputManager, AudioEngine, ScoreManager/Storage, RunSeeds,
│                             # LeaderboardService, TestBridge, Viewport
├── ui/                       # DOM shell: ArcadeShell, HomeScreen, GameSelector,
│                             # TouchControls, ThemeToggle, LeaderboardPanel, CaseStudyPanel
├── leaderboard/              # pure shared validation (names, banned words, plausibility, serverCore)
└── main.ts                   # game registry, Phaser config, scene switching
api/leaderboard.ts            # Vercel serverless function (thin adapter over serverCore)
```

**Design decisions worth calling out:**

- **The import boundary is enforced, not aspirational.** ESLint plus `scripts/import-boundary.mjs` block any `*Logic.ts` from importing Phaser, the DOM, `window`, `document`, `localStorage`, or the audio engine. If the boundary fails, the fix is the architecture — never weakening the guard.
- **Deterministic by design.** A seeded `SeededRandom` powers all gameplay randomness; logic files contain no `Math.random` or `Date`. Run seeds are mixed at the scene boundary (`core/RunSeeds.ts`), so tests reproduce exact runs.
- **Scenes render truth.** Each game's state snapshot exposes real entity positions (projectiles, traffic, piece cells, …) and scenes draw from them — never synthetic layouts derived from counts.
- **A test bridge, not a leak.** Scenes publish a JSON-serializable snapshot to `window.__ARCADE__` (score, tick, high score, run seed, per-game entity positions) for Playwright — Phaser objects never escape into it.
- **Shared systems as singletons.** One WebAudio context (lazily unlocked, Phaser's own SoundManager disabled), one input manager mapping keyboard + virtual D-pad to semantic inputs, one score manager persisting per-game maxima to `localStorage` safely.

---

## Testing & quality discipline

Quality is the point of this repo, so validation is a first-class pipeline:

```bash
npm run validate   # build (tsc + vite) → Vitest → ESLint + import-boundary + Prettier → Playwright
```

_Current validation: 154 Vitest tests and 103 Playwright checks pass across desktop/mobile projects, plus build, API typecheck, ESLint, import-boundary, Prettier, and secret-grep checks._

| Layer                                   | What it guarantees                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`tsc --noEmit`** (app + `api/`)       | Strict TypeScript across the whole codebase, including the serverless function.                                                                                                                                                                                                                    |
| **Vitest** (11 files)                   | Pure-logic happy paths, edge cases, and snapshot contracts (positions in bounds, determinism, JSON-serializable & detached).                                                                                                                                                                       |
| **ESLint + import-boundary + Prettier** | Lint, the architectural boundary guard, and consistent formatting.                                                                                                                                                                                                                                 |
| **Playwright** (8 suites)               | Deep per-game interaction runs (deterministic progression/death), high-score persistence across reloads, audio lifecycle (one AudioContext, no listener growth), mobile-viewport layout, and a **pixel-signature switching regression** that reads the canvas to prove the right game is rendered. |

The pixel-signature test is the highlight: bridge and DOM checks can't detect a scene stacking on top of another, so the suite counts per-game signature-color pixels on the real canvas (e.g. Lane Rush's road trapezoid) to catch it. **Every meaningful gameplay or rendering change ships with a logic test, a state-contract test, a Playwright interaction test, or an explained validation note — no test is ever deleted to make a change pass.**

Narrower commands: `npm run build`, `npm run test`, `npm run lint`, `npm run test:e2e`, or `npx vitest run src/games/<game>` for a single game. Playwright needs its browser once: `npx playwright install chromium`.

---

## Global leaderboard (optional, flag-gated)

An optional per-game **global** leaderboard runs alongside the local high scores — a small but complete piece of full-stack, security-minded engineering.

- **Off by default, zero footprint.** It activates only when the build sets `VITE_LEADERBOARD_ENABLED=1`. With the flag off — including every local `npm run dev` and the entire CI suite — the client makes **zero** network calls and renders no leaderboard UI. The static app behaves exactly as it always has.
- **No secrets in the browser, ever.** The client calls only a same-origin serverless function (`api/leaderboard.ts`) through `src/core/LeaderboardService.ts`. That function is the only place that talks to **Supabase Postgres**, via a server-only `service_role` key. `grep -ri supabase dist/` is empty after a build.
- **Server-authoritative validation.** Name, profanity/reserved-word, and score-plausibility rules live in `src/leaderboard/` as pure modules shared by both client (instant UX feedback) and server (the authority). The server re-validates every submission and rate-limits by a salted IP hash — client validation is treated as UX only, never trusted.
- **Additive, never intrusive.** Submission is always explicit (a tap, never automatic). Local high scores remain fully independent and network-free. Honestly scoped: this is an arcade leaderboard, not an anti-cheat system — there are no accounts, and plausible correctly-shaped scores aren't cryptographically prevented.

**Server-only environment variables** (set in the deploy platform, never committed — `.env*` is git-ignored):

| Variable                    | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL (server-only)                                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only, secret)                         |
| `LEADERBOARD_IP_SALT`       | Salt for hashing submitter IPs (server-only, secret)                    |
| `VITE_LEADERBOARD_ENABLED`  | `1` to enable the client UI (the only `VITE_`-prefixed leaderboard var) |

---

## Responsive, themed, and accessible

- **Desktop** uses a three-column arcade layout — selector, canvas stage, engineering case-study — sized to the viewport with no page scroll (e2e-asserted 1280×800 → 1512×982).
- **Mobile portrait** hides the side panels and sizes the canvas from its grid row, so play area and split thumb-zone controls share the screen without overlap (e2e-asserted 375×667 → 430×932, plus a dedicated landscape composition). Uses `100dvh` with safe-area insets and `viewport-fit=cover`.
- **Two themes, zero assets** — a dark retro-neon default and a light "daylight cabinet," driven entirely by CSS custom properties. First paint honors `prefers-color-scheme` via an inline head script (no flash); a manual choice persists and wins. Light-theme contrast is designed to WCAG targets (body 13.2:1).
- **`prefers-reduced-motion`** is honored throughout: decorative particles, shakes, and flashes are skipped while gameplay feedback stays intact. Touch targets are ≥44 px with aria-labels and hold-to-repeat.

---

## Tech stack

Targets **Node ≥22 LTS** with exact pins for the game/test tooling:

| Tool              | Version            | Notes                                                                                 |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Phaser            | `3.90.0`           | Latest Phaser 3 line; intentionally **not** migrated to Phaser 4 (scene APIs differ). |
| TypeScript        | `6.0.3`            | Strict mode; `tsc --noEmit` gates the build.                                          |
| Vite              | `8.1.3`            | Dev server + build; Phaser split into its own vendor chunk.                           |
| Vitest            | `4.1.9`            | Pure-logic unit tests.                                                                |
| Playwright        | `1.61.1`           | Cross-viewport e2e + pixel-signature regression.                                      |
| ESLint / Prettier | `10.6.0` / `3.9.4` | Plus the custom import-boundary guard.                                                |

---

## Run locally

```bash
npm install
npm run dev        # start Vite; open the printed URL
```

Then run the full quality gate any time:

```bash
npm run validate
```

The global leaderboard does nothing locally by default (flag off). To exercise the real serverless function, use `vercel dev` with envs pulled via `vercel env pull .env.local`; Playwright never talks to a real backend (flag-on e2e uses route mocks).

---

## Deployment

Deployed to **Vercel** as a Vite static build with an attached serverless function:

- The frontend remains a static Vite app; the leaderboard API is additive, flag-gated, and deployed as a Vercel serverless function.
- Enable `VITE_LEADERBOARD_ENABLED=1` only on Production and Preview; keep Supabase keys and the IP salt as server-only secrets.
- Phaser ships as its own vendor chunk (**≈ 316 kB gzip**) split from the app code (**≈ 19 kB gzip**), so the app logic stays tiny and cache-friendly.

**Live:** [arcade-game-five.vercel.app](https://arcade-game-five.vercel.app/)

---

## Design constraints (self-imposed)

These constraints are what make the project a useful engineering showcase rather than a demo:

- **Zero external runtime assets** — no `.png`/`.jpg`/`.svg`/`.mp3`/`.wav`, no fonts, no sprite sheets, no remote images. Visuals are Phaser Graphics primitives and generated textures; audio is WebAudio synthesis after a user gesture; typography is system font stacks only.
- **Framework-independent, deterministic logic** — enforced by the import-boundary guard, never weakened to pass a change.
- **No placeholder rendering** — if logic tracks an entity's position, the scene draws it there.
- **No fake progress** — anything unverifiable is stated plainly, with a concrete follow-up recorded rather than glossed over.

---

## Roadmap

Concrete next steps, honestly scoped:

- **Per-scene lazy loading** of Phaser to trim the initial payload further (the ~316 kB gzip vendor chunk is inherent to the pinned engine today).
- **Richer synthesized audio** — the current cues are intentionally minimal and not asserted in headless e2e (only that audio paths don't throw and exactly one AudioContext exists).
- **End-to-end row-clear celebration** coverage for Circuit Stack (currently logic-tested; setting up a full row honestly in e2e is slow).
- **Leaderboard hardening** — accounts/ownership and stronger anti-abuse remain out of scope for an arcade leaderboard, but are the natural direction if it grew.

---

## A note on positioning

The app contains **no runtime AI or ML** — the framing is deliberately honest. What it demonstrates is an engineering approach: a clean logic/render boundary that's enforced by tooling, deterministic and reproducible tests, security-conscious full-stack delivery, and cross-viewport, accessible UX — carried consistently across five games. If you're evaluating how I structure and validate a real codebase, the [live demo](https://arcade-game-five.vercel.app/) is the fastest look, and `src/games/neon-serpent/` is a good first read.
