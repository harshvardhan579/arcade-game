# Pocket Arcade — Mobile Browser UI Audit

> **Status (2026-07-05, end of mobile UI pass):** all P0/P1/P2 findings fixed on branch
> `mobile-ui-pass-1` (commits `3049502`…`f678ccd`). All eleven §4 acceptance criteria met and
> e2e-asserted where cheap: no-overlap/fit at four portrait sizes, pressed feedback +
> hold-to-repeat + single-shot ACTION, game-over overlay pixels, touch hint copy, picker high
> scores + blur, landscape playability at 667×375/844×390/932×430, d-pad accessible names, and
> a reduced-motion touch run. Honest caveats: real-device dvh/safe-area/long-press behavior is
> on the manual QA list in `NEXT_RUN.md`; landscape HUD can truncate its tail on ≤215px
> canvases; iPad-landscape (coarse pointer, >500px height, ≥900px width) still gets the
> desktop layout — both recorded as non-blocking follow-ups.

Audited 2026-07-05 on branch `mobile-ui-pass-1` (desktop UI pass complete and green). Scope: **mobile browser UI only** — viewport fit, touch controls, mobile picker, canvas sizing, thumb reach, orientation, instructions, high scores, restart, touch affordances, readability, and mobile performance. No gameplay, logic, or desktop-layout changes.

Viewports inspected via live headless captures + measured DOM rects (`metrics.json`): 375×667 (iPhone SE), 390×844 (iPhone 12–14), 412×915 (mid-size Android), 430×932 (iPhone Pro Max), and landscape 667×375, 844×390, 932×430. Frameworks applied: UI/UX Pro Max mobile checklist (touch targets, safe areas, feedback timing), Bencium critique (hierarchy, spacing, typographic restraint), Vercel Web Interface Guidelines (tap-highlight, `touch-action: manipulation`, safe-area insets, dvh, input feedback).

## 1. Current mobile UI problems, ranked by severity

### P0 — unplayable or broken on real phones

1. **The canvas paints on top of the d-pad on short viewports.** `.game-root`'s mobile sizing uses a stale chrome estimate (`calc((100vh - 230px) * var(--game-aspect))` / `max-height: calc(100vh - 230px)`), but the real chrome is ~330px (topbar 108 + two 12px gaps + d-pad 178 + 20px padding). The aspect-ratio box overflows its `minmax(0, 1fr)` grid row, and because `.game-root` is `position: relative` it paints **above** the later-in-DOM `.touch-controls`. Measured at 375×667: game-root spans y 130–567 while the controls start at y 463 — the **↑ button is fully hidden, ←/●/→ are ~75% buried, only ↓ is usable**. Neon Serpent (the default game, which needs UP) cannot be played on an iPhone SE-class device. At 390×844+ the width clamp masks the bug, but any short viewport (SE, small Androids, tall-chrome browsers) hits it. Fix pattern already exists: the desktop block solved the identical problem with `height: 100%; width: auto; max-width: 100%` inside the flexible row — derive size from the row, not from a viewport constant.
2. **Landscape phones are broken on both sides of the breakpoint.**
   - `< 900px` wide (667×375, 844×390): the same `100vh - 230px` math yields a **108×145px / 120×160px postage-stamp canvas** floating mid-screen, still overlapping the d-pad (↑ and most of ● buried behind it). HUD shows only "Score 0". Unplayable and absurd-looking.
   - `≥ 900px` wide (932×430, iPhone Pro Max landscape): the width-only breakpoint serves the **desktop three-column layout to a touch phone** — `.touch-controls` is `display: none`, there is no mobile picker, and there is no keyboard. Zero working game inputs. The breakpoint must consider pointer capability (`pointer: coarse` / `hover: none`), not width alone.
