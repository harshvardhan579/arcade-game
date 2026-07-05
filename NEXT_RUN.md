# NEXT_RUN — Desktop UI Pass Complete (+ QA hardening)

## QA hardening addendum (2026-07-05, final desktop slice)

The "keyboard is met behaviorally" claim from the pass close-out was **wrong**, and the dedicated test written to close that gap proved it: `InputManager` called `preventDefault()` on every mapped key regardless of target, so Enter/Space on a focused game card or the Restart button was swallowed by the game-input layer — keyboard users could not activate any shell button. Existing suites missed it because they always clicked with the mouse and pressed keys with body focus.

**Fix:** `InputManager.onKeyDown` now ignores key events targeting interactive elements (`button/select/input/textarea/contenteditable`), restoring native activation; card and Restart click handlers blur after dispatch so gameplay keys flow to the game immediately after any activation, mouse or keyboard.

**New regression (`tests/shell.spec.ts` — "keyboard reaches, sees, and activates the shell controls"):** tab order walks the five cards then Restart; the focus-visible ring is computed-style-asserted (2px solid); Enter on a focused card switches the game and updates the hint; a gameplay key then moves the piece, proving focus release. Verified to fail (timeout at Enter activation) against the pre-fix code.

**Validation:** full `npm run validate` ✓ (build + tsc, 54 Vitest, lint, e2e 24 passed / 20 intentionally skipped); games + shell desktop suites 26/26 under `--repeat-each=2`; layout regression re-ran green at all four laptop viewports; pixel signatures untouched.

**Desktop is ready for the mobile pass.**

## Final state (2026-07-05, branch `desktop-ui-pass-1`)

The laptop/desktop UI pass driven by `UI_DESKTOP_AUDIT.md` and `.claude/desktop-ui-loop.md` is complete. All seven phases executed in green slices; no gameplay, logic, or scene-draw code was touched; no test was weakened.

## Commits in this pass

| Commit    | Phase | Summary                                                                                              |
| --------- | ----- | ---------------------------------------------------------------------------------------------------- |
| `06f32b3` | Audit | Screenshot-driven desktop audit + execution loop                                                     |
| `dc8182f` | 1     | P0s fixed: d-pad hidden on desktop, true-fit no-scroll layout, centered canvas, single brand heading |
| `1929a24` | 2     | Card hierarchy, even heights, eased hover/active, Now Playing badge, tabular numerals                |
| `f37e1a1` | 3     | Case-study panel rewritten: accurate content in four labeled sections                                |
| `b54df15` | 4     | Neon brand glow, interaction transitions, dark scrollbars, meta description/theme-color              |
| `26a40e6` | 5     | Layout regression extended to all four laptop viewports + horizontal-overflow assertion              |
| this      | 6–7   | Final screenshots, flake runs, docs status                                                           |

## Validation

- Full `npm run validate` ✓ — build + strict tsc, 54 Vitest, ESLint + import boundary + Prettier, Playwright 23 passed / 19 intentionally skipped (includes the new desktop layout regression).
- Flake confidence: `tests/shell.spec.ts` + `tests/switching.spec.ts` 8/8 under `--repeat-each=2`.
- The Phase 1 regression was verified to fail against the pre-fix CSS before committing.
- Pixel-signature switching tests passed unmodified throughout (all changes were DOM/CSS; canvas untouched).
- Mobile specs (smoke, shell picker + first-viewport, highscore) green after every shell change — mobile behavior unchanged.
- Screenshot-verified at 1440×900, 1280×800, 1512×982, 1366×768: no clipped chrome, no scroll, composed three-column cabinet.

## Remaining polish ideas (non-blocking)

1. Typographic apostrophes/quotes in shell copy (currently straight in places).
2. A dedicated keyboard-navigation e2e (tab-order walk + Space-on-focused-card no-double-fire) — behavior is correct and indirectly covered, but not pinned by a targeted test.
3. Mobile UI pass (explicitly out of scope here).
4. Optional: subtle background animation behind the columns (reduced-motion-gated) if more identity is wanted later.

## Manual QA (~3 minutes)

1. `npm run dev` at a laptop window: confirm no scrollbars, no d-pad, one glowing "Pocket Arcade", GAMES label, NOW PLAYING on the active card.
2. Hover cards and Restart (eased glow), Tab through cards → Restart (yellow focus rings), pick each game — hint and canvas follow.
3. Read the case-study column — content matches the actual games.

## Merge recommendation

Ready for review. `desktop-ui-pass-1` contains the audit plus six green implementation commits, stacked on the completed playtest pass (`fable-playtest-fixes-1`). Suggested: PR `desktop-ui-pass-1` → `main` (or into the playtest branch's PR if that one is still open).
