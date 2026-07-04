# Next Run

## Last iteration (2026-07-04, iteration 9)

**Slice: Phase 5.3 — Lane Rush feel pass.**

- `src/games/lane-rush/LaneRushScene.ts`: near-miss sparks at the scored car's true position (diffs `scored` flags against the previous frame's traffic array) + small shake; crash `deathFeedback` (shake + red flash); dashed lane lines that scroll proportionally to `state.speed` for speed sensation; subtle player-car bob. All motion frozen under `prefers-reduced-motion`; emitter cleanup on scene SHUTDOWN via the shared helper.
- `tests/games.spec.ts`: crash-path e2e — parked player near-misses (score > 0), crashes (probed deterministically first: seed 12 crash at tick 102 ≈ 4.3 s, score 12), Space restarts, zero console errors. Probe test was temporary and deleted.

**Validation:** build + tsc ✓, 31 vitest ✓, lint ✓, e2e 17 passed / 13 intentionally skipped ✓ (desktop deep suite 9/9, 33 s total).

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–4 ✅ · Phase 5 in progress: Neon Serpent ✅ (`aca742c`), Star Courier ✅ (`1d55ac6`), Lane Rush ✅ (this commit)
- **Phase 5 remaining:** Circuit Stack, Bounce Circuit. Phases 6–7 not started.

## Open fairness item (from iteration 8)

Star Courier still has no player–enemy collision (ship is a ghost; only bottom-crossing ends the run). Logic-side candidate with a deterministic test — schedule after the per-game feel passes or fold into a fairness slice.

## Next highest-leverage task

**Phase 5.4 — Circuit Stack feel pass.** Reuse `effects.ts` + the transition-detection pattern: lock thump (small shake + a few sparks at the locked piece's cells — detect lock by `occupied` increasing), row-clear celebration (bigger spark line + `smallShake`, detect by `occupied` *decreasing* across a frame or score jump), spawn-blocked death feedback (`deathFeedback` when `isGameOver` flips). The piece cells and grid mapping are already in `draw()`. Consider showing the *shape* of `nextPiece` in a corner preview (procedural, tiny) instead of just its index in the HUD — clearer scoring/planning info. Validation: existing circuit-stack e2e covers lock (`occupied >= 4`); a row-clear e2e is likely too slow to set up honestly — if so, validate via the existing multi-row-clear logic test plus no-console-error coverage, and say so. Then Phase 5.5 Bounce Circuit (jump/land squash & stretch, key-pickup sparkle, win celebration, spike death feedback).