3. **`100vh` + `overflow: hidden` clips the bottom control row behind mobile browser chrome.** `.arcade-shell` is `height: 100vh` and the page cannot scroll; on iOS Safari (and Chrome Android with the URL bar visible) the visual viewport is shorter than `100vh`, so the ↓ button sits partially under the browser toolbar and taps hit browser chrome instead. Not observable in headless emulation (all portrait runs report `scrollHeight == innerHeight`); this is a code-certain real-device defect. Fix: `100dvh`/`100svh` in the mobile block, `viewport-fit=cover` on the meta tag, `env(safe-area-inset-bottom)` padding under the controls.
4. **Game over on mobile shows no way to continue.** The HUD is a single 16px monospace line that clips at mobile canvas widths. Captured at 390×844 (Lane Rush, self-crash): `Score 12  High 12  Speed 0.223  GAME` — the **"OVER - press Space" tail is clipped off**, and there is no other game-over text, so a dead game reads as a frozen screen. Even unclipped, "press Space" is keyboard copy; the touch restart is ● (ACTION) or the Restart button. Also visible: the raw float `Speed 0.223` (unformatted `hudExtra`) is what pushes the line past the canvas edge.

### P1 — amateur signals and real friction

5. **Touch buttons give no pressed feedback.** `TouchControls` calls `event.preventDefault()` on `pointerdown`, which suppresses `:active` in Chromium — the existing `.touch-button:active` background/translate styles never fire on touch. Every tap is visually dead (guideline floor: visible feedback within ~100ms). Fix with an explicit pressed class toggled on `pointerdown`/`pointerup`/`pointercancel`, not `:active`.
6. **No hold-to-repeat on the d-pad.** Keyboard players get OS auto-repeat (hold ← keeps moving); touch dispatches exactly one input per tap. Star Courier strafing, Lane Rush lane-weaving, and Circuit Stack soft-drops demand machine-gun tapping. Implement repeat (initial delay ≈ 300ms, interval ≈ 80–120ms) in `TouchControls` with timers cleared on `pointerup`/`pointercancel`/`pointerleave`. This stays in the UI layer (semantic-input events); logic untouched. The mobile smoke test (single click on DOWN → one move) stays valid because a click's press duration is far below the initial delay.
7. **Keyboard copy on a touchscreen.** The controls hint reads "Arrows steer · eating speeds up · Space restarts", "← → move · Space fires" on devices whose actual controls are the d-pad and ●. Constraint: `tests/shell.spec.ts` (mobile project) asserts two of these exact strings — device-aware copy must update that spec deliberately in the same slice. Desktop hint strings (asserted in the desktop project and `tests/switching.spec.ts`) must not change.
8. **iOS tap artifacts are unhandled.** No `-webkit-tap-highlight-color` reset (grey flash on every control), no `user-select: none` on the d-pad (long-press can pop the text-selection magnifier/callout on the arrow glyphs), no `touch-action: manipulation` on Restart/select/cards (rapid double-tap on Restart — the most common post-death action — can trigger double-tap zoom; `.game-root` and `.touch-controls` are already `touch-action: none`).
9. **D-pad ergonomics ignore thumb zones.** All five buttons cluster in a centered cross ~250–280px wide, leaving 48–75px dead margins each side; move+fire simultaneously (Star Courier) forces both hands to converge mid-screen. Standard mobile-arcade split — directions in the left cluster, action anchored right — fits both thumbs' natural arcs. Button size itself is fine (88×54 ≥ 48dp, 8px gaps); Restart and the select are 42px tall, just under Apple's 44pt floor.
10. **Topbar hierarchy is inverted for a phone.** The 108px topbar spends its space on a two-line uppercase marketing eyebrow ("ZERO-ASSET HTML5 RETRO ARCADE") and a two-line hint, while the brightest element on screen is the Restart CTA — visually outweighing the game picker above it, which is the actual primary mobile control. Compact the eyebrow, let the picker lead, and demote Restart to secondary weight.

### P2 — polish gaps

11. **High scores are invisible on mobile.** The selector cards (which carry `High N`) are `display: none`; only the in-canvas HUD shows the current game's high. Cheapest fix: fold scores into the picker options (`Neon Serpent · High 120`), updated on `arcade-high-score`.
12. **HUD density fails at 327px.** At 375×667 the HUD clips mid-token ("Spd" with no value). Needs width-aware font-size or shorter labels on narrow canvases, plus formatting `Speed 0.223` → `Spd 0.2` (scene-presentation change only; re-run the switching spec after touching any scene file).
13. **Canvas renders at CSS resolution (1×) and upscales on 2–3× DPR screens** — HUD text is soft. `pixelArt: true` makes chunky pixels semi-intentional; a DPR-aware resolution bump would multiply fill cost on low-end phones. Treat as measure-first/optional; likely accept and document.
14. **The select keeps focus after choosing a game** (cards blur on click; the select does not) — a lingering focus ring on some browsers and inconsistent behavior with the card path.
15. **No safe-area insets anywhere** (`env(safe-area-inset-*)`) — needed once `viewport-fit=cover` lands, and for home-indicator clearance under the d-pad.

