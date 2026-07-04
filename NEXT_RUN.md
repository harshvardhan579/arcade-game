# Next Run

## Last iteration (2026-07-04)

**Slice: Phase 1 — Star Courier truth/render fix.**

- `src/core/types.ts`: widened `GameSnapshot` index signature to a recursive JSON-serializable `SnapshotValue` (numbers/strings/booleans plus readonly arrays/objects) so snapshots can carry entity positions.
- `src/games/star-courier/StarCourierLogic.ts`: `getState()` now exposes `projectiles` and `enemies` as fresh position arrays (`{x, y}` of active pool entries); counts are derived from them.
- `src/games/star-courier/StarCourierScene.ts`: draws player, projectiles, and enemies from real logic positions via a shared world→pixel mapping (x lanes 0–10 centered, y 0–11.5 with 11.5 = player line) instead of count-based synthetic layouts.
- `src/games/star-courier/StarCourierLogic.test.ts`: 3 new contract tests — projectile spawns at player column/y=9 and travels up; enemies spawn in bounds and descend deterministically; snapshot is JSON-serializable and detached from internal pools.

**Validation:** `npx vitest run src/games/star-courier` 6/6 ✓; full `npm run validate` ✓ (build + tsc, 25 vitest tests, eslint + import boundary + prettier, Playwright 4 passed / 2 intentionally skipped). Nothing failing.

**Bundle baseline:** dist/assets/index-*.js 1,220.31 kB raw / 326.46 kB gzip (single chunk; known Phase 7 debt).

## Phase status

- Phase 1: Star Courier ✅ · **Lane Rush ⬜ (next)** · Circuit Stack ⬜
- Phases 2–7: not started.

## Next highest-leverage task

**Phase 1 — Lane Rush truth/render fix.** `LaneRushScene.draw` renders `state.trafficCount` cars at synthetic positions `((i%3)+0.5)*laneWidth, 120+i*86`. Check `LaneRushLogic.ts` for the real traffic pool (lane + y per car), expose it in the snapshot as a position array (pattern now established in `StarCourierState` / `SnapshotValue`), render from it, and add contract tests mirroring the Star Courier ones (spawn in a valid lane, descend/advance deterministically, snapshot serializable + detached). After Lane Rush: Circuit Stack (piece is drawn as a single circle at `pieceX/pieceY`; must render the actual piece cells/rotation from logic truth).
