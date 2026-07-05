# NEXT_RUN — Mobile UI Pass Complete (+ real-device Safari fix)

## Real-device QA addendum (2026-07-05, post-pass P0 fix)

**The bug (found on a real iPhone, portrait Safari):** the bottom toolbar covered the DOWN
button, the ACTION button, and the last line of the canvas — despite the pass's
`100dvh`/safe-area work. Everything else from the pass held up on device (no canvas/d-pad
overlap, buttons work, rotation works).

**Root cause:** the base rule `.arcade-shell { min-height: 100vh }` was never overridden in
the mobile media block (the desktop block overrides it; the mobile block did not). On iOS,
`100vh` is the **toolbar-inclusive large viewport**, and `min-height` beats `height` — so it
silently defeated the `100dvh` line and stretched the grid under the toolbar. Headless tests
missed it because emulation never diverges `vh` from `dvh`.

**Fix (`src/style.css`, mobile + coarse-landscape blocks only):**

- `min-height: 0` on `.arcade-shell` in both blocks — the actual kill shot.
- Height switched `100dvh` → `100svh` (with the `100vh` fallback line kept): the page cannot
  scroll, so Safari's toolbar never collapses — the small viewport is the honest layout
  height, and iOS updates `dvh` lazily enough that it can report the large viewport on load.
- Portrait bottom clearance: `padding-bottom: max(14px, calc(10px + env(safe-area-inset-bottom)))`
  so DOWN/ACTION keep a visible gap above the toolbar edge even while the inset reports 0.

**Regression (extended "share the viewport" test, mobile project):** two toolbar-constrained
small-viewport geometries added to the loop — **375×553** and **390×664** (SE / iPhone 14
with the toolbar visible) — plus a computed-style pin that `.arcade-shell` `min-height`
resolves to `0px` and its used height never exceeds the viewport. **Fail-first verified:**
pre-fix the pin failed with `min-height: 667px` (= `100vh`), the exact value that shoves the
controls under the toolbar on device.

**Validation:** shell + smoke both projects 13 passed / 11 intentionally skipped (includes
landscape suite re-verifying the landscape-block change); full `npm run validate` green
(Playwright 29 passed / 25 skipped). Measured at 375×553: canvas bottom 350, DOWN 485–539,
ACTION 361–539 — all 14px above the toolbar line, no scroll.

**Remaining manual QA (real iPhone, ~2 min):** portrait Safari — canvas bottom row and
DOWN/ACTION fully visible and tappable with the toolbar showing; rotate to landscape and
back; long-press/double-tap checks from the earlier list still apply.

# Mobile UI pass close-out (branch `mobile-ui-pass-1`)

The mobile browser UI pass driven by `UI_MOBILE_AUDIT.md` and `.claude/mobile-ui-loop.md`
is **complete**: all seven phases executed in green slices; no gameplay or logic code was
touched (scene changes were presentation-only); no test was weakened. Desktop pass
close-out notes live in git history (`4741c09`, `8def1ed`).

## Phase status

| Phase | Scope                                                | Status           |
| ----- | ---------------------------------------------------- | ---------------- |
| 1     | Viewport fit, no accidental scroll, safe canvas size | done (`3049502`) |
| 2     | Touch controls / d-pad ergonomics, thumb reach       | done (`c190dfd`) |
| 3     | Picker, restart, high scores, instructions           | done (`b379896`) |
| 4     | Mobile HUD/canvas framing, reduced clutter           | done (`81c2896`) |
| 5     | Touch a11y, focus/active states, orientation         | done (`f678ccd`) |
| 6     | Mobile screenshot verification + full validation     | done (below)     |
| 7     | Docs + final summary                                 | done (this)      |

## Phase 6 (2026-07-05) — verification evidence

- **Screenshot set regenerated** (four portrait + three landscape + game-over): playable
  canvas at every size (249×333 SE … 410×598 Pro Max portrait; 215×287 … 256×342
  landscape), touch controls visible in all seven viewports including 932×430, zero page
  scroll everywhere, touch hint wording everywhere, `GAME OVER / Tap ● to restart`
  overlay legible at 390×844 with the picker showing `Lane Rush · High 12`.
