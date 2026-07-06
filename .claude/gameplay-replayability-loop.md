# Pocket Arcade — Gameplay & Replayability Loop (pass 1)

You are executing a focused gameplay pass on branch `gameplay-replayability-pass-1`
(branched from `main` after the mobile UI pass merged in `feea895`). Read `CLAUDE.md` first
and obey every hard rule there. Read `CURRENT_APP_STATE.md` for the ground-truth system
map and `RESEARCH_BACKLOG.md` for design intent before touching a phase's area.

**Mission:** fix the next set of real playtest issues — rapid-tap zoom on phones,
same-every-run predictability, Bounce Circuit's floaty repetitive jumping, Star Courier's
stiff movement, Lane Rush's flat boring presentation, and Circuit Stack's fixed piece
order — without breaking the deterministic-seed test architecture.

## Execution contract

- **One phase per invocation.** Orient, execute the next incomplete phase, verify, commit,
  update `NEXT_RUN.md`, then **stop with a summary**. Do not start the next phase unless
  the user explicitly says to continue.
- Phases run in strict order 0 → 6. `NEXT_RUN.md` records which phases are done. If it
  documents a broken state, fixing that **is** the current slice.
- For every phase: (1) inspect before editing, (2) make the smallest coherent change,
  (3) run targeted tests, (4) run affected Playwright specs (both projects when shell/input
  is touched), (5) run full `npm run validate` for shared/input/gameplay changes,
  (6) commit only if green, (7) update `NEXT_RUN.md`, (8) stop.
- First invocation housekeeping: commit `.claude/gameplay-replayability-loop.md`,
  `CURRENT_APP_STATE.md`, and `RESEARCH_BACKLOG.md` (currently untracked) as an opening
  `docs:` commit before Phase 0 work.

## Global guardrails (verified against the current source)

1. **Seed architecture is sacred.** Logic stays deterministic for a given seed; all
   gameplay randomness flows through `SeededRandom` (`src/core/types.ts`). No
   `Math.random`, `Date`, or entropy of any kind inside `src/games/*Logic.ts`. Live-run
   variation is produced by _choosing different seeds at the app/scene boundary_
   (Phase 1), never by making logic nondeterministic.
2. **RNG draw discipline.** Deterministic tests depend on the _order and count_ of
   `SeededRandom` draws. Pinned outcomes that exist today:
   - Star Courier seed 9: first enemy spawns in column 2 (e2e `games.spec.ts` navigates
     3×LEFT from x=5 and shoots it). Vitest leans on seeds 1/2/3/4/5/9.
   - Lane Rush seed 12: parked player near-misses then crashes (~tick 102; e2e
     `games.spec.ts` + the mobile game-over test in `shell.spec.ts` wait on it).
   - Bounce Circuit seed 11: terrain for the e2e unguided-death run (banks ≥ 28 within
     15 s). Vitest uses seeds 9/11/12.
   - Circuit Stack seed 14 (runtime default) and vitest seeds 21/9/1/2/5/6/7/3 pin 7-bag
     orders. Neon Serpent seed 7 default; vitest seeds 1/2/3; the e2e obstacle at (4,6)
     is hardcoded in `restart()`, not seeded.
   - If a phase must add/reorder draws (e.g. new Bounce chunk types), re-probe and update
     every dependent pinned value **deliberately in the same slice** and say so in the
     commit message. Prefer deriving cosmetic variety from stable data
     (`spawnTick % 3` pattern) over new draws.
3. **Import boundary** (`scripts/import-boundary.mjs`) checks every `*Logic.ts` and every
   `*.test.ts` under `src/` for: phaser imports, `\bwindow\b`, `\bdocument\b`,
   `\blocalStorage\b`, `AudioEngine`. The word-boundary regexes match **comments too** —
   do not write the word "window" in logic files (say "interval"/"grace period" for the
   boost double-tap timing) and keep any new `src/**/*.test.ts` free of those words.
   Never weaken the guard.
4. **Pixel-signature contract** (`tests/switching.spec.ts`, desktop project): Lane Rush
   road `#0d252b` dominant (> 200k px), Bounce ground strip `#12353c`, Circuit grid
   `#31545a`, Neon food magenta bounded 50..3000, Star ship cyan bottom-center — and the
   Star check also asserts `< 100k` road pixels. Any scene restyle (Phase 4 especially)
   must keep signatures or update the spec deliberately and re-run it. Never delete a
   signature check.