**Hygiene note (out of scope, worth one cleanup commit):** the repo root contains ~13 empty junk directories (`The`, `following`, `lines`, `have`, `been`, `added`, `by`, `Docker`, `Desktop`, `to`, `enable`, `CLI`, `completions.`) created 2026-07-03 by an unquoted shell string. Git ignores empty dirs so status stays clean, but any `ls` looks vandalized.

## 2. What makes the app feel amateur or hard to play on mobile

- The default game's **controls are buried under the canvas** on a common phone size — the app looks broken within one second on an iPhone SE.
- **Game over = frozen screen.** No visible instruction, and the clipped HUD tail is keyboard copy anyway.
- **Keyboard instructions on a touchscreen** ("press Space", "Arrows steer").
- **Buttons that don't react** when pressed, plus the stock iOS grey tap flash where feedback does exist.
- **Machine-gun tapping** to do what desktop does by holding a key.
- **Rotating the phone collapses the app** — either a stamp-sized canvas behind the d-pad or the desktop layout with no inputs at all.
- A **marketing slogan eating two lines** of a 667px-tall screen while gameplay clips.
- Raw debug-looking values in the HUD (`Speed 0.223`).

## 3. What should NOT be changed (already working)

- **Mobile information architecture:** single-column stage, side panels hidden, `<select>` picker in the topbar, d-pad below the canvas. The structure is right; the execution needs fixing.
- **The input event flow:** `TouchControls` → `arcade-virtual-input` → `InputManager` → `arcade-semantic-input`. Scenes must not grow touch-specific handlers; all mobile input work stays in the UI layer.
- **Test-asserted hooks:** `.touch-controls`, `data-arcade-input`, `.mobile-game-select`, the `Choose game` aria-label, `.controls-hint`, `.game-card`, `.card-high`, `#game-root canvas`, the Restart button's accessible name, the single `h1`.
- **Touch button geometry basics:** 88×54px buttons with 8px gaps pass the 48dp bar — reposition, don't shrink.
- **16px select font** (prevents iOS zoom-on-focus) — never drop form-control font below 16px.
- **Focus-visible yellow rings**, `overscroll-behavior: none`, `touch-action: none` on `.game-root` and `.touch-controls`.
- **The ≥900px desktop layout on actual desktops** — e2e-asserted at four laptop viewports. The landscape-phone fix must key on pointer capability, never on lowering the width breakpoint.
- **Canvas bezel + scanline identity and the dark palette** — consistent with the desktop pass; reuse, don't fork.
- **Audio unlock lifecycle** (single AudioContext, no listener growth — `tests/audio.spec.ts`).

## 4. Acceptance criteria for a polished mobile browser UI