- **Flake confidence:** `shell + smoke + switching` under `--repeat-each=2`, both
  projects: 28 passed / 24 intentionally skipped.
- **Final full `npm run validate`:** build + strict tsc, 54 Vitest, ESLint + import
  boundary + Prettier, Playwright **29 passed / 25 intentionally skipped**.
- **Audit acceptance criteria:** all eleven met; two caveats documented honestly —
  landscape HUD can truncate its tail on a 215px-wide canvas (score/high always visible),
  and iPad-landscape (coarse pointer, >500px height, ≥900px width) still receives the
  desktop layout.

## Manual QA on a real phone (~3 minutes, cannot be proven headless)

1. iOS Safari portrait: play each game; confirm the ↓ button clears the toolbar with the
   URL bar both expanded and collapsed (`100dvh` behavior), and the home indicator does
   not overlap the d-pad (safe-area padding).
2. Long-press any d-pad button: pressed state shows, no text magnifier/callout appears.
3. Double-tap Restart rapidly after a crash: no page zoom.
4. Rotate mid-game: landscape composition appears (canvas center, controls flanking),
   play works, rotate back cleanly.
5. First tap anywhere unlocks audio (select blip on picking a game).

## Merge recommendation

Ready for review. `mobile-ui-pass-1` = audit + loop docs (`dace459`) plus five green
implementation commits and this close-out, stacked on the completed desktop pass.
Suggested: PR `mobile-ui-pass-1` → `main`.

## Remaining polish ideas (non-blocking)

1. iPad-landscape touch layout (documented limitation; needs a taller-viewport variant of
   the coarse-pointer block plus stage-grid rework at ≥900px).
2. Optional swipe-on-canvas input for Neon Serpent (semantic-input layer only, if wanted).
3. Landscape HUD tail truncation on ≤215px canvases (shorter labels per game would fix).
4. Repo-root hygiene: remove the 13 empty word-named directories left by a botched
   Docker-Desktop shell string (see audit hygiene note).

## Phase 5 (2026-07-05) — what changed

**P0-2 fixed (landscape phones broken both sides of the 900px breakpoint):** a new
`@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px)` block —
placed last so it wins the cascade over both the mobile and desktop blocks — gives coarse-
pointer landscape phones a playable composition: full-height centered canvas, direction
cluster overlaid on the left dead margin, action button on the right, compact single-row
topbar, desktop panels hidden, safe-area insets on all sides. This also plugs the 932×430
hole where a landscape Pro Max used to get the keyboard-only desktop layout. Fine-pointer
desktops can never match the query; all desktop suites green unmodified.

**Touch a11y:** the five d-pad buttons now carry aria-labels ("Move up/down/left/right",
"Action"); glyphs stay presentational; `data-arcade-input` hooks unchanged. Focus-visible
rings already covered all controls.

**New regressions (mobile project):** landscape playability at 667×375, 844×390, 932×430
(controls visible, selector hidden, no scroll, canvas ≥160px wide, every button ≥44px,
fully on-screen and disjoint from the canvas) — fail-first verified (pre-fix: hidden
controls at 932, 33px canvas at 667); accessible names on all five buttons; a
reduced-motion emulation run on the mobile project proving play continues without errors.

### Phase 5 validation

- Mobile shell specs: 6 passed. Full `npm run validate`: Playwright 29 passed / 25
  intentionally skipped; build, Vitest, lint green.
- Screenshots at 667×375 and 932×430: centered playable canvas, flanked controls, no
  clipped chrome.
- Known limitation (documented, out of phone scope): iPad landscape (coarse pointer,
  height > 500px, width ≥ 900px) still gets the desktop layout without touch controls.

## Phase 4 (2026-07-05) — what changed

**P1-10 fixed (inverted mobile topbar hierarchy):** the marketing eyebrow is hidden on mobile
(`display: none` in the max-width block — it remains desktop chrome), reclaiming topbar space
for the canvas; Restart demotes to a quiet outline style (cyan text on a translucent fill with
the shared control border) so the game picker leads. Accessible name and hooks unchanged.
Mobile regression: `.eyebrow` hidden (fail-first verified); desktop suites untouched and green.

