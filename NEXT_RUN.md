# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase D)

**Slice: Bounce Circuit redesigned from a static single screen into a scrolling procedural auto-runner.**

**Old game:** fixed screen (x 0..9), one spike, one key, one door, no camera, no background motion — the playtest's "blob sitting on one plane."

**New game (`src/games/bounce-circuit/BounceCircuitLogic.ts`, rewritten, pure/deterministic):**

- **Auto-runner:** the world scrolls at a ramping speed (0.22 → 0.42 units/step, capped); `cameraX` tracks distance and the player rides at screen-center-left with a ±1.5-unit LEFT/RIGHT nudge for dodging.
- **Seeded course generation:** 16-unit chunks generated ahead from `SeededRandom` — spike singles/pairs, one-way platforms (land from above, pass beneath) carrying bonus orbs, orb arcs, breather orbs — with a forced spike cadence (max one spikeless chunk in a row) so unguided runs always end; features prune behind the camera; the first 32 units are a grace zone (which the tests also use as a deterministic sandbox for injected geometry).
- **Jump feel:** jump velocity 5.2 with gravity 0.5; **coyote time** (4 steps after running off a platform edge) and a **jump buffer** (5 steps, auto-fires on landing).
- **Scoring:** orbs +25 immediately; distance banked into the score on death (keeps the shared score audio cue event-based instead of beeping every step). High-score persistence unchanged via ScoreManager.
- **Snapshot:** `cameraX`, `playerX/Y`, `velocityY`, `grounded`, `speed`, `distance`, `orbsCollected`, plus `spikes`/`platforms`/`orbs` position arrays — JSON-serializable and detached.

**Scene (`BounceCircuitScene.ts`, rewritten):** two-depth parallax skyline (0.2×/0.45× camera, tower heights hashed from stable world indices), scrolling ground ticks at 1×, one-way platforms with lit edges, spike triangles, pulsing orbs, retained squash/stretch plus landing dust, orb sparkle + shake, and death shake/flash. Parallax scrolls under reduced motion (it communicates world position — gameplay state, not decoration); pulses/particles/shake stay gated. `stepMs` 120 → 48. The full-width ground strip keeps its exact color so the switching spec's pixel signature survives unchanged. Verified by screenshot: skyline depth, spikes ahead, player mid-jump, HUD `Score/High/Dist/Orbs`.

**Shell:** controls hint "↑ jump · ← → shift · Space restarts" (updated in `switching.spec.ts`); card subtitle now "Neon skyline auto-runner".

**Tests:** logic suite rewritten 5 → 13 (deterministic auto-run + camera tracking, identical course on restart, jump arc, platform land/underpass, coyote grant + expiry, jump buffer, spike death banking distance, jump clears spike, orb collection, bounded spike cadence, monotonic capped speed ramp, snapshot contract). Two new e2e runs replace the key/door tests: forward progression + jump feel (~3 s) and an unguided death at the probed tick 149 ≈ 7.2 s banking ≥28 score, then restart — both with zero-console-error assertions. One coyote test premise was fixed during development (a fall from height 2 lands in ~6 steps, inside the original press window); and the import-boundary guard caught the phrase "coyote window" in a test title (prose false-positive on /\bwindow\b/) — renamed rather than weakening the guard.

**Validation:** bounce logic 13/13 ✓; desktop e2e (games + switching + shell) 12/12 ✓; full `npm run validate` ✓ (build + tsc, 50 vitest, lint, e2e 22 passed / 18 intentionally skipped).

## Playtest phase status

- Phase A ✅ (`80e64b0`) · Phase B ✅ (`fb10f68`) · Phase C ✅ (`f9949d8`) · **Phase D ✅ (this commit)**
- Phase E ⬜ Star Courier hazards/readability. Phase F ⬜ Lane Rush visual overhaul. Phase G ⬜ arcade-wide polish. Phase H ⬜ final validation/docs.

## Next task

**Phase E — Star Courier hazards/readability.** Audit first: the game has enemies + player collision + bottom-crossing loss, but the playtest says hazards are unclear/missing. Candidates: (1) enemy variety or descending hazard columns (logic-side, deterministic, snapshot-exposed) so dodging matters beyond the fire lane; (2) readability — larger/shaped enemies instead of plain circles, projectile trails, enemy-approach telegraphing near the bottom, wave-change flash + HUD emphasis; (3) feedback — explosion already exists; add enemy-hit flash and near-bottom warning tint; (4) fairness/testability — keep spawn determinism, extend logic tests for any new hazard type, keep the deterministic kill e2e (seed 9 column-2 first enemy) working or update its script with a probe first.
