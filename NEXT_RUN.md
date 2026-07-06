# NEXT_RUN — Gameplay/Replayability Pass (branch `gameplay-replayability-pass-1`)

Loop: `.claude/gameplay-replayability-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                              | Status              |
| ----- | -------------------------------------------------- | ------------------- |
| 0     | Mobile rapid-tap zoom P0 (CSS/touch, no gameplay)  | done (`cedf11a`)    |
| 1     | Runtime seed variation, deterministic tests intact | **done** (this run) |
| 2     | Bounce Circuit: jump tuning, double jump, variety  | next                |
| 3     | Star Courier: movement/aiming feel                 | pending             |
| 4     | Lane Rush: pseudo-3D + double-tap boost            | pending             |
| 5     | Circuit Stack: live 7-bag variation                | pending             |
| 6     | Validation + docs close-out                        | pending             |

## Phase 1 (this run) — what changed

**Live runs now vary; tests force exact seeds; logic untouched.**

- **`src/core/RunSeeds.ts` (new):** `nextRunSeed(gameId)` returns a forced seed when one
  is set, else a fresh non-zero 32-bit seed from a pure mixer (`mixSeed`, exported for
  unit tests) over `Date.now()` + `performance.now()` + a monotonic counter (the counter
  keeps same-millisecond restarts distinct). Forcing hooks: per-game map
  `window.__ARCADE_FIXED_SEEDS__` (primary, set via Playwright `addInitScript`) and a
  `?seed=N` URL param that forces every game (manual debugging; code-reviewed, not
  e2e-covered — the map path shares the same code and is e2e-proven).
- **`src/games/BaseGameScene.ts`:** the scene owns the run seed via `startNewRun()`
  (draw seed → `logic.restart(seed)`), called from all three run boundaries: scene
  `create()`, the Restart button (`arcade-restart`), and **ACTION-after-game-over**
  (intercepted in `onInput` before delegating — the logic-internal ACTION-restart would
  replay its fixed default seed; it remains as a pure-logic fallback). `runSeed` is
  published through the bridge snapshot alongside `highScore`.
- **Deliberate behavior change:** switching away from a game and back now starts a
  fresh run instead of resuming the frozen old one (scene `create()` reseeds). This
  also makes the switching pixel spec _more_ stable (counts always run against tick-0
  state, never a mid-run/game-over dim overlay).
- **`src/games/*Logic.ts`: zero changes.** No RNG draws added/reordered anywhere.
- **Seeded e2e migrated in this same slice (forced to the historical defaults
  7/11/9/12/14, so every pinned outcome stays bit-identical):** `games.spec.ts`,
  `shell.spec.ts`, `highscore.spec.ts` set `__ARCADE_FIXED_SEEDS__` in `beforeEach`.
  `smoke.spec.ts`, `switching.spec.ts`, `audio.spec.ts` stay **unforced** on purpose —
  they prove the live path (their assertions are seed-agnostic).
- **`src/ui/CaseStudyPanel.ts`:** test-count copy refreshed 54 → 57.

## New tests

- **Vitest (`src/core/RunSeeds.test.ts`, +3, boundary-clean):** mixer determinism;
  non-zero unsigned 32-bit output for degenerate inputs; 500 distinct seeds across
  consecutive counters under a frozen clock.
- **E2e, fail-first verified (red pre-change with `runSeed: undefined`):**
  - `games.spec.ts` "forced seeds reproduce the identical run across restarts" —
    forced Circuit Stack reports `runSeed` 14 before and after Restart and redeals the
    same `nextPiece`.
  - `smoke.spec.ts` "live runs draw a fresh seed per restart so runs vary" (both
    projects, unforced) — bridge exposes a numeric `runSeed` and Restart draws a
    different one.

## Validation (all green)

- Fail-first: all three new e2e red against pre-change code (`runSeed` undefined).
- Full Playwright, both projects: **33 passed / 27 intentionally skipped** (was 30/26;
  +2 live-variation passes, +1 forced-reproducibility pass, +1 mobile skip). All
  seeded pins (seed-9 opener, seed-12 crash, seed-11 course, seed-14 bag) held
  without modification.
- Full `npm run validate`: build + strict tsc, **57 Vitest**, ESLint + import boundary
  (11 files) + Prettier, Playwright 33/27.

## Notes / carry-forwards

- Phase 6 should fold the run-seed invariant into `CLAUDE.md`'s architecture notes
  (e2e that pins seeded outcomes must force seeds via `__ARCADE_FIXED_SEEDS__`) and
  re-check `CURRENT_APP_STATE.md` §3/§7 (bridge now carries `runSeed`; switch-back
  restarts fresh; replayability "fixed constants" note is stale).
- Real-device QA from Phase 0 still outstanding (rapid-tap zoom list in git history of
  this file, commit `cedf11a`); add "restart twice → visibly different food/traffic"
  to that phone pass as a live-variation smoke check.

## Next task (Phase 2 — start cold from the loop file)

Bounce Circuit tuning: lower first-jump impulse (tallest 2.5-unit platform must stay
reachable — prove by logic test), add double jump (smaller second impulse, air-once,
reset on land, buffer/coyote precedence pinned), widen orb pickup/placement, add
distance-weighted chunk variety. **Chunk changes shift the seed-11 draw sequence** —
re-probe and deliberately update Bounce vitest pins and the e2e unguided-death
expectations in the same slice. Full detail in `.claude/gameplay-replayability-loop.md`
Phase 2.