5. **Protected DOM/test hooks:** `.touch-controls`, `[data-arcade-input]`,
   `.mobile-game-select`, `Choose game` aria-label, `.controls-hint` (+ the exact per-game
   hint strings in `main.ts` asserted by shell/switching specs), `.game-card`,
   `.card-high`, `#game-root canvas`, Restart's accessible name, single `h1`.
6. **Layout contracts stay green:** desktop no-scroll at four laptop viewports; mobile
   no-overlap/no-scroll at six portrait geometries with `.arcade-shell` `min-height: 0`;
   coarse-pointer landscape playability at three sizes. Run **both** Playwright projects
   after any shell/CSS/input change.
7. **Zero assets, reduced motion, audio discipline:** no files/webfonts/images; new
   effects gate on `this.reducedMotion`; keep one AudioContext and self-removing unlock
   listeners (`tests/audio.spec.ts` counts them).
8. **Never weaken a test.** Updating a pinned seeded value because the slice deliberately
   changed tuning is allowed (state it in the commit); deleting/loosening an assertion to
   get green is not. New regressions should be fail-first verified where cheap.
9. **Scenes render truth.** Gameplay-affecting values (jump velocities, boost timers,
   speed caps, move rates) live in `*Logic.ts` with exported constants and tests; scenes
   only draw and add presentation feel.

---

## Phase 0 — Mobile rapid-tap zoom (P0, no gameplay changes)

Real-phone QA: pressing buttons quickly can still zoom the page and ruin gameplay.

**Current protections (inventory before editing, `src/style.css` / `index.html` /
`src/ui/TouchControls.ts`):** `touch-action: manipulation` on `.restart-button,
.mobile-game-select, .game-card`; `touch-action: none` on `.game-root` and
`.touch-controls`; `-webkit-tap-highlight-color: transparent` on button/select; d-pad
`preventDefault` on pointerdown + `user-select: none`; viewport meta is
`width=device-width, initial-scale=1.0, viewport-fit=cover`.

**Gap hypothesis to investigate first:** iOS Safari double-tap-zoom triggers on any
surface whose computed `touch-action` still allows it — the shell background/padding,
`.topbar`, `h1`, `.controls-hint`, the `.mobile-game-picker` label text, and grid gaps.
Rapid taps that land a few px off a button hit those surfaces. Fast alternating taps can
also register as a double-tap on a common ancestor.

**Fix order (CSS first):**

1. Broaden `touch-action: manipulation` to the whole page (`html`/`body`/`.arcade-shell`)
   — the page never scrolls on mobile, and `manipulation` still permits pinch-zoom, so
   accessibility is preserved. Scope globally or to coarse-pointer blocks; either way
   verify desktop suites unmodified.
2. Verify by computed style that every surface in the mobile/coarse blocks resolves to
   `manipulation` or `none`.
3. **Only if real-device QA still zooms:** add `maximum-scale=1` to the viewport meta,
   with a written justification in `NEXT_RUN.md` (iOS Safari ignores it for pinch — pinch
   stays available — but it suppresses double-tap zoom; Android disables pinch unless the
   user forces zoom in accessibility settings — that trade-off must be documented).
   Do not add `user-scalable=no`.

**Regression:** add a mobile-project assertion in `tests/shell.spec.ts` pinning computed
`touch-action` on the shell/topbar/body (honest scope: computed style, since headless
cannot reproduce iOS double-tap zoom). Record the ~2-minute real-device QA script (rapid
d-pad mashing, rapid Restart double-taps, fast alternating ←/→) in `NEXT_RUN.md`.

---

## Phase 1 — Runtime seed variation without breaking deterministic tests

Live runs should differ; tests must be able to force any seed; logic stays deterministic.

**Design (own the seed at the scene/app boundary):**

- New small module in `src/core/` (e.g. `RunSeeds.ts`): `nextRunSeed(): number` returns a
  non-zero 32-bit seed mixed from `Date.now()`, `performance.now()`, and a monotonic
  counter (counter guarantees restart-to-restart distinctness). It honors a test
  override: if a documented global (e.g. `window.__ARCADE_FIXED_SEED__`, set via
  Playwright `addInitScript`) or a `?seed=N` URL param is present, **every** run —
  initial, restart, and switch — uses that seed. Keep the mixing function pure and
  export it separately so its unit test needs no `window` reference (boundary rule 3).
- `BaseGameScene` owns `runSeed`: `create()` draws a fresh seed and calls
  `this.logic.restart(runSeed)` (note: this deliberately changes switch-away-and-back
  from "resume old run" to "fresh run" — document it); the `arcade-restart` handler
  reseeds; and the ACTION-while-game-over path must reseed too. Today
  `logic.handleInput('ACTION')` self-restarts with the logic's _default_ seed — the
  scene must intercept that transition (e.g. detect `before.isGameOver && input ===
'ACTION'` in `onInput` and restart with a fresh seed itself). Keep the logic-internal
  fallback for pure-logic use; make sure audio cues don't double-fire.