1. **No overlap, no clipping:** at 375×667, 390×844, 412×915, 430×932, with any game selected — canvas, all five touch buttons, picker, and Restart are fully inside the viewport and mutually non-overlapping (e2e: bounding-box disjointness + `toBeInViewport`).
2. **Dynamic-chrome safe:** no bare `100vh` in the mobile layout (use `dvh`/`svh`), `viewport-fit=cover` in the meta viewport, `env(safe-area-inset-bottom)` clearance under the controls; no page scroll and no rubber-band during gameplay swipes.
3. **Pressed feedback within one frame** on every touch control via a class (not `:active`), no default grey tap-highlight, no long-press selection/callout on the d-pad, `touch-action: manipulation` on all tappable shell controls that aren't already `none`.
4. **Hold-to-repeat** on direction buttons (≈300ms initial delay, then ≈80–120ms interval), timers cleaned on `pointerup`/`pointercancel`/`pointerleave`; a discrete tap still emits exactly one input (existing mobile smoke test green unmodified).
5. **Game over is self-explanatory on touch:** a visible restart affordance with device-correct wording that never clips at 327px canvas width; the HUD line fits all four portrait widths (no mid-token truncation).
6. **Touch-correct instructions:** the controls hint on coarse-pointer devices describes the d-pad/●, with the mobile spec strings updated in the same slice (desktop strings untouched).
7. **Landscape phones are handled deliberately:** coarse-pointer landscape (667×375 through 932×430) gets either a playable side-by-side composition (canvas centered, controls split to the sides) or a styled "rotate to portrait" prompt — never the desktop shell without inputs, never a sub-200px canvas, never buried buttons.
8. **Thumb-reach layout:** directions and action are operable simultaneously with two thumbs without hands crossing the screen center; primary interactive elements ≥44px tall (Restart and select included).
9. **Mobile high-score visibility:** per-game highs reachable without launching each game (e.g. in the picker options), live-updated on `arcade-high-score`.
10. **Desktop is provably unregressed:** all desktop-project suites green unmodified (shell, smoke, games, switching pixel signatures, highscore, audio); the four-viewport no-scroll test untouched.
11. **Full `npm run validate` green**; every fix that has a cheap assertion gets one; nothing weakened.

## 5. Phase plan

Executable loop: `.claude/mobile-ui-loop.md`. Phases map to findings:

- **Phase 1 — Viewport fit, no accidental scroll, safe canvas sizing:** fix P0-1/P0-3 (row-derived canvas sizing replacing the `230px` constant, dvh/svh, viewport-fit, safe-area) + fail-first no-overlap e2e at all four portrait sizes.
- **Phase 2 — Touch controls & thumb ergonomics:** P1-5/6/8/9 (pressed class, tap-highlight/user-select/touch-action, hold-to-repeat, split or right-anchored action layout, 44px Restart/select).
- **Phase 3 — Picker, restart, high scores, instructions:** P0-4, P1-7, P2-11/12/14 (game-over affordance + HUD fit, device-aware hint copy with deliberate spec update, scores in picker, select blur).
- **Phase 4 — Mobile HUD/canvas framing, reduced clutter:** P1-10, P2-12 remainder (topbar compaction, eyebrow demotion, spacing rhythm, dead-space balance, `Speed` formatting).
- **Phase 5 — Touch accessibility, focus/active states, orientation:** P0-2, P2-15 (coarse-pointer landscape strategy, aria-labels on d-pad buttons, focus-visible on touch, reduced-motion verification on mobile).
- **Phase 6 — Mobile screenshot verification & full validation:** regenerate the capture set, criterion-by-criterion check, `npm run validate`, flake runs.
- **Phase 7 — Docs & close:** README shell section, this file's status header, `NEXT_RUN.md`, merge recommendation.

## 6. Screenshots

Ephemeral session captures (not committed) + measured rects:

- `…/scratchpad/ui-audit/iphone-se-375x667.png` — **P0-1**: ↑ hidden, ←/●/→ buried under the canvas; HUD clips at "Spd".
- `…/scratchpad/ui-audit/iphone-14-390x844.png` — layout OK at this height; baseline for composition.
- `…/scratchpad/ui-audit/android-412x915.png`, `…/promax-430x932.png` — same-safe; dead margins beside the d-pad visible.
- `…/scratchpad/ui-audit/landscape-667x375.png` — **P0-2a**: 108×145px canvas overlapping the d-pad.
- `…/scratchpad/ui-audit/landscape-844x390.png` — same defect at 120×160px.
- `…/scratchpad/ui-audit/landscape-932x430.png` — **P0-2b**: desktop layout on a phone; no touch controls.
- `…/scratchpad/ui-audit/gameover-390x844.png` — **P0-4**: HUD clipped at "GAME"; no restart instruction visible.
- `…/scratchpad/ui-audit/metrics.json` — all measured rects backing §1.

Regenerate: `node …/scratchpad/ui-audit/mobile-shots.mjs` with the dev server on port 4173 (script loops the seven viewports, waits for `window.__ARCADE__`, screenshots, and dumps rect metrics; Phase 6 of the loop re-runs it).

## 7. Test plan for mobile UI changes

