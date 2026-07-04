# Next Run

## Last iteration (2026-07-04, iteration 3)

**Slice: Phase 1 — Circuit Stack truth/render fix. Phase 1 complete.**

- `src/games/circuit-stack/CircuitStackLogic.ts`: `getState()` now exposes `pieceCells` — the falling piece's four absolute grid cells (anchor + rotated offsets), fresh per call.
- `src/games/circuit-stack/CircuitStackScene.ts`: draws the real piece cells (magenta squares, rotation visible) instead of a single circle at the anchor; cells above the top edge (y < 0) are clipped. Grid rendering already read logic truth directly.
- `src/games/circuit-stack/CircuitStackLogic.test.ts`: 3 new contract tests — four in-bounds cells anchored to `pieceX/pieceY` that shift with LEFT; rotation transforms exposed cells exactly by the (x,y)→(−y,x) rule around the anchor including wall-kick; snapshot JSON-serializable and detached.

**Validation:** `npx vitest run src/games/circuit-stack` 6/6 ✓; full `npm run validate` ✓ (build + tsc, 31 vitest tests, eslint + import boundary + prettier, Playwright 4 passed / 2 intentionally skipped). Nothing failing.

**Bundle baseline:** dist/assets/index-\*.js ~1,220 kB raw / ~326 kB gzip (single chunk; known Phase 7 debt, unchanged).

## Phase status

- Phase 1 ✅ complete: Star Courier (`73ca32c`), Lane Rush (`e6f659b`), Circuit Stack (this commit).
- **Phase 2 ⬜ (next):** high-score persistence. Phases 3–7 not started.

## Next highest-leverage task

**Phase 2 — Wire high-score persistence into real gameplay.** `src/core/ScoreManager.ts` (SafeStorage-backed, key `pocket-arcade:<gameId>:high`) is implemented but imported by nothing. Plan: instantiate it per game in `BaseGameScene` (scenes may touch storage; logic may not — import boundary), sync it from logic score changes (`update()` already diffs before/after scores), expose `highScore` in the bridge snapshot and HUD, and surface it in the shell (GameSelector cards or stage header). Add a Playwright test: play/score (or seed localStorage), reload, assert the persisted high score appears in the bridge snapshot and UI; clear `pocket-arcade:*` keys in test setup so runs stay isolated. Note `ScoreManager.add()` applies a streak multiplier — for plain persistence of logic scores, use a simpler "observe and persist max" path rather than `add()`, or adapt ScoreManager; do not double-score.
