# NEXT_RUN — Mobile UI Pass (branch `mobile-ui-pass-1`)

Driven by `UI_MOBILE_AUDIT.md` (ranked findings, acceptance criteria, hard rules) and
`.claude/mobile-ui-loop.md` (execution procedure). Desktop pass close-out notes live in
git history (`4741c09`, `8def1ed`).

## Phase status

| Phase | Scope                                                | Status                |
| ----- | ---------------------------------------------------- | --------------------- |
| 1     | Viewport fit, no accidental scroll, safe canvas size | **done (this slice)** |
| 2     | Touch controls / d-pad ergonomics, thumb reach       | next                  |
| 3     | Picker, restart, high scores, instructions           | queued                |
| 4     | Mobile HUD/canvas framing, reduced clutter           | queued                |
| 5     | Touch a11y, focus/active states, orientation         | queued                |
| 6     | Mobile screenshot verification + full validation     | queued                |
| 7     | Docs + final summary                                 | queued                |

## Phase 1 (2026-07-05) — what changed

**P0-1 fixed (canvas overlapping/hiding the d-pad on short phones):**

- `src/style.css` mobile block: `.arcade-shell` grid is now a single `minmax(0, 1fr)` row —
  the selector/case-study panels are `display: none` on mobile, so the stage was landing in
  the unconstrained `auto` row and its content could overflow the viewport.
- `.game-root` mobile sizing is now row-derived (`width: auto; height: 100%; max-width/max-height: 100%`,
  the same pattern the desktop block uses) instead of the stale `calc((100vh - 230px) * aspect)`
  estimate. The canvas can no longer overflow into the touch controls.

**P0-3 hardened (mobile browser chrome / safe areas):**

- `.arcade-shell` mobile height is `100dvh` with a `100vh` fallback line.
- `padding-bottom: calc(10px + env(safe-area-inset-bottom))` clears the home indicator.
- `index.html` viewport meta now includes `viewport-fit=cover`.

**New regression (`tests/shell.spec.ts`, mobile project — "mobile canvas and touch controls
share the viewport without overlap"):** at 375×667, 390×844, 412×915, 430×932 it asserts no
vertical/horizontal page scroll, canvas bottom above the `.touch-controls` top, and every
`.touch-button` fully inside the viewport. **Fail-first verified:** against the pre-fix CSS it
failed at 375×667 with canvas bottom 568 vs controls top 463.5 — exactly the audited defect.

## Phase 1 validation

- Targeted new spec: green post-fix (fail-first confirmed pre-fix).
- `npx playwright test tests/shell.spec.ts tests/smoke.spec.ts` both projects: 9 passed / 7
  intentionally skipped.
- Full `npm run validate`: build + strict tsc, 54 Vitest, ESLint + import boundary + Prettier,
  Playwright 25 passed / 21 intentionally skipped.
- Screenshot/metrics re-run (scratchpad `ui-audit/`): all four portrait sizes show a 12px gap
  between canvas and controls, `scrollHeight == innerHeight`; iPhone SE shows the full d-pad
  with a 252×337 canvas.
- Desktop: shell/smoke/switching desktop suites green unmodified; no `min-width: 900px` CSS
  touched.

## Notes / carry-forwards

- Landscape (<900px) canvases are now even smaller (33×45 at 667×375) because sizing is
  honestly row-derived — landscape strategy is Phase 5 scope (audit P0-2) and was already
  unplayable pre-fix.
- HUD still clips at 375 wide ("Len 3" cut) — Phase 3 (audit P2-12/P0-4).
- Real-device dvh/safe-area behavior cannot be proven headless — manual QA list lands in
  Phase 6.

## Next task (Phase 2)

Pressed-state class on d-pad buttons (`:active` is suppressed by `preventDefault` on
pointerdown), tap-highlight/user-select/touch-action hygiene, hold-to-repeat for direction
buttons, thumb-reach layout, 44px Restart/select — per `.claude/mobile-ui-loop.md` Phase 2.
