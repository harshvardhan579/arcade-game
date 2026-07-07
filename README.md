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

- A pure `*Logic.ts` engine with deterministic seeded randomness that exposes real entity positions in its state snapshot. Live play draws a fresh run seed per run (new game, Restart, or restart-after-death) from `src/core/RunSeeds.ts`, so obstacles, enemies, traffic, and pieces vary between runs; tests force exact seeds through a documented hook (`window.__ARCADE_FIXED_SEEDS__` / `?seed=N`) and stay fully reproducible.
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
- Bounce Circuit: procedural auto-runner — the world scrolls at a ramping capped speed past seeded chunks of spike clusters, one-way platforms, and orb pickups under a parallax skyline; jumping has coyote time, a landing buffer, and one smaller mid-air double jump (the route to the tallest platforms), harder chunk archetypes (spike fences, orb bounties over spikes) unlock with distance, orbs score immediately, and the distance run banks into the score on death.
- Star Courier: vertical shooter with straight-falling drones plus sinusoidally drifting weavers from wave 2, telegraphed un-shootable debris rocks that absorb shots and must be dodged, queued glide strafing (taps stack whole columns and the ship sweeps across at ~11 columns/sec, settling column-exact for aiming), a dashed defense line, kill popups, wave banners, fixed object pools, and deterministic wave scaling.
- Lane Rush: pseudo-3D neon three-lane racer — horizon and road trapezoid with depth-eased lane dashes, roadside posts, and depth-scaled cars; near-miss scoring with `+12`/`+5` popups and a visible scoring band on the asphalt; a double-tap ACTION boost (duration, cooldown, HUD state, exhaust flames); a capped speed ramp; and a crash impact at the true collision lane/depth (shockwave rings, jolted cars, sparks — simplified under reduced motion). Car color variants derive from the spawn tick (no extra RNG draws).
- Circuit Stack: falling-block puzzle with the full seven-piece tetromino set dealt from a seeded 7-bag (live runs redeal a fresh order every restart), wall kicks (including the ±2 kicks the I piece needs), a ghost landing preview, a shape-accurate next-piece box, multi-row clear scoring, a gentle gravity curve that quickens with lines cleared (level and lines in the HUD, floored well above frantic), and spawn-blocked game-over.

## Responsive Shell

Desktop uses a three-column arcade layout — selector, canvas stage, and case-study panel — sized to exactly the viewport with no page scrolling, the touch controls hidden, and the canvas centered as the cabinet screen (e2e-asserted at 1280×800 through 1512×982).

Mobile portrait hides the side panels and sizes the canvas from its grid row (never from viewport constants), so play area and controls share the screen without overlap from iPhone SE up (e2e-asserted at 375×667 through 430×932). The layout uses `100dvh` with safe-area insets and `viewport-fit=cover`, the topbar leads with the game picker (options carry live per-game high scores), and the touch controls split into two thumb zones — direction cluster left, action button right — with class-driven pressed feedback, hold-to-repeat on directions, and aria-labels. Game over shows a centered "Tap ● to restart" overlay with touch-correct control hints throughout. Coarse-pointer phones in landscape get a dedicated composition — full-height centered canvas with controls flanking it — including widths that cross the 900px desktop breakpoint (e2e-asserted at 667×375 through 932×430).

The shell supports per-game aspect metadata; all five games use portrait-friendly layouts. Selecting a game stops the outgoing Phaser scene before starting the next one, shows that game's control hints, and keeps per-game high scores visible on the selector cards.

## Themes

The shell ships two themes driven entirely by CSS custom properties (zero assets): **dark** — the primary retro-neon arcade identity — and **light**, a "daylight cabinet" with bright chrome around game canvases that stay dark/neon for readability (the in-canvas palettes and pixel-signature tests are untouched by theming). A quiet ◐ toggle sits after Restart in the topbar (keyboard accessible, 44px on touch layouts, action-stating accessible name). First load honors `prefers-color-scheme` via an inline head script that resolves the theme before first paint (no flash); a manual choice persists in `localStorage` (`pocket-arcade:theme`) and beats the system preference; a broken/unavailable `localStorage` falls back to dark without errors. The `theme-color` meta follows the active theme. Light-theme text contrast is designed to WCAG targets (body 13.2:1, muted 5.9:1, accents ≥ 4.4:1). The Playwright suite pins `colorScheme: 'dark'` as its baseline and tests both themes explicitly.

