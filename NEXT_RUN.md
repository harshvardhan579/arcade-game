# Next Run

## Last iteration (2026-07-04, iteration 4)

**Slice: Phase 2 — high-score persistence wired into real gameplay. Phase 2 complete.**

- `src/core/ScoreManager.ts`: refitted as a persistence observer — `record(score)` persists the max to `pocket-arcade:<gameId>:high` with an in-memory cache (no per-frame localStorage reads). Removed the unused streak/multiplier `add()` path, which would have double-scored logic points; combo/multiplier display belongs in logic truth when Phase 5 needs it.
- `src/games/BaseGameScene.ts`: creates a `ScoreManager` per scene key in `create()`, calls `record(latest.score)` every update, and publishes `highScore` in both the live bridge `getState()` and `updateBridgeSnapshot`. HUD now shows `Score X  High Y  Tick Z`.
- `tests/highscore.spec.ts`: new e2e spec — (1) fresh storage → `highScore` 0; seeded 777 → survives reload and Restart; (2) desktop-only: real Lane Rush play scores a deterministic near-miss (seed 12's first car spawns lane 0 vs player lane 1) and the value lands in the bridge and localStorage. Setup clears `pocket-arcade:*` keys for isolation.

**Validation:** build + tsc ✓, 31 vitest ✓, lint ✓, Playwright 7 passed / 3 intentionally skipped ✓. Nothing failing.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phase 1 ✅ (`73ca32c`, `e6f659b`, `b8d1056`) · Phase 2 ✅ (this commit)
- **Phase 3 ⬜ (next):** AudioEngine lifecycle. Phases 4–7 not started.

## Notable observation for Phase 5

`BaseGameScene.renderState` sets the HUD **after** calling `draw()`, so the per-game HUD strings set inside `StarCourierScene`/`LaneRushScene`/`CircuitStackScene.draw()` (Wave/Pool, Speed, Cells/Next) are overwritten every frame and never visible — dead code today. Fold per-game HUD info into a proper HUD design during Phase 5 (scoring clarity).

## Next highest-leverage task

**Phase 3 — AudioEngine lifecycle fix.** `src/core/AudioEngine.ts` + `src/games/BaseGameScene.ts:15` (`private readonly audio = new AudioEngine()`): every scene instance owns an AudioEngine, and `attachUnlockListeners()` (called in every `create()`) adds three window listeners that are only removed if unlock fires — scene switches accumulate listeners and can create multiple AudioContexts. Preferred fix: convert AudioEngine to a module-level singleton (`export const audioEngine`) with idempotent `attachUnlockListeners()` (attach once), or remove listeners on scene SHUTDOWN. Keep import boundary intact (`AudioEngine` name is a restricted token for `*Logic.ts`/`*.test.ts` — scenes are fine). Verify: no `console.error` in e2e; add a Playwright assertion that switching through all five games doesn't throw and (via a counter or singleton check) doesn't stack unlock listeners; do not assert audio output.
