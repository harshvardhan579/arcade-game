# NEXT_RUN — Gameplay/Replayability Pass (branch `gameplay-replayability-pass-1`)

Loop: `.claude/gameplay-replayability-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                              | Status              |
| ----- | -------------------------------------------------- | ------------------- |
| 0     | Mobile rapid-tap zoom P0 (CSS/touch, no gameplay)  | **done** (this run) |
| 1     | Runtime seed variation, deterministic tests intact | next                |
| 2     | Bounce Circuit: jump tuning, double jump, variety  | pending             |
| 3     | Star Courier: movement/aiming feel                 | pending             |
| 4     | Lane Rush: pseudo-3D + double-tap boost            | pending             |
| 5     | Circuit Stack: live 7-bag variation                | pending             |
| 6     | Validation + docs close-out                        | pending             |

## Phase 0 (this run) — what changed

**The bug (real-device QA):** rapid tapping during play could still zoom the page. The
previous pass protected the controls themselves (`touch-action: manipulation` on
Restart/select/cards, `none` on `.game-root`/`.touch-controls`), but every _other_
surface — topbar, `h1`, hint text, shell padding, grid gaps — still computed
`touch-action: auto`, so fast taps landing a few px off a button were interpreted by iOS
Safari as double-tap zoom.

**Fix (`src/style.css`, one rule, no gameplay/scene/logic changes):**
`touch-action: manipulation` added to the base `html, body, #app` block. A touch gesture
is only permitted if the touched element **and its ancestors** allow it, so covering the
root suppresses double-tap zoom for every descendant — including all off-control
surfaces — while `manipulation` keeps pan and **pinch-zoom (accessibility preserved)**.
The narrower per-control rules stay as defense in depth. The viewport meta was **not**
touched; `maximum-scale=1` remains the documented escalation only if real-device QA
still zooms (see loop Phase 0, fix step 3).

**Regression (`tests/shell.spec.ts`, mobile project, fail-first verified):** new test
"page surfaces opt out of double-tap zoom…" pins computed `touch-action`:
`html`/`body`/Restart/picker = `manipulation`, `.game-root`/`.touch-controls` = `none`.
Pre-fix it failed with `html: "auto"` — exactly the reported vector. Honest scope note:
headless cannot reproduce iOS double-tap zoom itself; the test pins the CSS contract
that suppresses it.

## Validation (all green)

- Fail-first: new spec red pre-fix (`html` expected `manipulation`, received `auto`).
- `npx playwright test tests/shell.spec.ts tests/smoke.spec.ts` (both projects):
  14 passed / 12 intentionally skipped.
- Full `npm run validate`: build + strict tsc, 54 Vitest, ESLint + import boundary +
  Prettier, Playwright **30 passed / 26 intentionally skipped**.
- No pinned seeded values changed. No gameplay, scene, logic, or DOM-hook changes.

## Real-device QA (~2 min, cannot be proven headless)

On a real iPhone (Safari), during active play:

1. Mash the d-pad rapidly (same button and alternating ←/→): page must not zoom.
2. Rapidly double-tap Restart after a crash: no zoom, restart still fires.
3. Tap rapidly on the topbar/title/hint and in the gaps between d-pad buttons: no zoom.
4. Pinch-zoom must still work (accessibility): pinch in/out, then reset.
5. If any zoom still occurs → loop Phase 0 escalation: add `maximum-scale=1` to the
   viewport meta with the documented Android trade-off, and re-run this QA.

## Next task (Phase 1 — start cold from the loop file)

Runtime seed variation: new `src/core/` run-seed module (pure mixer + counter,
`window.__ARCADE_FIXED_SEED__` / `?seed=` override), `BaseGameScene` owns reseeding on
create/restart/dead-ACTION, `runSeed` published through the bridge, and the seeded e2e
specs (`games.spec.ts`, Lane Rush waits in `highscore.spec.ts`/`shell.spec.ts`) migrated
to force today's defaults (7/11/9/12/14) in the same slice. Logic files untouched.
Watch: import boundary bans the word "window" in `src/**/*.test.ts`; test the mixer
purely. Full detail in `.claude/gameplay-replayability-loop.md` Phase 1.
