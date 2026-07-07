# Future Agent Guide

This repo is **Pocket Arcade**: a zero-asset, five-game Phaser 3 arcade built with Vite + strict TypeScript, validated by Vitest, Playwright, ESLint, Prettier, and a custom import-boundary guard. Preserve the architecture before adding features.

## Hard Rules

- Preserve strict TypeScript (`tsc --noEmit` is part of `npm run build`).
- Preserve the Vite + Phaser 3 stack. Phaser is intentionally pinned to `3.90.0`; do **not** migrate to Phaser 4 unless scene APIs and architecture are deliberately updated together.
- Zero external runtime assets: no `.png`, `.jpg`, `.svg`, `.mp3`, `.wav`, fonts, sprite sheets, remote images, or asset downloads. Everything visual is procedural (Phaser Graphics, generated textures via `generateTexture`, geometry, particles, trails, gradients, scanlines, glow layers, camera shake, screen flash). Everything audible is synthesized WebAudio.
- Keep all `*Logic.ts` files framework-independent and deterministic. Do not import `phaser`, `AudioEngine`, DOM APIs, `window`, `document`, or `localStorage` from logic files or Vitest logic tests. Enforced by `scripts/import-boundary.mjs` — if the boundary fails, fix the architecture, never weaken the guard.
- Use the deterministic `SeededRandom` for any gameplay randomness tests may need to verify.
- Phaser scenes are responsible for rendering, input translation, synthesized audio cues, and TestBridge publishing only. Game truth lives in logic; scenes draw it.
- **No placeholder rendering for real gameplay entities.** If logic tracks an entity's position, the scene must draw it at that position — never draw synthetic layouts derived from counts.
- Do not add large dependencies without a strong, stated reason.
- Do not fake progress. If something cannot be verified, say so explicitly and record a concrete follow-up in `NEXT_RUN.md`.

## Architecture Map

- `src/games/<game>/`: `*Logic.ts` (pure, deterministic engine) + `*Scene.ts` (Phaser renderer) + `*Logic.test.ts` (Vitest).
- `src/games/BaseGameScene.ts`: shared fixed-step loop, HUD, audio cue triggering, bridge publishing, listener cleanup on `SHUTDOWN`.
- `src/core/`: `InputManager` (keyboard + virtual d-pad → semantic inputs via `arcade-semantic-input` CustomEvents), `AudioEngine` (WebAudio synthesis), `ScoreManager`/`Storage` (safe localStorage high scores), `RunSeeds` (per-run seed mixer), `LeaderboardService` (flag-gated same-origin `/api` client), `TestBridge`, `Viewport` (reduced-motion / mobile checks), `types.ts`.
- `src/ui/`: DOM shell — `ArcadeShell`, `HomeScreen`, `GameSelector`, `TouchControls`, `ThemeToggle`, `CaseStudyPanel`, `LeaderboardPanel`.
- `src/leaderboard/`: pure shared validation (`types`, `names`, `bannedWords`, `plausibility`, `serverCore`) imported by both the client and `api/`.
- `api/leaderboard.ts`: Vercel function (thin adapter over `serverCore.ts`); its own strict `api/tsconfig.json`. Absent in the static Vite deploy — the app must build and run without it.
- `src/main.ts`: game registry, Phaser config (CANVAS, RESIZE scale), scene switching.
- Games: Neon Serpent, Bounce Circuit, Star Courier, Lane Rush, Circuit Stack.

## TestBridge Contract

Scenes publish:

```ts
window.__ARCADE__ = {
  activeScene: string,
  getState(): {
    score: number;
    isGameOver: boolean;
    tick: number;
    highScore: number;
    runSeed: number; // the seed this run was dealt (forced in tests)
    // plus per-game serializable fields
  }
};
```

Playwright reads this bridge with `page.evaluate`. Keep snapshots JSON-serializable and never expose Phaser objects. Extending the snapshot with per-game fields (entity positions, phase, high score) is encouraged — it is how render-contract and interaction tests verify truth.

## Validation

Run the full loop before claiming completion:

```bash
npm run validate   # build (tsc + vite) → vitest → eslint + import-boundary + prettier → playwright
```

Narrow commands: `npm run build`, `npm run test`, `npm run lint`, `npm run test:e2e`, `npx vitest run src/games/<game>` for one game. Playwright needs `npx playwright install chromium` once.

**Every meaningful gameplay or rendering change needs one of:** a logic test, a render/state contract test, a Playwright interaction test, or a clearly explained validation note. Keep or improve all existing validation; never delete a test to make a change pass.

## Console And Headless Caveats

The smoke suite asserts `console.error` only. Phaser or headless browsers may emit harmless logs/warnings; do not fail tests on general `console.log`, `console.info`, or warnings unless they indicate a real regression.

- Do not assert audio output in Playwright; only ensure audio initialization paths do not throw.

## Design Constraints

