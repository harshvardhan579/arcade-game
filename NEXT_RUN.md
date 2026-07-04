# Next Run

## Last iteration (2026-07-04, iteration 6)

**Slice: Phase 4 — deep per-game Playwright interaction tests. Phase 4 complete.**

- `tests/games.spec.ts` (desktop project; mobile skipped since the selector is hidden): one deep interaction test per game, all driven through keyboard → semantic input → bridge state, `waitForFunction` only, no fixed sleeps:
  - **Bounce Circuit:** jump rises and lands under gravity; walking right into the x=4 spike ends the run; ACTION (Space) restarts with `playerX` 1 and score 0.
  - **Star Courier:** ACTION fires (projectiles array populates); 8× LEFT clamps `playerX` at 0; active projectiles respect world bounds.
  - **Lane Rush:** lane clamps at 0 and 2; traffic array populates and every car has a valid lane and in-bounds y.
  - **Circuit Stack:** DOWN soft-drops (`pieceY` increases); UP rotates (piece-cell offsets change, wall-kick tolerated); dropping to the floor locks and `occupied` ≥ 4.
  - **Neon Serpent:** after Restart, heading UP wraps the head through the top portal (`headY` 12 → 23) without dying.

**Validation:** deep suite 5/5, stable across `--repeat-each=2` (10/10). Full chain: build + tsc ✓, 31 vitest ✓, lint ✓, e2e 13 passed / 9 skipped ✓ twice in a row.

**Watch item (flake):** one earlier full-suite run had a single failure in `[desktop] smoke › loads shell and Neon Serpent responds to keyboard`, not reproduced in two subsequent full runs or in isolation. Suspected cause: 4 parallel workers on one Vite dev server slowing first paint/RAF. If it recurs, capture `test-results/*/error-context.md` before re-running, and consider `fullyParallel: false` or a worker cap for the dev-server-bound suite.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phase 1 ✅ (`73ca32c`, `e6f659b`, `b8d1056`) · Phase 2 ✅ (`6639c6d`) · Phase 3 ✅ (`b68a57e`) · Phase 4 ✅ (this commit)
- **Phase 5 ⬜ (next):** game feel for every game. Phases 6–7 not started.

## Notable observation for Phase 5

`BaseGameScene.renderState` sets the HUD **after** `draw()`, so per-game HUD strings set inside `StarCourierScene`/`LaneRushScene`/`CircuitStackScene.draw()` (Wave/Pool, Speed, Cells/Next) are overwritten every frame — dead code. Fix as part of the first Phase 5 slice.

## Next highest-leverage task

**Phase 5 — game feel, one game per slice.** Start by running the `game-feel-director` agent on **Neon Serpent** (the flagship) for a prioritized feel spec, then implement: the HUD overwrite fix (surface multiplier/combo state), death/eat feedback (screen shake + procedural particles gated on `reducedMotion`), restart transition, and any logic-side feel mechanics (e.g. brief input-buffer or combo-decay visibility) with logic tests. Presentation-only changes are validated by the existing e2e suites (no console errors, bridge contract intact); gameplay-affecting changes need logic tests. Then repeat per game: Star Courier (hit explosions, hitstop), Lane Rush (near-miss flash, speed sensation), Circuit Stack (lock/clear effects), Bounce Circuit (jump/land squash).
