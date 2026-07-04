# Next Run

## Last iteration (2026-07-04, iteration 11)

**Slice: Phase 5.5 — Bounce Circuit feel pass. All five per-game feel passes complete.**

- `src/games/bounce-circuit/BounceCircuitScene.ts`: squash & stretch driven by real physics (`velocityY` sign stretches the body rising/falling; landing from `playerY > 0.4` triggers a 130 ms squash), key-pickup sparkle + small shake when `hasKey` flips, win celebration (spark burst at the door + teal camera flash + shake) when `phase` hits `won`, spike-death `deathFeedback`. All `reducedMotion`-gated, emitter cleaned up on SHUTDOWN.
- `tests/games.spec.ts`: full win-run e2e — probed the physics first (temporary logic test, deleted: jump at x ≥ 2.8, hold right while airborne until x ≥ 5, then walk right → win at step 36 with score 100). The e2e paces its steering loop one logic step per iteration (waits for `tick` to advance — the first version sampled ~12× per step and exhausted its budget mid-course), asserts `phase === 'won'`, score 100, `hasKey`, Space restart, zero console errors. Stable across `--repeat-each=2` (6.3 s each).

**Validation:** build + tsc ✓, 32 vitest ✓, lint ✓, e2e 18 passed / 14 intentionally skipped ✓.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–4 ✅ · Phase 5 per-game passes ✅: Neon Serpent (`aca742c`), Star Courier (`1d55ac6`), Lane Rush (`dfa8099`), Circuit Stack (`21b3883`), Bounce Circuit (this commit)
- **Next: the Star Courier fairness fix (below), then Phase 6 (UI shell), then Phase 7 (bundle/perf).**

## Next highest-leverage task

**Phase 5 wrap-up — Star Courier player–enemy collision (fairness, logic-side).** The ship is currently a ghost: enemies only end the run by crossing `y > 11.5`, so flying into an enemy does nothing — unfair/confusing feedback. In `StarCourierLogic.step()`, after moving enemies, end the run when an active enemy overlaps the ship (suggest `Math.abs(enemy.x - playerX) < 0.8 && enemy.y > 10.3` — the ship sits at y ≈ 10.5–11.5 in world units). Add deterministic logic tests: (1) enemy descending onto the player's column ends the game before it reaches 11.5; (2) an adjacent-column enemy does not. Scene needs no change (death feedback already keyed off `isGameOver`). Check the existing e2e still passes — the deep Star Courier test parks at x=2 after killing the column-2 enemy; later enemies may now collide with the player instead of crossing the bottom, which still ends the run (the test only waits for `isGameOver`), so it should hold; re-run to confirm. After this: **Phase 6 — UI shell** (arcade cabinet identity, game cards, instructions, leaderboard from the persisted high scores, settings, mobile controls polish; audit `src/ui/` + `src/style.css` + `index.html` first — consider the ux-polish-auditor agent if registered in the session).
