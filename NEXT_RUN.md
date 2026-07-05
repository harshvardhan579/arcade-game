# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase B)

**Slice: Circuit Stack piece completeness — full tetromino set + 7-bag randomizer.**

**Confirmed audit:** `circuitPieces` had only 3 shapes (O, T, L). No I, S, Z, or J — the playtest note was right.

- `src/games/circuit-stack/CircuitStackLogic.ts`:
  - Full standard seven-piece set (I, O, T, S, Z, J, L) as center-anchored offset shapes; every shape overlaps the spawn columns, so the existing spawn-blocked game-over test remains valid for any opener.
  - Deterministic 7-bag randomizer: pure exported `shuffledBag(rng, size)` (Fisher–Yates over `SeededRandom`) feeding a private bag that refills when empty — replaces independent uniform draws, guaranteeing every piece (including the I) appears once per bag.
  - Wall-kick list extended from `[0, ±1]` to `[0, ±1, ±2]` so the four-wide I can rotate away from walls; existing pieces never reach the ±2 kicks (±1 tried first), so their behavior is unchanged.
- `src/games/circuit-stack/CircuitStackScene.ts`: next-piece preview frame now sizes itself from the shape's bounds, so the 4-wide I renders fully inside its box (the old frame was hardcoded 3×2).
- `src/games/circuit-stack/CircuitStackLogic.test.ts` (7 → 11 tests): seven shapes with a geometric I detector; `shuffledBag` is a deterministic permutation; the first two bags deal every piece exactly twice (spawn identities recovered from `pieceCells` offsets through drop→lock→clear cycles); the I spawns within one bag, rotates to a single column in bounds, and the new ±2 kick moves it off the left wall. Existing rotation/movement/row-clear/scoring tests all still pass unchanged.

**Interesting find:** `SeededRandom`'s first output is nearly constant for small seeds (LCG artifact, ≈0.236–0.259 for seeds 1–60), so the first bag swap is deterministic across seeds — the original "find a seed that opens with I" test could never pass. The final test instead relies on the bag guarantee (I within 7 spawns). The RNG itself was left untouched (shared core; the bag makes distribution fairness independent of LCG quality).

**Validation:** `npx vitest run src/games/circuit-stack` 11/11 ✓; games + switching e2e 11/11 ✓; full `npm run validate` ✓ (build + tsc, 38 vitest, lint, e2e 22 passed / 18 intentionally skipped). The pixel-signature switching regression still passes (piece color/grid signatures are shape-independent). No new e2e added — the existing bridge-driven Circuit Stack test (soft-drop/rotate/lock) and the pixel regression already cover render state for arbitrary pieces, and any first-piece-specific e2e would couple the suite to bag order.

## Playtest phase status

- Phase A ✅ (`80e64b0`) switching fix + pixel regression test.
- **Phase B ✅ (this commit)** full tetromino set + 7-bag.
- Phase C ⬜ Neon Serpent speed ramp: `speedMs = max(68, 145 − foodsEaten*5)` in `NeonSerpentLogic` — intentional ramp, 145→68 ms over 15+ foods. Audit fairness (68 ms floor may be too fast late; multiplier HUD exists but speed is invisible). Options: gentler curve/higher floor, surface speed in `hudExtra` (e.g. `Spd` level), do NOT restructure the game — it plays well.
- Phase D ⬜ Bounce Circuit redesign (largest slice).
- Phase E ⬜ Star Courier hazards/readability.
- Phase F ⬜ Lane Rush visual overhaul.
- Phase G ⬜ arcade-wide graphics polish. Phase H ⬜ final validation/docs.

## Next task

**Phase C — Neon Serpent speed tuning/explanation.** Keep the game intact: (1) decide the ramp curve — current −5 ms per food to a 68 ms floor ≈ 2.1× speed-up; consider easing the floor to ~80 ms and/or slowing the ramp (−4/food) after playfeel review; (2) make the ramp visible — add a speed level to the HUD via `hudExtra` (e.g. `Spd ${level}` derived from `speedMs`, already in the snapshot) so acceleration reads as progression, not glitch; (3) logic tests for the exact curve (monotonic, floor respected, deterministic) and updated HUD; (4) targeted vitest + full validate; commit green.
