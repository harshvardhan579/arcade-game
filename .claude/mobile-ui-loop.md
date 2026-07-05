# Pocket Arcade Mobile UI Loop

You are running a **mobile browser UI perfection pass**. Read `UI_MOBILE_AUDIT.md` first — it holds the ranked findings (P0-1…P2-15), acceptance criteria, protected-hooks list, and hard rules; this file is the execution procedure. Also obey `CLAUDE.md` (zero assets, import boundary, pixel-signature contract, RNG discipline).

**Scope guard:** mobile shell/DOM/CSS and the touch input layer (`src/ui/TouchControls.ts`, mobile blocks of `src/style.css`, `src/ui/ArcadeShell.ts`, `src/ui/GameSelector.ts`, `index.html`) only. No gameplay changes, no `*Logic.ts` edits, no new RNG draws. Scene files (`BaseGameScene.ts`, `*Scene.ts`) may change **presentation only** (HUD sizing/format, game-over affordance text) — re-run `tests/switching.spec.ts` whenever one is touched. Desktop is stable and out of scope: every slice must prove desktop unchanged (desktop-project specs green, no edits inside the `@media (min-width: 900px)` block unless a slice explicitly needs a shared token — then full validate + desktop screenshot).

## Per-iteration procedure

1. **Orient:** `git status`, `git log --oneline -5`, read `NEXT_RUN.md` for the current phase pointer. If the repo is red, fixing it is the slice.
2. **Inspect before editing:** read the exact files the slice touches and the specs that assert them (`UI_MOBILE_AUDIT.md` §7–8). Do not edit from memory.
3. **Smallest coherent mobile change** for the current phase. One concern per slice.
4. **Verify, in order:**
   - targeted new/changed spec first (fail-first against pre-fix code where the audit demands it);
   - `npx playwright test tests/shell.spec.ts tests/smoke.spec.ts` (both projects — mobile fix + desktop regression in one run);
   - `npx playwright test tests/switching.spec.ts --project=desktop` if any scene file changed;
   - full `npm run validate` whenever `src/style.css`, `src/ui/*`, `src/main.ts`, `index.html`, or any scene file changed.
5. **Screenshot** for visually-scoped slices: run the capture script (`node <scratchpad>/ui-audit/mobile-shots.mjs` with dev server on 4173, or recreate it from `UI_MOBILE_AUDIT.md` §6) at minimum 375×667 + 390×844; judge against §4 criteria.
6. **Commit only if green**; descriptive message; never leave the repo red without documenting the failing command + suspicion in `NEXT_RUN.md`.
7. **Update `NEXT_RUN.md`:** what changed, validation results, phase status, next task.

## Phases (strict order)

### Phase 1 — Mobile viewport fit, no accidental scroll, safe canvas sizing

