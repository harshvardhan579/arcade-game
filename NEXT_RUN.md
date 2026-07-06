# NEXT_RUN — Gameplay/Replayability Pass (branch `gameplay-replayability-pass-1`)

Loop: `.claude/gameplay-replayability-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                              | Status              |
| ----- | -------------------------------------------------- | ------------------- |
| 0     | Mobile rapid-tap zoom P0 (CSS/touch, no gameplay)  | done (`cedf11a`)    |
| 1     | Runtime seed variation, deterministic tests intact | done (`3b8d761`)    |
| 2     | Bounce Circuit: jump tuning, double jump, variety  | **done** (this run) |
| 3     | Star Courier: movement/aiming feel                 | next                |
| 4     | Lane Rush: pseudo-3D + double-tap boost            | pending             |
| 5     | Circuit Stack: live 7-bag variation                | pending             |
| 6     | Validation + docs close-out                        | pending             |

## Phase 2 (this run) — what changed

All gameplay truth in `BounceCircuitLogic.ts` (exported, tested constants); scene change
is presentation-only; no other game touched; ACTION stays single-shot per tap (no input
semantics changed anywhere).

- **Jump nerf (controllable):** `runnerJumpVelocity` 5.2 → **4.2** — peak drops from
  ~3.68 to ~2.34 units, so one press no longer sails over everything and orbs on the
  arc are reachable on purpose.
- **Double jump (new):** second press while airborne = `runnerDoubleJumpVelocity = 3.2`
  (~+1.3 from the press point; mastering both roughly equals the old single jump).
  One per airtime, re-armed on landing; coyote press still gives the full first jump
  and keeps the air jump in hand; a press after the air jump is spent falls back to
  the existing landing buffer. The tallest (2.5) platforms are now **double-jump
  content**: unreachable solo (pinned), landable with first+double (pinned).
- **Orb collectability:** pickup box widened from 0.55/0.75 to exported
  `runnerOrbWindowX = 0.7` / `runnerOrbWindowY = 0.95`. The y-reach now covers the
  platform-orb offset (0.8), so landing on / running across a platform collects its
  orb — previously it silently required a second hop.
- **Chunk variety + fair progression:** two harder archetypes unlock at
  `runnerHardChunkAt = 96` units (gated by stable chunk position, not rng):
  type 5 **spike fence** (three spikes at 1.1 spacing — clearable with a timed jump at
  post-gate speeds, double jump as recovery) and type 6 **orb bounty** (orb at y 1.3
  over a spike — risk-priced reward on the jump arc). The "never two spikeless chunks
  in a row" cadence rule is preserved across the wider table.
- **Scene (`BounceCircuitScene.ts`):** spark puff on the double-jump impulse
  (reduced-motion gated); rendering stays entity-based, ground-strip signature
  untouched.
- **Discoverability:** Bounce hint is now "↑ jump, again mid-air · ← → shift ·
  Space/● restarts" (`main.ts`), with the pinned string in `tests/switching.spec.ts`
  updated in this same slice. README game line and case-study test count (57 → 63)
  refreshed.

## Deliberately updated pins (old → new, why)

- **`buffers a jump pressed just before landing` (vitest) rewritten:** a mid-air press
  now consumes the double jump first, so the buffer behavior is asserted _after_ the
  air jump is spent (third press buffers; impulse unchanged at press; auto-jump fires
  on landing). Same contract, one step later in the input sequence.
- **Seed-11 e2e course changed** (chunk table widened) but both Bounce e2e tests held
  **without edits** — re-probed: unguided death banks ≥ 28 (structural: first spike
  can't appear before the 32-unit grace) and completes in ~8.3 s against the 15 s
  timeout.
- No other pinned value changed; seeds 9/11/12 vitest tests were constant-based and
  survived the retune by construction.

## New tests (Bounce vitest 13 → 19)

- Double jump: smaller impulse, one-per-airtime, re-armed on landing.
- Buffer-after-double (the rewritten pin above).
- Coyote precedence: full impulse, air jump preserved.
- Tuning pin: solo peak in [2.2, 2.5); first+double lands on a 2.5 platform.
- Orb reach: collects a 0.8-high orb while grounded; ignores one just past the reach.
- Hard-chunk gate: fence and bounty both appear in a seed-11 probe run and **never
  before 96 units** (scan-then-survive loop that prunes only kill-band spikes).
- Course variation: seeds 21 vs 22 differ across several chunks (first-chunk-only
  comparison was a real cross-seed coincidence — both open with a pair at [37, 38.1]).

## Validation (all green)

- `npx vitest run src/games/bounce-circuit`: 19 passed.
- Bounce e2e (forced seed 11) + `switching.spec.ts` (scene + hint touched): green.
- Full `npm run validate`: build + strict tsc, **63 Vitest**, ESLint + import boundary
  - Prettier, Playwright **33 passed / 27 intentionally skipped**.
- Note: the import boundary caught the word "wind\*w" in two of my own comments
  (guardrail 3 of the loop file) — reworded to "reach"/"band"; the guard works.

## Manual QA additions (next real-device pass)

- Bounce: one tap = short controllable hop; tap again mid-air = visible second kick
  with spark puff; tallest platforms only reachable with the double jump; orbs collect
  when landing on platforms; fences/bounties start appearing after ~30 s of running.

## Next task (Phase 3 — start cold from the loop file)

Star Courier movement/aiming feel: pick the smallest coherent set from — logic glide
toward an integer target column (fast deterministic traversal, column-precise aiming),
scene-side visual interpolation, tighter `TouchControls` repeat delay (global input
change: re-run pressed/repeat + tap-once specs both projects). Movement consumes no
RNG (seed-9 spawns safe) but `games.spec.ts` pins position-after-presses (3×LEFT → x 2,
8×LEFT → x 0) — update deliberately if semantics become target/glide. Full detail in
`.claude/gameplay-replayability-loop.md` Phase 3.
