# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase C)

**Slice: Neon Serpent speed ramp — kept, gently retuned, and made visible.**

**Decision:** the ramp is intentional (it is the game's difficulty engine) and stays. Two changes, both conservative:

1. **Gentle retune** (`src/games/neon-serpent/NeonSerpentLogic.ts`): `speedMs = max(80, 144 − foods*4)` replacing `max(68, 145 − foods*5)`. Rationale: early game is effectively identical (144 vs 145 base, −4 vs −5 per food), but the old 68 ms floor ≈ 14.7 moves/s was twitch-limit fast and each late step was a growing relative spike (73→68 = 6.8% per food); the new floor is 80 ms ≈ 12.5 moves/s (1.8× total speed-up instead of 2.1×) with smaller relative steps (≤5%), reached at 16 foods instead of ~15. The curve now lives in exported constants (`serpentBaseSpeedMs`, `serpentFloorSpeedMs`, `serpentSpeedStepMs`, `serpentMaxSpeedLevel = 17`) — a one-line revert if playtesting disagrees.
2. **Surfacing:** the snapshot now exposes `speedLevel` (1..17, one level per food, derived exactly from `speedMs`); the HUD reads `Score … High … Len … x… Spd N` so every eat visibly ticks the level; the instructions hint becomes "Arrows steer · eating speeds up · Space restarts" (assertions updated in `tests/shell.spec.ts` and `tests/switching.spec.ts`).

**Tests** (`NeonSerpentLogic.test.ts`, 10 → 12): exact curve — one step per food, floor respected past 16 foods, level capped at 17, deterministic (feeds placed directly ahead; obstacles cleared and body trimmed per cycle so periodic obstacle spawns and self-collision at length ≥ 18 can't end the run early — the first version hit the tail-bite at ~15 foods); restart returns to level 1/base speed. Existing monotonic-and-deterministic ramp test was already curve-agnostic and passes unchanged, as do all movement/wrap/combo/food tests.

**Validation:** `npx vitest run src/games/neon-serpent` 12/12 ✓; full `npm run validate` ✓ (build + tsc, 40 vitest, lint, e2e 22 passed / 18 intentionally skipped).

## Playtest phase status

- Phase A ✅ (`80e64b0`) switching fix + pixel regression. Phase B ✅ (`fb10f68`) full tetromino set + 7-bag.
- **Phase C ✅ (this commit)** speed ramp tuned + surfaced.
- Phase D ⬜ Bounce Circuit redesign — the big slice: horizontal progression with camera/world scrolling, parallax background, hazards, pickups, clearer goal, better jump feel (coyote time/buffering are logic-side candidates), squash/stretch retained. Logic must stay pure/deterministic; scene draws from a camera offset. Tests for meaningful movement/progression required.
- Phase E ⬜ Star Courier hazards/readability. Phase F ⬜ Lane Rush visual overhaul. Phase G ⬜ arcade-wide polish. Phase H ⬜ final validation/docs.

## Next task

**Phase D — Bounce Circuit redesign.** Current game is a single static screen (x 0..9, one spike, one key, one door). Sketch before coding: (1) extend `BounceCircuitLogic` to a deterministic horizontally-scrolling course (seeded layout of platforms/spikes/pickups over a longer world, `cameraX` or worldOffset in the snapshot, distance-based scoring, goal at course end); (2) keep pure-logic module + snapshot contract (entities as positions); (3) scene: world-to-screen mapping from the camera offset, parallax layers (procedural), scrolling ground, hazard/pickup rendering, jump feel (input buffering/coyote time in logic with tests); (4) update controls hint if mechanics change; (5) logic tests: progression advances camera/distance, hazards kill, pickups score, goal wins, determinism per seed; e2e: scripted run making forward progress (probe-first like the Phase 5 win test — that test will need rewriting for the new design); pixel signatures in `tests/switching.spec.ts` use the ground strip color — keep a full-width ground strip or update the signature there.
