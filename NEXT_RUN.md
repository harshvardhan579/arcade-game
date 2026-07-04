# Next Run

## Last iteration (2026-07-04, iteration 5)

**Slice: Phase 3 — AudioEngine safe singleton. Phase 3 complete.**

- `src/core/AudioEngine.ts`: exported a module-level `audioEngine` singleton; `attachUnlockListeners()` is now idempotent (guards on already-attached or already-unlocked), so repeated scene `create()` calls cannot stack window listeners or spawn extra AudioContexts.
- `src/games/BaseGameScene.ts`: all scenes share the `audioEngine` singleton instead of constructing private engines.
- `src/main.ts`: `audio: { noAudio: true }` in the Phaser config — the app synthesizes all audio through its own engine, and Phaser's unused SoundManager was creating a second AudioContext.
- `tests/audio.spec.ts`: new e2e test instruments `window.addEventListener`/`removeEventListener` and wraps the `AudioContext` constructor, cycles all five games, then asserts unlock listener counts do not grow, at most one AudioContext exists, and no console errors fire. **Verified discriminating:** fails against the old per-scene-engine code (2+ contexts), passes with the fix.

**Validation:** build + tsc ✓, 31 vitest ✓, lint ✓, Playwright 8 passed / 4 intentionally skipped ✓. Nothing failing.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phase 1 ✅ (`73ca32c`, `e6f659b`, `b8d1056`) · Phase 2 ✅ (`6639c6d`) · Phase 3 ✅ (this commit)
- **Phase 4 ⬜ (next):** deep per-game Playwright interaction tests. Phases 5–7 not started.

## Notable observation for Phase 5

`BaseGameScene.renderState` sets the HUD **after** `draw()`, so per-game HUD strings set inside `StarCourierScene`/`LaneRushScene`/`CircuitStackScene.draw()` (Wave/Pool, Speed, Cells/Next) are overwritten every frame — dead code. Fold per-game HUD info into the HUD design during Phase 5.

## Next highest-leverage task

**Phase 4 — deep per-game interaction tests.** Every game needs at least one Playwright test beyond smoke: semantic input → observable bridge-state change, game-over reachable, restart resets. Suggested spec `tests/games.spec.ts`, driving input via keyboard (desktop project) after selecting each game:

- **Neon Serpent:** already partly covered in smoke (direction change, restart, snakeLength) — extend with game-over via wall/self collision if reachable deterministically, else skip.
- **Bounce Circuit:** UP jump changes playerY in bridge state; check win/game-over fields exposed (read BounceCircuitLogic first — not yet inspected by the loop).
- **Star Courier:** ACTION fires → `projectiles.length` grows in snapshot; LEFT/RIGHT clamp `playerX` to 0..10.
- **Lane Rush:** LEFT/RIGHT clamp `lane` to 0..2; traffic array populates within ~2s.
- **Circuit Stack:** UP rotates (pieceCells transform), DOWN soft-drops (`pieceY` increases), `occupied` grows after a lock.

Use `waitForFunction` on bridge state only, no fixed sleeps; keep each game's test under ~15s. Positions/cells are already exposed in snapshots from Phase 1 — assert render-contract truth (entities within world bounds) while at it.
