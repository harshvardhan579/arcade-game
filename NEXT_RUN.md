# Next Run

## Last iteration (2026-07-04, iteration 10)

**Slice: Phase 5.4 — Circuit Stack feel pass.**

- `src/games/circuit-stack/CircuitStackLogic.ts`: exported the piece shape table as `circuitPieces` (framework-free constant; import boundary unaffected) so the renderer can draw real previews.
- `src/games/circuit-stack/CircuitStackScene.ts`: lock thump (sparks at the just-locked piece's true cells + small shake, detected by `occupied` increasing), row-clear celebration (wide spark burst at the cleared row + shake, detected by score jump), spawn-blocked `deathFeedback`, and a restart guard (`tick` regression suppresses effects). New procedural next-piece preview draws the actual shape of `circuitPieces[state.nextPiece]` in a framed corner box, replacing the bare index in the HUD. All effects `reducedMotion`-gated.
- `src/games/circuit-stack/CircuitStackLogic.test.ts`: pins the export contract — every shape has 4 cells and `nextPiece` indexes into `circuitPieces`.
- `tests/games.spec.ts`: the Circuit Stack e2e now also asserts zero console errors (exercises the lock-thump path).

**Validation:** build + tsc ✓, 32 vitest ✓, lint ✓ (one Prettier warning on NEXT_RUN.md fixed mid-run), e2e 17 passed / 13 intentionally skipped ✓. Row-clear celebration path is not e2e-exercised (setting up a full row honestly takes too long); it is validated by the existing multi-row-clear logic test plus the shared transition-detection pattern proven in the other games — stated explicitly rather than faked.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–4 ✅ · Phase 5: Neon Serpent ✅ (`aca742c`), Star Courier ✅ (`1d55ac6`), Lane Rush ✅ (`dfa8099`), Circuit Stack ✅ (this commit)
- **Phase 5 remaining:** Bounce Circuit. Phases 6–7 not started.

## Open fairness item (from iteration 8)

Star Courier still has no player–enemy collision (ship is a ghost; only bottom-crossing ends the run). Logic-side candidate with a deterministic test — schedule after Bounce Circuit's feel pass or fold into a fairness slice.

## Next highest-leverage task

**Phase 5.5 — Bounce Circuit feel pass (completes Phase 5's per-game passes).** Reuse `effects.ts` + transition detection (`lastScore`/`lastGameOver`/phase): jump/land squash & stretch (scale the player rect by `velocityY` sign — pure presentation from `state.velocityY`), key-pickup sparkle (detect `hasKey` flipping true; sparks at the key position 6*sx), win celebration on `phase === 'won'` (bigger spark burst at the door + shake), spike death `deathFeedback`. The existing Bounce Circuit e2e already reaches death + restart deterministically; extend it (or add) to also collect the key and win — walking right from x=1 picks up the key at x≈6 then wins at x>8.25, all on the way to... note the spike at x=4 is in the path: must jump over it (press UP before reaching 3.55 while holding right). Doable: alternate UP + RIGHT presses; probe in a temporary logic test first (like the Lane Rush probe) to find a reliable input script, then encode it in e2e and assert `phase === 'won'`, score 100, zero console errors. After this: fairness slice (Star Courier collision) or Phase 6 (UI shell).