- Mobile portrait must keep gameplay and virtual controls visible without scrolling.
- Desktop preserves the selector / stage / engineering case-study three-column layout.
- Honor `prefers-reduced-motion` (see `Viewport.prefersReducedMotion`): skip decorative churn (particles, shakes, flashes) while keeping gameplay feedback intact.
- Cards stay compact: small radii, no nested card stacks.
- System font stacks only; no webfont downloads.

## Subagents

Delegate via the agents in `.claude/agents/` when the task matches:

- `game-feel-director` — game feel, juice, fairness, pacing, scoring-loop audits and designs.
- `phaser-renderer` — scene rendering, procedural graphics, particles, effects, canvas scaling.
- `ux-polish-auditor` — shell UI, selector, mobile controls, typography, accessibility audits.
- `test-quality-guardian` — test design, coverage review, validation-pipeline protection.
- `performance-guardian` — bundle size, frame stability, allocation, Graphics reuse.

The autonomous improvement loop lives in `.claude/loop.md`; it records progress in `NEXT_RUN.md`.

## Architecture Notes (updated 2026-07-06, post gameplay-replayability pass)

All debts from the initial audit are resolved; preserve these invariants:

- **Themes are shell-only, token-driven:** dark is the default identity (`:root` tokens); light is `:root[data-theme='light']` overrides in `src/style.css`. An inline head script in `index.html` resolves stored choice (`pocket-arcade:theme` via `SafeStorage` strings) → `prefers-color-scheme` → dark, before first paint; `src/ui/ThemeToggle.ts` (`.theme-toggle`, a protected hook after Restart in the topbar — the keyboard spec pins Restart at tab position six) flips the attribute, persists, and updates the `theme-color` meta. The game canvases and the `.game-root` cabinet screen stay literally dark in both themes — pixel signatures are theme-independent by construction. **Playwright pins `colorScheme: 'dark'`** in the shared config; never remove it (Playwright defaults to light and the whole suite would silently flip theme). Theme CSS must never touch `touch-action`, focus-ring width/style, or layout properties.
- **Run seeds live at the scene boundary:** live gameplay draws a fresh seed per run from `src/core/RunSeeds.ts` (clock + counter mixer); `BaseGameScene.startNewRun()` reseeds on scene `create()` (switching away and back starts a fresh run, not a resume), on the Restart button, and on ACTION-after-game-over (intercepted before the logic's default-seed self-restart). Tests force exact seeds via the per-game map `window.__ARCADE_FIXED_SEEDS__` (Playwright `addInitScript`; consulted on **every** restart) or a `?seed=N` param; `games/shell/highscore` specs force the historical defaults 7/11/9/12/14 while `smoke/switching/audio` deliberately run live. Any new e2e that waits on a seeded outcome must force its seed. Logic files stay entropy-free — no `Math.random`/`Date` in `*Logic.ts`, ever.

- **Scene switching stops the outgoing scene:** `startGame` in `src/main.ts` tracks `currentSceneKey` and calls `game.scene.stop` before `game.scene.start`, because Phaser's `SceneManager.start` does **not** stop the running scene — without the stop, scenes stack and later scenes in the config list render on top of newly selected ones. The regression test is `tests/switching.spec.ts`.
- **Pixel-signature contract:** `tests/switching.spec.ts` proves the selected game is actually rendered by counting canvas pixels of per-game signature colors — Lane Rush's pseudo-3D road trapezoid `#0d252b` (> 80k px; re-measured at ~114k on the desktop canvas after the 3D redesign), Bounce Circuit's full-width ground strip `#12353c`, Circuit Stack grid strokes `#31545a` @ 0.8 over the base background, Neon Serpent food magenta (bounded 50..3000), Star Courier ship cyan in the bottom-center region. Visual restyles must keep these signatures (or re-measure and update the spec deliberately) and must re-run the spec; never weaken it — bridge/DOM assertions cannot catch stacked-scene bugs.
- **RNG draw discipline:** deterministic logic tests and e2e scripts depend on the _order_ of `SeededRandom` draws (e.g. Star Courier's seed-9 column-2 opener, Lane Rush's seed-12 crash at tick ~102). Do not add rng draws casually; derive cosmetic variety from stable data instead (Lane Rush car variants use `spawnTick % 3`). If a draw must be added, probe and update the dependent tests deliberately.

- **Scenes render truth:** every game's snapshot exposes real entity positions (`projectiles`/`enemies`, `traffic`, `pieceCells`, …) and scenes draw from them. Never regress to count-based synthetic layouts. Contract tests in each `*Logic.test.ts` pin positions, determinism, and snapshot detachment.
- **High scores:** `ScoreManager.record()` persists per-game maxima, publishes `highScore` through the bridge/HUD, and dispatches `arcade-high-score` CustomEvents that `GameSelector` renders on cards. `tests/highscore.spec.ts` guards the full path including real gameplay.
- **Audio:** `audioEngine` is a module singleton with idempotent unlock listeners; Phaser's SoundManager is disabled (`audio: { noAudio: true }`). `tests/audio.spec.ts` asserts at most one AudioContext and no listener growth across scene cycling.
- **Effects:** shared scene-side helpers live in `src/games/effects.ts` (ESLint-allowlisted for Phaser); emitters self-destroy on scene SHUTDOWN; all decorative effects gate on `reducedMotion`.
- **Bundle:** Phaser is split into a vendor chunk via `build.rolldownOptions.output.codeSplitting` in `vite.config.ts` (app ≈ 13 kB gzip after the gameplay pass, Phaser ≈ 319 kB gzip). The >500 kB warning refers to Phaser itself and is intentionally left visible.

## Leaderboard Invariants (added 2026-07-07, `leaderboard-pass-1`, phases 0–6)

Optional per-game **global** leaderboard: a Vercel function (`api/leaderboard.ts`) → Supabase Postgres (service-role, server-only) behind shared pure validation. Local high scores, gameplay, scoring, seeds, and every `*Logic.ts` are untouched. Preserve these invariants:

- **Flag-gated is the compatibility story.** Enabled only when `VITE_LEADERBOARD_ENABLED === '1'` (the **only** leaderboard var that may be `VITE_`-prefixed) or the test hook `window.__ARCADE_LB_FORCE__`. **Flag-off = zero `/api` requests, no `LeaderboardPanel` DOM, no home `World` fragments.** `tests/leaderboard.spec.ts` pins zero `/api` + no leaderboard DOM flag-off; `smoke.spec.ts` pins no `console.error`. A stray fetch to a missing `/api` route in dev would log an error — gating is what protects that pin. Never break flag-off.
- **No Supabase in the browser, ever.** The client calls only the same-origin `/api/leaderboard` via `src/core/LeaderboardService.ts` (singleton like `audioEngine`; 5 s abort; typed results `disabled`/`offline`/`http`+status+code/`invalid`; never throws, never logs). The Supabase URL, `service_role` key, and `LEADERBOARD_IP_SALT` are **server-only** env — `grep -ri supabase dist/` must return nothing after build.
- **One shared validator, server-authoritative.** `src/leaderboard/` (types, names, bannedWords, plausibility, serverCore) is pure (no DOM/fetch/Phaser/storage — import-boundary safe) and imported by both the client (UX pre-validation only) and the API (authoritative re-validation). Never trust client validation; the server re-runs it on every POST. Plausibility constants derive from the `*Logic.ts` scoring source — re-derive them if scoring ever changes.
- **`arcade-game-over` / `arcade-run-start` contracts.** `BaseGameScene` dispatches exactly one `arcade-game-over` CustomEvent (`GameOverDetail {gameId,score,tick,runSeed}` from `core/types.ts`) on the alive→dead transition at **both** death sites (guarded by `!before.isGameOver` — never per frame), and a plain `arcade-run-start` from `startNewRun()`. `LeaderboardPanel` opens on game-over (enabled + `score > 0`), submits **once per run-end** on an explicit tap (Retry re-arms after failure), and dismisses on run-start/go-home. ACTION-restart, Restart, and Back must keep working with the panel open.
- **Local high scores stay independent.** `ScoreManager` + `pocket-arcade:<id>:high` are untouched. The player name lives at `pocket-arcade:player-name` (SafeStorage; persisted on accept only). The home high line is split into `.hs-local` (local high) + `.hs-world` (global `World <score>` fragment); the live `arcade-high-score` handler updates `.hs-local` only. `.home-card-high` is pinned single-line so the fragment can never add card height (home no-scroll geometry).
- **Home tops are throttled, mode-gated, silent-on-fail.** `HomeScreen` issues one `fetchTops()` (`game=all`) per home visit when enabled, gated on `data-mode==='home'` and throttled ≥60 s (test override `window.__ARCADE_LB_TOPS_TTL__`). Fetch failure is silent (no fragment, no `console.error`). The game-over top list fetches on panel open (`fetchTop`, TOP 10 fine-pointer / TOP 5 coarse) and refreshes after an improved accept.
- **Render server data via `textContent` only** — list names/scores and World scores — never innerHTML.
- **Panel is DOM, never canvas.** `LeaderboardPanel` is an absolutely-positioned overlay inside `.game-root` (no page scroll; no pixel-signature impact — never draw leaderboard content into scenes); both themes via tokens; ≥44 px targets; reduced-motion via the global block; the name `<input>` participates in `InputManager`'s focused-control exemption and blurs on submit.
- **Tests: flag-off zero-network, flag-on mocked.** e2e forces the flag with `window.__ARCADE_LB_FORCE__` + `page.route` mocks; **never hit the real API in CI**. Error-path specs (429/offline/abort) deliberately skip console-cleanliness (Chromium logs failed HTTP as console errors). Neon Serpent (portal snake, never auto-dies with no input) hosts synthetic `arcade-game-over` dispatches; Bounce Circuit (auto-dies fast, positive score) exercises the real scene→event→panel path.
