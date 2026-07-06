# NEXT_RUN — Gameplay/Replayability Pass (branch `gameplay-replayability-pass-1`)

Loop: `.claude/gameplay-replayability-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                              | Status              |
| ----- | -------------------------------------------------- | ------------------- |
| 0     | Mobile rapid-tap zoom P0 (CSS/touch, no gameplay)  | done (`cedf11a`)    |
| 1     | Runtime seed variation, deterministic tests intact | done (`3b8d761`)    |
| 2     | Bounce Circuit: jump tuning, double jump, variety  | done (`beb15b5`)    |
| 3     | Star Courier: movement/aiming feel                 | done (`c82c92c`)    |
| 4     | Lane Rush: pseudo-3D + boost + crash impact        | **done** (this run) |
| 5     | Circuit Stack: live 7-bag variation                | next                |
| 6     | Validation + docs close-out                        | pending             |

## Phase 4 (this run) — what changed

**Logic (`LaneRushLogic.ts`) — three-lane model kept, zero new rng draws:**

- **Speed cap:** the ramp `0.18 + tick/2400` now plateaus at exported
  `laneRushMaxSpeed = 0.38` (~tick 480). Below that point the curve is unchanged, so
  the **seed-12 parked-crash timing (~tick 102) was untouched** — every existing
  Lane Rush e2e wait passed without edits, exactly as predicted.
- **Double-tap boost:** two ACTION taps within `laneRushDoubleTapTicks = 8` (~340 ms)
  arm `laneRushBoostDurationTicks = 90` (~3.8 s) of `laneRushBoostMultiplier = 1.6`×
  speed, then `laneRushBoostCooldownTicks = 240` (~10 s) of cooldown. Tick-based (no
  clocks in logic), single ACTION does nothing (no mobile spam), ACTION-while-dead
  still restarts first. `boostTicksLeft`/`boostCooldownTicks` in the snapshot.
- **Crash exposure for the impact animation:** `crashLane`/`crashY` capture the
  colliding car's true lane/depth (-1 while alive; reset on restart).
- `traffic` became public (matching the other four games' test conventions).

**Scene (`LaneRushScene.ts`) — full pseudo-3D rewrite, presentation only:**

- Horizon at 30% height with a boost-reactive glow line; night-sky bands; ground
  shoulders; **road trapezoid in the exact signature color `#0d252b`**; straight
  perspective edges (screen x/y are both affine in eased depth `t^1.7`, so edges stay
  lines while world spacing compresses toward the horizon).
- Depth-scaled scrolling lane dashes (quads via `fillPoints`), roadside posts with
  glow caps, speed streaks (intensified while boosting), far-road haze.
- Cars painter-sorted far→near and scaled 0.2→~0.85 by depth; a same-lane car bearing
  down glows red (danger cue); the **near-miss scoring band (world y 9.1–10.4) is
  visible on the asphalt** and flashes when a near-miss lands; popups scale with depth.
- Player car in the foreground with visual lane-lerp (snap under reduced motion),
  bob, and boost exhaust flames; HUD reads `Spd 0.33 BOOST` / `boost 9s` / `boost ●●`.
- **Crash impact at the true collision point:** shockwave rings expand from
  `crashLane`/`crashY`, the struck car is shoved forward/sideways as the 460 ms decay
  runs, the player car jitters, plus the existing 26-spark burst and shake/flash.
  Under reduced motion: no jitter/rings/scroll, static red rims on both cars instead —
  feedback stays, churn goes.
- Screenshot-verified (run/boost/crash) at 1440×900 — the crash frame shows the
  struck car jolted into the player with rings and debris at the collision point.

**Deliberate pin updates (same slice):**

- **Pixel signature re-measured:** the pseudo-3D trapezoid renders **113,765** road
  pixels on the desktop canvas (old flat fill > 200k). `tests/switching.spec.ts`
  threshold updated 200k → **80k** with the measurement documented inline. The check
  itself is intact; Star Courier's `< 100k` road check needed no change.
- **Hint copy:** Lane Rush hints gained "· double-tap Space/● = boost" (`main.ts`) with
  the pinned strings updated in `shell.spec.ts` + `switching.spec.ts`.
- README Lane Rush line rewritten; case-study count 66 → 70.

## New tests

- **Vitest (Lane 6 → 10):** speed ramps monotonically to exactly the cap (survives by
  clearing public traffic); double-tap inside the interval boosts at the multiplier /
  slow second tap does not; boost expires into cooldown, cooldown blocks re-boost,
  re-arms after; parked seed-12 crash exposes `crashLane`/`crashY` inside the crash
  band and ACTION still restarts (clearing crash + boost state).
- **E2e (`games.spec.ts`, +1):** double-tap Space arms the boost and the multiplied
  speed lands on the next fixed step (first version raced the 42 ms step — the wait
  now covers both conditions).

## Validation (all green)

- `npx vitest run src/games/lane-rush`: 10 passed.
- Lane e2e + switching (signature re-measured): green; parked-crash and mobile
  game-over waits unchanged.
- Full `npm run validate`: build + strict tsc, **70 Vitest**, ESLint + import boundary
  - Prettier, Playwright **34 passed / 28 intentionally skipped**.
- Screenshots (scratchpad `lane-3d-run/boost/crash.png`, ephemeral): pseudo-3D
  composition, boost feedback, and collision impact all verified visually.

## Manual QA additions (next real-device pass)

- Lane Rush: road reads as 3D at phone sizes (dashes converge, cars grow); double-tap
  ● boosts with flames + BOOST HUD and cannot re-trigger during cooldown; near-miss
  band flashes on +12/+5; crash shows rings/jolt at the actual collision spot; with
  reduced motion enabled, crash still clearly reads via the red rims.

## Next task (Phase 5 — start cold from the loop file)

Circuit Stack live 7-bag variation — verification-first: e2e in live (unforced) mode
that two restarts yield different `runSeed`s (and optionally differing early
`nextPiece` sequences with retry tolerance); fixed-seed bag pins (vitest seeds
21/9/1/2/5/6/7/3 + runtime 14) stay untouched. No hold piece/T-spin/garbage/queue.
Optional small gravity curve only if low-risk and pinned. Full detail in
`.claude/gameplay-replayability-loop.md` Phase 5.