- Replace the `230px` chrome-estimate sizing of `.game-root` in the `@media (max-width: 899px)` block with row-derived sizing (the desktop block's `height: 100%; width: auto; max-width: 100%` pattern inside the `minmax(0, 1fr)` row) so the canvas can never overflow into the d-pad. (Fixes P0-1.)
- Swap mobile `100vh` for `100dvh` (layout) with an `svh` floor where needed; add `viewport-fit=cover` to the meta viewport; add `env(safe-area-inset-bottom)` clearance below `.touch-controls`. (Fixes P0-3, P2-15 groundwork.)
- **Add the no-overlap/fit e2e** (mobile project, `tests/shell.spec.ts`): at 375×667, 390×844, 412×915, 430×932 every `.touch-button` and the canvas are `toBeInViewport` and the canvas box does not intersect the `.touch-controls` box. **Confirm it fails at 375×667 against the pre-fix CSS** (stash trick) before committing.
- Desktop proof: shell + smoke on both projects; full validate (style.css + index.html are shared).

### Phase 2 — Touch controls / d-pad ergonomics and thumb reach

- Pressed feedback via a `.is-pressed` (or similar) class toggled on `pointerdown`/`pointerup`/`pointercancel`/`pointerleave` in `TouchControls` — do not rely on `:active` (suppressed by the existing `preventDefault`). Reset `-webkit-tap-highlight-color`, add `user-select: none` to the d-pad, `touch-action: manipulation` on Restart/select. (P1-5, P1-8.)
- Hold-to-repeat for direction buttons: ≈300ms initial delay, then ≈80–120ms interval; timers cleared on every pointer-end path; ACTION stays single-shot (avoid accidental restart spam). Verify the existing mobile smoke single-tap test still passes unmodified. (P1-6.)
- Thumb-reach layout inside `.touch-controls` (keep the class and `data-arcade-input` hooks): directions as a left-cluster, ● anchored right — or the smallest layout change that satisfies §4-8. Buttons stay ≥ current size; Restart/select to ≥44px height.
- New assertions: pressed-class toggle; hold ≈700ms ⇒ ≥2 moves; then shell+smoke both projects.

### Phase 3 — Mobile picker, restart, high scores, instructions readability

- Game-over affordance: device-correct, never-clipping restart message (e.g. second HUD line or centered overlay text on the darkened game-over wash) in `BaseGameScene` presentation; verify at 327px canvas width; re-run switching spec (scene touched) and confirm signature thresholds hold. (P0-4.)
- HUD fit at small widths: width-aware font-size or shortened labels; format Lane Rush `Speed 0.223` → compact form (scene/hudExtra presentation only). (P2-12.)
- Device-aware controls hint (coarse pointer ⇒ d-pad/● wording): update the two exact-string assertions in the mobile project of `tests/shell.spec.ts` **in the same slice**, called out in the commit message; desktop strings untouched. (P1-7.)
- High scores in the mobile picker options (`Title · High N`), live-updated on `arcade-high-score`; keep the `Choose game` aria-label and option `value`s (specs select by value). Blur the select after change for parity with cards. (P2-11, P2-14.)

### Phase 4 — Mobile HUD/canvas framing and reduced clutter

- Topbar compaction: demote/shorten the eyebrow on mobile, tighten the title block, let the picker lead visually, restyle Restart to secondary weight (keep its accessible name "Restart"). (P1-10.)
- Spacing rhythm: 4/8px audit of mobile paddings/gaps; balance dead space around canvas and d-pad at 390×844 and 430×932.
- Keep the bezel/scanline cabinet identity working at mobile sizes; no new decorative churn that ignores `prefers-reduced-motion`.
- Screenshot judgment at all four portrait sizes; shell+smoke both projects; full validate (shared CSS).

### Phase 5 — Touch accessibility, focus/active states, orientation behavior

- Landscape strategy behind coarse-pointer media queries (`pointer: coarse` / `hover: none`): playable side-by-side composition (canvas center, direction cluster left, action right) **or** a styled rotate-to-portrait prompt; must cover both `<900px` landscape and the 932×430 desktop-breakpoint hole. Desktop (fine-pointer) rendering provably unchanged at all four laptop viewports. (P0-2.)
- Add `aria-label`s to the five d-pad buttons ("Move up", "Fire / action", …) without changing `data-arcade-input`; confirm focus-visible rings on all mobile controls; reduced-motion emulation run on mobile project (pattern in `tests/games.spec.ts`).
- New assertion: coarse-pointer 932×430 context has working inputs (touch controls visible or prompt shown); desktop shell spec re-run to prove no change at ≥900px fine-pointer.

### Phase 6 — Mobile screenshot verification and full validation

- Regenerate the full capture set (four portrait + three landscape + game-over shot); compare against `UI_MOBILE_AUDIT.md` §4 criterion by criterion; fix or honestly log any miss.
- Full `npm run validate`; flake confidence: `npx playwright test tests/shell.spec.ts tests/smoke.spec.ts --repeat-each=2` (both projects).
- Record the real-device manual QA list (iOS toolbar clearance, long-press, double-tap Restart) in `NEXT_RUN.md`.

### Phase 7 — Docs, NEXT_RUN, final summary

- Update `README.md` (Responsive Shell section), `UI_MOBILE_AUDIT.md` (status header: criteria met/unmet, honestly), `NEXT_RUN.md` (final state, commit table, validation evidence, manual QA list, merge recommendation).
- Stop the loop.

## Stop conditions

Goal met (acceptance criteria pass and validation green); a blocking decision needs the user (e.g., landscape strategy choice if both options prove costly, or copy they should approve); or any change would require weakening a protected test — stop and report instead.
