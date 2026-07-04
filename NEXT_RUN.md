# Next Run

## Last iteration (2026-07-04, iteration 8)

**Slice: Phase 5.2 — Star Courier feel pass + shared effects helper.**

- `src/games/effects.ts` (new, scene-side): shared spark texture (generated once, keyed `fx-spark`), `createSparkEmitter` (auto-destroys on scene SHUTDOWN), `smallShake`, `deathFeedback` (shake + red flash). Added to the ESLint Phaser allowlist explicitly (`eslint.config.js`) — a narrow presentation-layer extension; the logic import-boundary guard is untouched.
- `src/games/neon-serpent/NeonSerpentScene.ts`: refactored onto the helper, behavior unchanged.
- `src/games/star-courier/StarCourierScene.ts`: kill explosions at the destroyed enemy's true position (diffs the previous frame's enemy list against survivors), small shake on score, muzzle sparks when a projectile spawns, death shake + flash, and a drifting procedural starfield replacing the static hash lines (drift frozen under reduced motion). All effects `reducedMotion`-gated.
- `tests/games.spec.ts`: new deterministic Star Courier run — first enemy (seed 9) spawns in column 2 at tick 31; player moves there, fires until the kill scores 15 (exercising the explosion path), then an unchecked enemy crosses the bottom for game over; Space restarts; zero console errors. Runs ~9s.

**Validation:** build + tsc ✓, 31 vitest ✓, lint ✓ (after adding effects.ts to the Phaser allowlist — first run correctly flagged it), e2e 16 passed / 12 intentionally skipped ✓.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–4 ✅ · Phase 5 in progress: Neon Serpent ✅ (`aca742c`), Star Courier ✅ (this commit)
- **Phase 5 remaining:** Lane Rush, Circuit Stack, Bounce Circuit. Phases 6–7 not started.

## Design gap noticed (fairness, Phase 5 logic candidate)

Star Courier has **no player–enemy collision** — enemies only end the run by crossing the bottom (`y > 11.5`). The ship is a ghost. Consider adding logic-side collision (enemy within ~0.8 of playerX at y ≥ 10.5 → game over) with a logic test, in a Star Courier follow-up or a dedicated fairness slice.

## Next highest-leverage task

**Phase 5.3 — Lane Rush feel pass.** Reuse `effects.ts`: near-miss spark + tiny shake when score jumps (the scored car is identifiable — `scored` flips true in the traffic array), crash feedback (`deathFeedback`) on game over, speed sensation via dashed lane lines scrolling with `state.speed` (drift frozen under reduced motion), subtle player-car bob. Transition detection pattern as in Star Courier (`lastScore`/`lastGameOver` + previous traffic array). Validation: existing lane-rush e2e already reaches scoring deterministically (near-miss at ~3.4s, seed 12) and the highscore spec covers it too; add crash-path coverage if cheap (a seed-12 car eventually spawns in the player's lane — check whether waiting for `isGameOver` with the player parked in lane 1 stays under ~15s before writing the test). Then Circuit Stack (lock thump + row-clear flash), then Bounce Circuit (jump/land squash + win celebration).
