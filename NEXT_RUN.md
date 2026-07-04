# Next Run

## Last iteration (2026-07-04, iteration 2)

**Slice: Phase 1 — Lane Rush truth/render fix.**

- `src/games/lane-rush/LaneRushLogic.ts`: `getState()` now exposes `traffic` as a fresh array of `{lane, y, scored}` per car; `trafficCount` derived from it.
- `src/games/lane-rush/LaneRushScene.ts`: draws each car at its real lane/y via a world→pixel mapping calibrated so a same-lane car visually overlaps the player rect exactly when the logic collision window (y ∈ 8.8–10.2, player center ≈ 9.6 → pixel `height - 66`) fires. Spawn y=-1 is offscreen top; removal y=12 exits through the bottom.
- `src/games/lane-rush/LaneRushLogic.test.ts`: 3 new contract tests — spawn appears in a valid lane just above the screen and advances by `speed` per step; identical seeds produce identical traffic snapshots; snapshot is JSON-serializable and detached.

**Validation:** `npx vitest run src/games/lane-rush` 6/6 ✓; full `npm run validate` ✓ (build + tsc, 28 vitest tests, eslint + import boundary + prettier, Playwright 4 passed / 2 intentionally skipped). Nothing failing.

**Bundle baseline:** dist/assets/index-\*.js ~1,220 kB raw / ~326 kB gzip (single chunk; known Phase 7 debt, unchanged).

## Phase status

- Phase 1: Star Courier ✅ (`73ca32c`) · Lane Rush ✅ · **Circuit Stack ⬜ (next)**
- Phases 2–7: not started.

## Next highest-leverage task

**Phase 1 — Circuit Stack truth/render fix.** `CircuitStackScene.draw` renders the falling piece as a single circle at `state.pieceX/pieceY` and reads `this.logic.grid` directly. Check `CircuitStackLogic.ts` for the actual piece shape/rotation cells; expose the piece's occupied cells (and ideally the grid) in the snapshot as serializable arrays (pattern established in `StarCourierState`/`LaneRushState` via `SnapshotValue`), render the real piece cells instead of a circle, and add contract tests (piece cells within grid bounds, rotation changes exposed cells deterministically, snapshot serializable + detached). That completes Phase 1; then Phase 2 (wire `ScoreManager` high scores into gameplay + bridge + HUD with a Playwright persistence test).
