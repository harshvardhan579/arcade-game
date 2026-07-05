# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase A)

**Slice: P0 game-switching bug — diagnosed, fixed, regression-tested.**

**Root cause:** `startGame` in `src/main.ts` used `game.scene.start(key)`. Phaser's `SceneManager.start` (unlike the in-scene `ScenePlugin.start`) does **not** stop the running scene, so every selection stacked another live scene: all previously selected games kept updating, listening to input, and rendering. Scenes render in scene-list order (`NeonSerpent → … → CircuitStack`), so switching "forward" looked correct, but Circuit Stack — last in the list — painted on top of everything once started, making every switch away from it invisible. The controls hint (DOM) and the TestBridge (re-published by each new scene's `create`) both tracked the _new_ game, which is why the UI changed, the canvas didn't, and every bridge/DOM-based test passed.

**Fix (`src/main.ts`):** track `currentSceneKey`; `startGame` now stops the outgoing scene before starting the target and early-returns when the selected game is already active (keeps Phaser's op queue ordered under rapid clicks). Scene shutdown paths were already clean (window listeners and particle emitters detach on SHUTDOWN), so stop/start cycles leak nothing — confirmed by the existing audio/listener instrumentation test.

**Regression test (`tests/switching.spec.ts`):** bridge/DOM assertions cannot catch this bug class, so the test reads actual canvas pixels (`getImageData`; renderer is `Phaser.CANVAS`) using empirically probed per-game color signatures — Lane Rush road fill > 200k px, Bounce Circuit ground strip, Star Courier ship cyan in the bottom-center region, Neon Serpent food magenta, Circuit Stack grid-stroke count for presence/absence. It walks forward through all five games, then from Circuit Stack out to each other game and back, asserting activeScene, the instructions hint, AND the rendered canvas each time. **Verified discriminating:** fails on the pre-fix code with "circuit-stack grid must be gone while neon-serpent plays"; passes with the fix.

**Validation:** build + tsc ✓, 34 vitest ✓, lint ✓, e2e 22 passed / 18 intentionally skipped ✓ (existing suites unaffected: clicking the already-active card is now a no-op instead of a redundant scene restart; no test relied on that restart).

## Playtest phase status

- **Phase A ✅ (this commit):** switching fixed + pixel-level regression test.
- Phase B ⬜ Circuit Stack piece completeness (audit found only 3 shapes: O, T, J-like — no I/line piece; `circuitPieces` in `CircuitStackLogic.ts`, plus rotation/kick and the preview box will need to handle 4-wide I).
- Phase C ⬜ Neon Serpent speed ramp audit (`speedMs = max(68, 145 − foodsEaten*5)` — intentional; assess fairness, surface it in UI).
- Phase D ⬜ Bounce Circuit redesign (biggest slice: horizontal progression, scrolling/parallax, camera/world movement, hazards, pickups, jump feel).
- Phase E ⬜ Star Courier hazards/readability.
- Phase F ⬜ Lane Rush visual overhaul.
- Phase G ⬜ Arcade-wide cohesive graphics polish.
- Phase H ⬜ Full validation + docs.

## Next task

**Phase B — Circuit Stack piece set.** Add the full standard 7-piece tetromino set (I, O, T, S, Z, J, L) to `circuitPieces` with sensible rotation offsets, switch spawning to a seeded 7-bag randomizer (deterministic via `SeededRandom` — shuffle per bag), verify wall kicks still work for the 4-wide I piece near edges, and confirm the scene's next-piece preview box fits the I shape. Logic tests: all 7 pieces appear within two bags for a fixed seed; each bag contains each piece exactly once; I-piece spawn/rotation stays in bounds. Keep existing tests green (they reference piece indices only through state, but the spawn-blocked test seeds `grid[0][3..4]` — verify it still blocks whichever piece a seed spawns, or pin the seed/piece accordingly).
