# NEXT_RUN — Gameplay/Replayability Pass 1: COMPLETE

Branch `gameplay-replayability-pass-1` is **done and ready for review** — all seven
phases of `.claude/gameplay-replayability-loop.md` executed in green, committed slices.
No gameplay logic was left untested, no test was weakened, and every deliberately updated
pin (seed forcing, buffer semantics, movement assertions, the Lane Rush pixel signature,
hint strings) is documented in its commit message.

## Commit table (this pass)

| Commit    | Phase | What                                                                    |
| --------- | ----- | ----------------------------------------------------------------------- |
| `dcc6274` | prep  | Planning docs: state analysis, research backlog, execution loop         |
| `cedf11a` | 0     | Page-wide double-tap-zoom suppression (`touch-action` on the root)      |
| `3b8d761` | 1     | Live run seeds (`RunSeeds.ts`), test forcing hook, `runSeed` in bridge  |
| `beb15b5` | 2     | Bounce: controllable jump, double jump, orb reach, gated hard chunks    |
| `c82c92c` | 3     | Star Courier: queued glide strafing, tighter d-pad hold-repeat (200/70) |
| `e8ba513` | 4     | Lane Rush: pseudo-3D road, speed cap, double-tap boost, crash impact    |
| `1b5e1f2` | 5     | Circuit Stack: live 7-bag redeal verified, gentle gravity/level curve   |
| (HEAD)    | 6     | Close-out: docs refreshed, flake fix (atomic e2e capture), validation   |

## Final validation (2026-07-06)

- **Full `npm run validate`** (build + strict tsc → Vitest → ESLint + import boundary +
  Prettier → Playwright): green. **73 Vitest** (Neon 12, Bounce 19, Star 15, Circuit 14,
  Lane 10, RunSeeds 3); Playwright **35 passed / 29 intentionally skipped** across the
  desktop + mobile projects; import boundary clean over 11 files; bundle app ≈ 13 kB
  gzip / Phaser ≈ 319 kB gzip.
- **Flake confidence:** `shell + smoke + games + switching` under `--repeat-each=2`, both
  projects: **60 passed / 52 intentionally skipped, 0 failures**. The first repeat run
  caught one real race — the forced-seed reproducibility e2e snapshotted in a separate
  round-trip that could land after the first Circuit piece locked (~720 ms) under
  parallel load; fixed by capturing atomically inside the `waitForFunction` poll (same
  assertions, race removed), then re-run clean.
- **Docs refreshed this phase:** `CLAUDE.md` (run-seed invariant + forcing hook, updated
  pixel-signature thresholds, bridge contract with `highScore`/`runSeed`, bundle size),
  `CURRENT_APP_STATE.md` (pass summary header, all five game sections, architecture,
  test coverage, quality assessment), `RESEARCH_BACKLOG.md` (shipped-item annotations),
  `README.md` (run-seed architecture, bundle size; game lines were updated per phase).

## Manual QA on a real phone (~5 min, cannot be proven headless)

1. **Rapid-tap zoom (Phase 0):** during play, mash the d-pad (same button and alternating
   ←/→), rapid double-tap Restart, and tap rapidly on the topbar/title and between
   buttons — the page must never zoom. Pinch-zoom must still work (accessibility), and if
   any zoom remains, the documented escalation is `maximum-scale=1` in the viewport meta.
2. **Live variation (Phase 1):** restart any game twice — food/traffic/terrain/pieces
   should visibly differ between runs.
3. **Bounce (Phase 2):** one tap = short controllable hop; tap again mid-air = second
   kick with a spark puff; the tallest platforms need the double jump; orbs collect when
   landing on platforms; fences and orb bounties appear after ~30 s.
4. **Star Courier (Phase 3):** three quick taps sweep the ship smoothly and stop exactly
   on a column; holding a direction starts strafing within ~200 ms; firing on arrival
   kills without extra taps; the nose leans while gliding.
5. **Lane Rush (Phase 4):** the road reads as 3D on a phone; double-tap ● boosts (flames,
   BOOST HUD) and cannot re-trigger during cooldown; the near-miss band flashes on
   +12/+5; a crash shows rings/jolt at the actual collision spot; with reduced motion the
   crash still reads via red rims.
6. **Circuit Stack (Phase 5):** two restarts deal different openings; clearing 3 lines
   shows `Lv 1` and noticeably (not brutally) faster falls.
7. Held d-pad feel across games with the quicker repeat (soft-drop, lane weave), and the
   Phase-0-era checks (rotate mid-game, first-tap audio unlock) still apply.

## Known remaining ideas (not blocking; see RESEARCH_BACKLOG.md for detail)

- **iPad-landscape touch layout** — still the one unplayable device class (coarse
  pointer, height > 500 px, width ≥ 900 px gets the keyboard-only desktop layout).
  Highest-leverage remaining UI item.
- **Designed audio layer** — four blip cues today; per-game SFX + a synthesized music
  bed is the biggest remaining feel gap (keep the single-AudioContext contract).
- **Pause + win/round meta** — `PAUSE` input and the `won`/`ready` phases are still dead
  seams; implement or remove honestly.
- **Hitstop everywhere** (Lane Rush's crash impact is the template; Star Courier kills
  want it most), sustained trails, near-miss combo in Lane Rush, Bounce distance
  milestones, daily-seed challenge on top of `RunSeeds`.
- **Phase 7 (bundle/perf)** from the original loop remains unstarted: per-scene lazy
  loading, DPR sharpness (measure first).

## Merge recommendation

**Ready to push and PR** (`gameplay-replayability-pass-1` → `main`): 8 commits — one
docs prep, six green implementation slices, one close-out — each independently
validated, with the full suite plus a doubled flake pass green at HEAD. Suggested PR
title: "Gameplay & replayability pass: live run seeds, per-game feel tuning, pseudo-3D
Lane Rush". The manual phone QA list above is the only outstanding verification and is
non-blocking (all headless-provable behavior is covered by tests).
