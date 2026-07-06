# NEXT_RUN — Gameplay/Replayability Pass (branch `gameplay-replayability-pass-1`)

Loop: `.claude/gameplay-replayability-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                              | Status              |
| ----- | -------------------------------------------------- | ------------------- |
| 0     | Mobile rapid-tap zoom P0 (CSS/touch, no gameplay)  | done (`cedf11a`)    |
| 1     | Runtime seed variation, deterministic tests intact | done (`3b8d761`)    |
| 2     | Bounce Circuit: jump tuning, double jump, variety  | done (`beb15b5`)    |
| 3     | Star Courier: movement/aiming feel                 | done (`c82c92c`)    |
| 4     | Lane Rush: pseudo-3D + boost + crash impact        | done (`e8ba513`)    |
| 5     | Circuit Stack: live 7-bag variation + gravity      | **done** (this run) |
| 6     | Validation + docs close-out                        | next                |

## Phase 5 (this run) — what changed

**Live 7-bag variation: verified (verification-first, as scoped).** The Phase 1 seam
already covers Circuit Stack — the new coverage proves the chain at both layers:

- **E2e (`games.spec.ts`, +1):** "live restarts redeal the bag from fresh seeds" —
  loads under the forced seed (14), then **deletes `__ARCADE_FIXED_SEEDS__` at
  runtime** (the override is consulted on every restart, not just at boot), and two
  Restart clicks each draw a different `runSeed`. Paired with the existing forced-
  reproducibility test (same bag redealt under seed 14), both modes are pinned.
- **Vitest:** different seeds shuffle different bag orders and different first-two-
  bags spawn sequences (seeds 21 vs 9, deterministic), same seed re-deals identically;
  the existing seven-per-bag / I-piece-rotation-and-kick / spawn-blocked pins were
  already strong and are untouched.
- **New:** ACTION after a blocked spawn restarts with a clean board, score 0,
  `linesCleared` 0, level 0.

**Optional pacing improvement: shipped (small, rng-free).** A gentle gravity curve in
`CircuitStackLogic.ts`: exported `circuitDropTicks(linesCleared)` = base 24 ticks,
−3 per level, one level per 3 cleared lines, floored at 10 (≈300 ms/row at the 30 ms
scene step — brisk, not brutal). Pacing consumes **zero rng draws**, so every seeded
bag pin (vitest 21/9/1/2/5/6/7/3, runtime 14) is safe by construction. `linesCleared`
and `level` join the snapshot; the scene's only change is a `hudExtra` line
(`Lv 0  Lines 0`) — switching pixel signatures re-run green.

**Not done, per scope:** no hold piece, no T-spins, no garbage/rising floor, no
next-queue.

## New tests (Circuit vitest 11 → 14; e2e +1)

- Seed-variation: bag + engine-level spawn sequences differ across seeds, reproduce
  for a seed.
- ACTION-restart after game over resets board/score/lines/level.
- Gravity: pure curve values (base, boundary, step, floor) plus an engine check — a
  triple clear reaches level 1 and the piece falls on the shortened interval.
- E2e live-redeal (above); total Playwright now **35 passed / 29 skipped**.

## Validation (all green)

- `npx vitest run src/games/circuit-stack`: 14 passed.
- Circuit e2e (forced + live) + `switching.spec.ts` (scene HUD touched): green.
- Full `npm run validate`: build + strict tsc, **73 Vitest**, ESLint + import boundary
  - Prettier, Playwright **35 passed / 29 intentionally skipped**.
- README Circuit line and case-study count (70 → 73) refreshed.

## Manual QA additions (next real-device pass)

- Circuit Stack: two restarts deal visibly different opening pieces; clear 3 lines →
  HUD shows `Lv 1` and pieces fall noticeably (not brutally) faster.

## Next task (Phase 6 — start cold from the loop file)

Close-out: full `npm run validate` (fresh), flake pass with `--repeat-each=2` on the
input-sensitive suites (`shell`, `smoke`, `games`) both projects, refresh the stale
parts of `CURRENT_APP_STATE.md` (bridge `runSeed`, switch-back-restarts, all five
game sections, quality assessment) and `RESEARCH_BACKLOG.md` (shipped quick-wins:
speed cap, near-miss zone, gravity curve, double jump, glide), fold the run-seed
invariant into `CLAUDE.md`'s architecture notes, and overwrite this file with the
consolidated real-device QA list (rapid-tap zoom, double jump, glide strafe, boost +
pseudo-3D readability, live variation) plus a merge recommendation. Stop with a
summary. Full detail in `.claude/gameplay-replayability-loop.md` Phase 6.
