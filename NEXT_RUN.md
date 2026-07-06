# NEXT_RUN — Gameplay/Replayability Pass (branch `gameplay-replayability-pass-1`)

Loop: `.claude/gameplay-replayability-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                              | Status              |
| ----- | -------------------------------------------------- | ------------------- |
| 0     | Mobile rapid-tap zoom P0 (CSS/touch, no gameplay)  | done (`cedf11a`)    |
| 1     | Runtime seed variation, deterministic tests intact | done (`3b8d761`)    |
| 2     | Bounce Circuit: jump tuning, double jump, variety  | done (`beb15b5`)    |
| 3     | Star Courier: movement/aiming feel                 | **done** (this run) |
| 4     | Lane Rush: pseudo-3D + double-tap boost            | next                |
| 5     | Circuit Stack: live 7-bag variation                | pending             |
| 6     | Validation + docs close-out                        | pending             |

## Phase 3 (this run) — what changed

**Queued glide strafing.** Movement truth lives in `StarCourierLogic.ts`; the scene only
draws; movement consumes **zero rng draws**, so every seeded spawn (incl. the seed-9
column-2 opener) is untouched. No bullet-hell: spawn cadence, pools (8/10/4), wave
scaling, and telegraphs unchanged.

- **Logic:** LEFT/RIGHT no longer teleport one column — they queue whole columns onto
  an integer `targetX` (rapid taps stack; clamped 0..10), and `step()` glides
  `playerX` toward it at exported `courierMoveStep = 0.55`/step (~11.5 columns/sec at
  the 48 ms scene step — full board in under a second, five columns in 10 steps). The
  glide converges **exactly** onto the integer column (round2 arithmetic), so a
  settled ship is always column-aligned for firing; shots fired mid-glide leave from
  the fractional x and still connect within the 0.65 hit reach. `playerTargetX` is
  exposed in the snapshot for tests/HUD.
- **Scene (`StarCourierScene.ts`, presentation only):** the smooth motion falls out of
  drawing the float `playerX`; added a small nose lean toward the queued column
  (reduced-motion gated). Ship at rest is unchanged — bottom-center cyan pixel
  signature safe (re-run green).
- **Shared input (the one allowed exception):** `TouchControls` hold-repeat tightened
  300 ms → **200 ms** delay, 90 ms → **70 ms** interval, so hold-to-strafe starts
  promptly on phones (each repeat queues one column). ACTION stays single-shot; a tap
  still emits exactly one input. This affects all games' d-pads (faster held
  soft-drop/lane-weave — strictly friendlier); the pressed/repeat and tap-once specs
  passed unmodified on both projects.
- **Docs:** README Star Courier line describes the glide; case-study count 63 → 66.

## Deliberately updated pins (old → new, why)

- **Vitest `alignPlayer` helper** now queues the target and glides (its internal steps
  fully disarm enemies so debris scenarios cannot be ended by an unshot invader).
- **Seed-3 projectile test:** settles on column 6 before firing (was: fire immediately
  after an instant move).
- **Seed-9 park tests (collision / near-miss column):** assert `playerTargetX`
  immediately, then let the survival loop / an explicit settle loop cover the glide.
- **E2e `games.spec.ts`:** the 8×LEFT clamp and 3×LEFT park assertions now check the
  queued target and `waitForFunction` the arrival (`playerX === 0` / `=== 2`). The
  fire-until-kill loop needed no change — a settled ship kills exactly as before.

## New tests (Star vitest 12 → 15)

- **Movement responsiveness pin:** 5 presses queue instantly (target 0, position still
  5 until `step()`); glide settles exactly in `ceil(5/0.55) = 10` steps; full-board
  crossing in `ceil(10/0.55) = 19` steps.
- **Kill feasibility:** seed-9 opener — queue 3×LEFT, settle, fire → score ≥ 15, no
  game over.
- **Mid-glide alignment:** a single shot fired from a fractional x (inside half a
  column) is the only projectile in flight and alone makes the kill (`score === 15`).

## Validation (all green)

- `npx vitest run src/games/star-courier`: 15 passed.
- Star e2e (forced seed 9): both tests green (~2.1 s / ~9.5 s).
- `switching` + `smoke` + `shell` both projects (scene + shared input touched):
  17 passed / 13 intentionally skipped — repeat/tap-once and pixel signatures held.
- Full `npm run validate`: build + strict tsc, **66 Vitest**, ESLint + import boundary
  - Prettier, Playwright **33 passed / 27 intentionally skipped**.

## Manual QA additions (next real-device pass)

- Star Courier: mash ← 3× — ship sweeps smoothly and stops dead on the column; hold a
  direction — strafe starts within ~200 ms and tracks the held thumb; nose leans while
  gliding; firing right after arriving kills the column's enemy without re-tapping.
- Re-check other games' held d-pad feel (soft-drop, lane weave) with the quicker
  repeat; confirm a Bounce hold still reads as jump + auto double jump, not a spam.

## Next task (Phase 4 — start cold from the loop file)

Lane Rush pseudo-3D + boost: logic keeps three lanes and the y-model — add exported
speed cap, tick-based ACTION double-tap boost (cooldown, `boostTicksLeft`/
`boostCooldownLeft` in the snapshot, dead-ACTION still restarts; never write the word
"wind\*w" in logic comments); scene rewrite to horizon/trapezoid/depth-scaled rendering
with a legible near-miss zone and boost feedback. **The `#0d252b > 200k px` road
signature and Star Courier's `< 100k` road check in `tests/switching.spec.ts` must be
re-measured and updated deliberately.** Speed-curve changes shift the seed-12 crash
timing — re-probe `games.spec.ts` / `shell.spec.ts` / `highscore.spec.ts` waits. Full
detail in `.claude/gameplay-replayability-loop.md` Phase 4.