- Publish `runSeed` through the bridge snapshot (next to `highScore` in
  `BaseGameScene`) so e2e can assert both forcing and variation.

**Mandatory same-slice e2e migration:** every spec that waits on seeded gameplay must
force the historical default seeds so behavior is bit-identical to today: `games.spec.ts`
(Neon 7, Bounce 11, Star 9, Lane 12, Circuit 14), the Lane Rush waits in
`highscore.spec.ts` and `shell.spec.ts` (12). Seed-agnostic specs (audio, switching
signatures, layout) should run unforced to prove the app works in live mode.

**New tests:** vitest — mixer is deterministic for injected inputs, non-zero, and distinct
across counter increments; existing logic suites untouched and green (they call
`restart(seed)` directly). E2e — (a) forced: fixed seed + two restarts → same `runSeed`
and an identical seeded observable (e.g. Neon `foodX/foodY` after restart);
(b) live: two restarts → different `runSeed`s.

**Do not** change any RNG consumption inside logic files in this phase.

---

## Phase 2 — Bounce Circuit: controllable jump, double jump, collectible orbs, variety

Current tuning (all exported from `BounceCircuitLogic.ts`): `runnerJumpVelocity = 5.2`,
gravity `0.5`/step, integration `vy * 0.15`, coyote 4, buffer 5, speed
`0.22 → 0.42` by distance. Platform heights generated at 1.7 / 2.1 / 2.5 units.

- **Jump height:** lower the first-jump impulse (and/or tune gravity) so a single tap is
  more controllable. **Constraint:** the tallest platform (2.5 units) must remain
  reachable — by first jump alone or by first+double — proven with a logic test that
  actually lands on a 2.5 platform.
- **Double jump:** first press = normal jump; a second press while airborne (and not
  already used) = smaller impulse (new exported constant); resets on landing; coyote
  jump counts as the first jump; the jump **buffer** keeps working for presses near the
  ground — decide precedence (airborne + double available → double jump now; otherwise
  buffer) and pin it with tests.
- **Orbs:** more collectible — widen the pickup window (currently 0.55 x / 0.75 y) and/or
  place arcs along the _actual_ new jump parabola (compute from the new constants), or a
  small magnet radius. Logic-only.
- **Chunk variety + progression:** add a small number of new chunk archetypes and
  distance-weighted selection so later terrain is harder, keeping the
  no-two-spike-chunks-in-a-row fairness rule readable. **This changes the seed-11 draw
  sequence** — re-probe and deliberately update the Bounce vitest pins and the e2e
  unguided-death expectations (score floor, timeout) in the same slice.
- **Tests:** vitest for normal jump vs double jump impulses, double-jump
  availability/reset, third-press-in-air ignored, orb pickup at the new window, chunk
  generation bounds/variety, per-seed determinism; e2e jump-feel + death/restart re-run;
  fixed-seed reproducibility + live variation via the Phase 1 hook.
- Scene: keep the `#12353c` ground-strip signature intact; any new chunk visuals must
  stay readable at mobile canvas sizes.

---

## Phase 3 — Star Courier: movement and aiming feel

Complaint: 11 columns × 1-column-per-press means hammering ←/→ to reach enemies.
Constraint: the semantic-input layer has **no key-release events**, so "hold" only exists
as repeats (OS key repeat on desktop; `TouchControls` repeat = 300 ms delay / 90 ms
interval — shared constants).

**Candidate levers (pick the smallest coherent set, justify in `NEXT_RUN.md`):**

- Logic glide: presses set an integer target column; `step()` moves `playerX` toward it
  at a brisk deterministic rate — rapid presses stack targets so traversal is fast and
  aiming stays column-precise. Fired projectiles should stay kill-capable from a
  fractional x (hit window is |dx| < 0.65; consider firing from the nearest column).
- Scene-side visual interpolation/banking toward logic truth (presentation only).
- Tighter d-pad repeat (e.g. 300→~180 ms delay) in `TouchControls` — a **global** input
  change: re-run the pressed/repeat spec and the tap-emits-exactly-one assertions, both
  projects, plus a sanity pass on the other four games.
- Do **not** turn it into bullet hell; keep pools (8/10/4), spawn cadence, wave scaling,
  and enemy readability.