## Global Leaderboard (optional, flag-gated)

An optional per-game **global** leaderboard runs alongside the local high scores. It is **off by default** and only activates when the build sets `VITE_LEADERBOARD_ENABLED=1` (production/preview deploys). With the flag off — including every local `npm run dev` and the entire CI test suite — the client makes **zero** network calls, renders no leaderboard UI, and behaves exactly as the static app always has.

- **What it does.** After a run ends with a positive score, a compact DOM panel (inside the cabinet screen, both themes, mobile-safe) invites the player to submit. You enter a name once (validated for length, charset, and a profanity/reserved-name filter; stored at `pocket-arcade:player-name` and reused with an Edit option). Submission is always explicit — never automatic — and shows your worldwide rank and best. The panel also lists the current game's global top scores (top 10 on desktop, top 5 on mobile). On the home hub, each card's score line gains a `World <score>` fragment beside its local `High` (e.g. `High 777 · World 12,340`).
- **Local vs global.** Local high scores (`pocket-arcade:<id>:high`, via `ScoreManager`/`SafeStorage`) are untouched and fully independent — they work with the flag off and never depend on the network. The global leaderboard is purely additive.
- **Architecture.** The browser only ever calls a same-origin serverless function, `api/leaderboard.ts` (a Vercel function), through `src/core/LeaderboardService.ts`. That function is the only place that talks to **Supabase Postgres**, using a server-only `service_role` key and a `submit_score` RPC; it re-validates every submission and rate-limits by a salted IP hash. Name/profanity/plausibility rules live in `src/leaderboard/` as pure modules shared by both the client (for instant UX feedback) and the server (as the authority). **No Supabase URL or key ever reaches the browser** — `grep -ri supabase dist/` is empty after a build. The static Vite site builds and runs with no `api/` directory present.
- **Required environment variables** (set in the deploy platform, never committed; `.env*` is git-ignored):
  - `SUPABASE_URL` — Supabase project URL (server-only)
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server-only, secret)
  - `LEADERBOARD_IP_SALT` — random salt for hashing submitter IPs (server-only, secret)
  - `VITE_LEADERBOARD_ENABLED` — `1` to enable the client UI (the only `VITE_`-prefixed leaderboard var)
- **Deployment notes.** Enable the flag only on Production and Preview. The real function is exercised locally with `vercel dev` (envs via `vercel env pull .env.local`); Playwright never talks to a real backend — flag-on e2e uses route mocks. See `LEADERBOARD_PLAN.md` for the schema and API contract and `NEXT_RUN.md` for the deploy checklist.

## Zero-Asset And Legal Note

The project does not load external images, audio, fonts, or sprite sheets. Visuals are drawn with Phaser Graphics primitives, and sound is generated with WebAudio oscillators after a user gesture. System font stacks only; no webfont downloads.

## Portfolio Positioning

The app itself contains no runtime AI or ML. The case-study framing is intentionally honest: it demonstrates an AI-assisted engineering workflow, including checkpointed delivery, deterministic tests, import-boundary enforcement, and cross-viewport Playwright smoke testing.

## Current Limitations

- Phaser ships as its own ~319 kB gzip vendor chunk (the app chunk is ~13 kB gzip); the build still warns about Phaser's size, which is inherent to the pinned engine. Per-scene lazy loading is a possible further optimization.
- Synthesized audio is intentionally minimal and is not asserted in headless E2E (only that audio paths do not throw and exactly one AudioContext exists).
- Row-clear celebrations in Circuit Stack are covered by logic tests but not exercised end-to-end (setting up a full row honestly in e2e is too slow).
- The global leaderboard has **no accounts or authentication** — names are not owned, and score validation is best-effort. The server enforces plausibility bounds, a profanity/reserved-name filter, and a salted-IP rate limit (6 submissions / 60 s), but a determined client that submits plausible, correctly-shaped scores is not cryptographically prevented from doing so; this is an arcade leaderboard, not an anti-cheat system. Client-side validation is UX only — the server re-validates everything.