- **New mobile assertions (add to `tests/shell.spec.ts`, mobile project):**
  - No-overlap/fit regression: loop 375×667, 390×844, 412×915, 430×932 (`page.setViewportSize`), assert every `.touch-button` and the canvas `toBeInViewport` and that the canvas box does not intersect the `.touch-controls` box. **Must fail against current CSS at 375×667 before the Phase 1 fix** (stash-verify like the desktop pass).
  - Pressed feedback: `pointerdown` on a d-pad button adds the pressed class; `pointerup` removes it.
  - Hold-to-repeat: dispatch pointerdown, hold ~700ms, assert ≥2 tick-visible moves; single click still moves exactly once per existing smoke test.
  - Landscape guard: coarse-pointer context at 932×430 asserts working inputs exist (touch controls visible or rotate prompt shown).
- **Existing specs that constrain the pass:** `tests/shell.spec.ts` mobile test (exact hint strings — update only in the deliberate copy slice; `toBeInViewport` on `.touch-controls`), `tests/smoke.spec.ts` mobile d-pad test (`[data-arcade-input]` single-tap semantics), `tests/switching.spec.ts` pixel signatures (desktop project — re-run whenever any `*Scene.ts`/`BaseGameScene.ts` presentation changes), `tests/highscore.spec.ts` (`.card-high` format if picker options gain scores — cards themselves unchanged), `tests/audio.spec.ts` (window-level listener counts must not grow; d-pad repeat timers live on elements, not window).
- **Per slice:** narrowest affected spec → `tests/shell.spec.ts` + `tests/smoke.spec.ts` on **both** projects (desktop regression proof) → full `npm run validate` whenever `src/style.css`, `src/ui/*`, `src/main.ts`, `index.html`, or any scene file changes.
- **Visual:** re-run the capture script after each visually-scoped phase; judge against §4.
- **Real-device caveat:** dvh/safe-area behavior can't be proven headless — record a 2-minute manual QA list (iOS Safari portrait: bottom row clear of toolbar; long-press d-pad: no magnifier; double-tap Restart: no zoom) in `NEXT_RUN.md` at close.

## 8. Hard rules for this pass

1. **Never touch** `src/games/*Logic.ts`, `SeededRandom` draw order, or gameplay rules. Scene edits are presentation-only (HUD sizing/copy, game-over overlay text) and require re-running `tests/switching.spec.ts` — keep signature colors and thresholds intact (new overlay text must not add large areas of `#ff4fd8` magenta, `#4dffe1` cyan in the ship region, or the other signature colors).
2. **Desktop must not regress:** the ≥900px block's semantics stay; the four-laptop-viewport no-scroll test and all desktop-project suites stay green unmodified. Landscape-phone handling uses `pointer: coarse`/`hover: none` media queries so desktop browsers (fine pointer) never see it; Playwright's desktop project (fine pointer) and mobile project (Pixel 5, coarse) can each assert their side.
3. **Mobile-scope all CSS** in `@media (max-width: 899px)` or new coarse-pointer queries; changes to shared tokens/base rules require desktop suites + a desktop screenshot re-check in the same slice.
4. **Do not rename/remove protected hooks** (§3 list). Exact-string hint assertions change only in the dedicated copy slice, called out in the commit message.
5. **Input semantics:** one semantic input per discrete press is contract; repeat is additive after a delay, implemented in `TouchControls` only, timers cleaned on `pointerup`/`pointercancel`/`pointerleave`. No new `window` listeners that grow across scene cycles (audio spec counts them).
6. **Zero-asset rule stands:** no images, SVG files, icon fonts, or webfonts — d-pad glyphs stay text/CSS; any new visuals are CSS or Phaser Graphics.
7. **Honor `prefers-reduced-motion`** — the global zeroing must cover any new pressed/transition animation.
8. **Strict TS, ESLint, Prettier, import boundary** all green before any commit; full `npm run validate` for shared-layout slices.
9. **Never weaken a test.** New assertions are added; a changed assertion means the slice deliberately changed the asserted behavior and says so.
10. **Do not fake progress:** anything unverifiable headless (real iOS chrome behavior) is listed as manual QA in `NEXT_RUN.md`, not claimed done.
