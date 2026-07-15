# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (design contract;
§4 and §7 carry Phase 1/2 implementation notes). System map:
`CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                            | Status              |
| ----- | ------------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation)       | done (`bd0fbbc`)    |
| 1     | Design tokens + base shell polish                | done (`6665cc3`)    |
| 2     | Home screen revamp                               | **done** (this run) |
| 3     | Game mode shell revamp (topbar, controls, bezel) | next                |
| 4     | Game-over + leaderboard panel revamp             | pending             |
| 5     | Motion and polish                                | pending             |
| 6     | Cross-viewport validation + docs                 | pending             |

## Phase 2 (this run) — home screen revamp

**Files changed:** `src/style.css`, `src/ui/HomeScreen.ts` (one appended
`<p class="home-footer">`), plus this file and a spec §7 note. No selectors
renamed, no copy pins touched, no canvas/scene/leaderboard-behavior changes.

**Measured first:** the 375×667 portrait home fit had **zero** height slack
(last card bottom = 667 exactly) and 667×375 landscape already overflowed
~72px on `main` (fifth card clipped; the fit test passes on intersection).
Every additive treatment is therefore desktop-scoped, and landscape got a
reclaim instead.

**What changed:**

- **Header marquee**: tagline restyled as tracked-caps micro-label (copy
  unchanged; slightly smaller, so mobile header only shrank); ≥900px adds the
  72px neon wordmark rule (`h1::after`, empty content — heading pins intact).
- **Cards (all viewports, height-neutral)**: cabinet-face top sheen
  (`--edge-hi` gradient layer) + machined edge bevels; hover now lifts 1px
  with border+single-glow (hover uses `background-color` so the sheen layer
  survives); pressed keeps `translateY(1px)`; focus ring untouched.
- **Emblems**: inner screen vignette (like `.game-root`) + per-game accent
  borders — serpent cyan, bounce amber, courier pale, lane red-orange, stack
  magenta (theme-invariant identity colors on the literally-dark tiles);
  Star Courier's starfield brightened `#1d4650` → `#2d6a78`. Boxes stay 64px
  (interiors are pixel-positioned art — spec §7 note records the deviation).
- **Score line**: `.hs-world` gets weight 400 vs the bold amber `.hs-local`
  (textContent contracts untouched); ≥900px adds a hairline above the line.
- **Desktop presence (≥900px only)**: home stage 880 → 960px, grid
  `minmax(250px, 1fr)` + 14px gap, card padding 16px, and the new marquee
  footer `5 games · zero assets · every pixel procedural` (a `<p>`, hidden
  <900px, nothing focusable — home tab order toggle→cards intact).
- **Landscape home fix**: `(max-width: 899px) and (max-height: 500px)` drops
  the hook line + trims card padding 2px → all five cards fully on screen
  (measured +9px slack, was −72px).

**Fit measurements after:** 375×667 slack +4px · 667×375 slack +9px (was
−72) · 390×844 slack +97px. Zero page overflow at all three.

**Validation results (all green):**

- `npx playwright test home shell smoke leaderboard --project=desktop
--project=mobile` → 84 passed / 16 skipped (World fragments, flag-off
  zero-network, theme suite, no-scroll pins all included).
- Full `npm run validate` → build + api tsc + Vitest 154 + lint/boundary/
  prettier + Playwright **103 passed / 33 skipped** (baseline counts).

**Screenshots:** `output/ui-revamp/phase2/*.png` (desktop dark+light with
World fragments + highs, mobile portrait, 667×375 landscape). Compare with
`output/ui-revamp/before/`.

## Next task (Phase 3) — start cold here

Implement the **game mode shell revamp** per `UI_REVAMP_SPEC.md` §5, §7
(game-mode parts), §8, §9:

1. `src/style.css`: sidebar `.game-card` anatomy — mini-emblems (see 2),
   remove the dead `span { min-height: 2.6em }` reservation, `Now playing`
   chip restyle; topbar eyebrow as cabinet-marquee tag (desktop only);
   scanline overlay refinement (≤ current weight); mobile portrait topbar
   compaction (height-neutral or smaller — landscape disjointness pins are
   tight); d-pad bevel/pressed polish + ACTION gradient
   (`--action-hi/lo` + inner rim + `--on-accent` glyph — geometry, grid, and
   single-shot behavior byte-identical).
2. `src/ui/GameSelector.ts`: add `aria-hidden` emblem spans reusing
   `.home-logo home-logo--<id>` at ~40px (scale via `transform: scale()` on a
   64px box or a scoped size override — interiors are pixel-positioned;
   accessible names must not change).
3. `src/ui/CaseStudyPanel.ts`: typographic apostrophes + real test counts
   (154 Vitest / 8 Playwright suites) — verified unpinned by any spec.
4. Hard pins: controls-hint copy verbatim; tab order cards→Back→Restart→
   toggle; `.game-root` client box untouched (re-run `switching` after any
   change near it); touch-action map; ≥44px targets; `.is-pressed` mechanics;
   picker option text.
5. Verify: `npx playwright test shell switching games smoke
--project=desktop --project=mobile` → full `npm run validate` → screenshots
   to `output/ui-revamp/phase3/` → commit only if green → update this file.

## Known constraints carried forward

- Home 375×667 slack is now +4px — Phase 3+ must not add mobile home height.
- Bezel/frame work near `.game-root` stays box-neutral; never touch
  `switching.spec` thresholds.
- Chamfered elements: inset shadows only; no border stroke on cut diagonals
  (spec §4 note).
- The optional `LeaderboardPanel.ts` helper-tone micro-tweak stays parked for
  Phase 4 (≤5-line budget).