**Test impact:** movement changes consume no RNG, so seed-9 spawns are safe — but
`games.spec.ts` pins position-after-presses (3×LEFT → x 2; 8×LEFT → x 0). If semantics
become target/glide, update those assertions deliberately (wait for arrival instead of
asserting instant position). Vitest: traversal time to cross N columns, edge clamps,
projectile-column alignment/kill feasibility, per-seed determinism, live vs fixed seed.

---

## Phase 4 — Lane Rush: pseudo-3D redesign + ACTION double-tap boost

**Logic (keep three lanes and the y-progression model):**

- **Speed cap:** current `0.18 + tick/2400` is unbounded — add an exported cap/plateau.
- **Boost:** two ACTION presses within a short tick interval (while alive) trigger a
  temporary speed boost with a cooldown; expose `boostTicksLeft` / `boostCooldownLeft`
  (or similar) in the snapshot for tests + HUD; ACTION while dead still restarts
  (game-over branch stays first). Timing is tick-based (`handleInput` has no clock).
  Reminder: never write the word "window" in this file's comments (guardrail 3).
- **No new RNG draws** (boost/cap are arithmetic). But any speed-curve change shifts the
  seed-12 parked-crash timing — re-probe and update the dependent e2e waits/pins
  (`games.spec.ts`, `shell.spec.ts` mobile game-over, `highscore.spec.ts`) deliberately.
- No fourth lane. Near-miss bands may be exposed (e.g. a `nearMissWindow` flag/zone) if
  it helps legibility tests.

**Scene (full pseudo-3D rewrite of `LaneRushScene.draw`):** horizon + sky band, trapezoid
road converging to a vanishing point, perspective mapping y→(screenY, scale) so cars/
markers/posts scale with depth, depth-scaled dashes, speed lines, a **legible near-miss/
hit zone** at player depth, boost feedback (streaks/zoom-pulse/shake) and a crash that
reads — all decorative churn gated on `reducedMotion`.

- **Pixel-signature update is expected and must be deliberate:** the flat road fill
  currently satisfies `#0d252b > 200k px`, and the Star Courier check asserts `< 100k`
  road pixels. Keep the road surface an exact signature color (reuse `#0d252b` for the
  trapezoid if possible), re-measure real counts at the desktop canvas, update
  `tests/switching.spec.ts` thresholds, and re-run the spec. Never delete the check.

**Tests:** vitest — boost triggers only within the interval, respects cooldown, expires,
dead-ACTION restarts instead of boosting, speed cap holds on long runs, near-miss
scoring unchanged (or updated deliberately); e2e — smoke crash/restart with forced seed
12 still green, switching signatures updated + green, mobile overlay test green.

---

## Phase 5 — Circuit Stack: live run variation (verification-first)

- With Phase 1 in place, verify live restarts reseed the 7-bag: e2e in live mode —
  restart twice, assert `runSeed` differs (and optionally that the first few `nextPiece`
  values differ, with a tolerance/retry since orders can coincide).
- Fixed-seed 7-bag vitest pins (seeds 21/9/1/2/5/6/7/3 + runtime 14) stay green
  untouched.
- **Do not** add hold piece, T-spins, garbage, or a next-queue in this pass.
- Optional, only if the slice stays small and green: a gentle gravity curve (lock
  interval shrinking with lines cleared, floored) — track lines cleared in logic, export
  the curve constants, pin with vitest; gravity consumes no RNG so bag pins are safe.

---

## Phase 6 — Validation, documentation, close-out

- Full `npm run validate` (build + strict tsc, Vitest, ESLint + import boundary +
  Prettier, Playwright both projects).
- Input/timing changed in this pass → flake pass: repeat the input-sensitive suites
  (`shell`, `smoke`, `games`) with `--repeat-each=2` on both projects.
- Refresh `CURRENT_APP_STATE.md` (game-by-game sections, quality assessment) and
  `RESEARCH_BACKLOG.md` (mark shipped quick-wins) — only the stale parts.
- Overwrite `NEXT_RUN.md` with: what changed per phase (files + behavior), commands run
  and their results, the **real-device QA list** (rapid-tap zoom, double-jump feel,
  Star Courier movement feel, Lane Rush boost + pseudo-3D readability on a small
  screen), remaining concerns, and the recommended next pass.
- Stop with a clear summary and a merge recommendation.

## NEXT_RUN.md protocol (every phase)

Overwrite, keep short: phase status table (0–6), what changed this phase, exact commands
run + pass/fail (with output snippets on failure), any deliberately updated pinned
values (old → new, why), artifacts/screenshots paths, and the next task specific enough
to start cold. Never leave the repo red without documenting the failing commands and
suspected cause; revert the slice instead.