### Phase 4 validation

- shell + smoke both projects: 11 passed / 9 intentionally skipped.
- Full `npm run validate`: Playwright 27 passed / 23 skipped; build, Vitest, lint green.
- Screenshots: at 375×667 the full HUD line now fits, the canvas gained the reclaimed topbar
  height, and the topbar reads picker-first.

## Phase 3 (2026-07-05) — what changed

**P0-4 fixed (game over was a frozen screen on mobile):** end-of-run messaging moved out of the
one-line HUD (which clipped it off at mobile widths) into a centered, width-scaled overlay text
in `BaseGameScene` — `GAME OVER` / `CLEARED` plus a device-correct second line ("Tap ● to
restart" on coarse pointers, "Press Space to restart" otherwise). Pixel-verified via a polled
canvas readback (the 140ms death camera flash tints every pixel while it decays, so the
assertion waits it out).

**P2-12 fixed (HUD clipping):** HUD font scales with canvas width (`clamp(10..16px, width/26)`),
and Lane Rush's raw `Speed 0.223` is now `Spd 0.22`. Scene files touched ⇒ pixel-signature
switching spec re-run green.

**P1-7 fixed (keyboard copy on touch devices):** `GameDefinition` gained `controlsTouch`; the
shell hint picks it on `pointer: coarse` devices. The two exact-string mobile assertions in
`tests/shell.spec.ts` were updated in this same slice (desktop strings untouched).

**P2-11/P2-14 fixed:** mobile picker options carry persisted highs (`Neon Serpent · High 777`),
live-updated on `arcade-high-score`; the select blurs after a choice like the cards do.

### Phase 3 validation

- Mobile shell specs: 4 passed (hint copy, game-over overlay + picker highs + blur,
  pressed/repeat, no-overlap). Fail-first verified for the hint copy and overlay tests.
- `tests/switching.spec.ts` desktop: green (scene presentation changed).
- Full `npm run validate`: Playwright 27 passed / 23 intentionally skipped; build + tsc,
  54 Vitest, lint all green.

## Phase 2 (2026-07-05) — what changed

**P1-5/P1-8 fixed (dead touch feedback, iOS tap artifacts):** `TouchControls` now toggles an
`is-pressed` class on `pointerdown`/`pointerup`/`pointercancel`/`pointerleave` (the existing
`:active` styles never fired on touch because `preventDefault` on pointerdown suppresses
`:active` in Chromium). Buttons/selects get `-webkit-tap-highlight-color: transparent` with
explicit pressed styles instead; the d-pad gets `user-select: none`; Restart/select/cards get
`touch-action: manipulation` (no double-tap zoom on rapid Restart taps).

**P1-6 fixed (no hold-to-repeat):** held direction buttons now dispatch repeats (300ms delay,
then 90ms interval — parity with OS key repeat), timers cleared on every pointer-end path and
re-armed safely on repeated pointerdown. **ACTION stays single-shot** so holding ● cannot spam
restart/fire. A discrete tap still emits exactly one input (the pre-existing mobile smoke test
is unchanged and green).

**P1-9 fixed (thumb reach):** `.touch-controls` is now two thumb zones — direction cross on the
left, a full-height (178px × ~104px) action button anchored right — so move + fire works with
both thumbs without crossing mid-screen. Restart and the game select are ≥44px tall on mobile
only (desktop metrics untouched).

**New regression (`tests/shell.spec.ts`, mobile — "touch buttons show pressed feedback and
directions repeat while held"):** pressed class appears/clears; holding LEFT 700ms emits ≥3
semantic inputs and stops on release; a tap emits exactly one; held ACTION emits exactly one.
**Fail-first verified** against the pre-fix TouchControls.

### Phase 2 validation

- Mobile shell specs: 3 passed (pressed/repeat, no-overlap, hint/picker).
- `shell + smoke` both projects: 10 passed / 8 intentionally skipped.
- Full `npm run validate`: build + tsc, 54 Vitest, lint, Playwright 26 passed / 22 skipped.
- Screenshot re-run: split layout verified at 390×844; no-overlap regression still green with
  the new grid.

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
