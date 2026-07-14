# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (design contract;
§4 carries a Phase 1 implementation note). System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                            | Status              |
| ----- | ------------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation)       | done (`bd0fbbc`)    |
| 1     | Design tokens + base shell polish                | **done** (this run) |
| 2     | Home screen revamp                               | next                |
| 3     | Game mode shell revamp (topbar, controls, bezel) | pending             |
| 4     | Game-over + leaderboard panel revamp             | pending             |
| 5     | Motion and polish                                | pending             |
| 6     | Cross-viewport validation + docs                 | pending             |

## Phase 1 (this run) — tokens + base shell polish

**Files changed:** `src/style.css` only (plus this file and a spec §4 note).
No TS, no tests, no canvas, no selectors/copy touched.

**What changed (per spec §2–§5, §7 base):**

- **Token layer**: full new block in `:root` + light overrides — `--panel-2`,
  `--bezel`, `--edge-hi/lo`, `--trim`, `--glow-pink/amber`, `--vignette`,
  `--floor-glow`, `--action-hi/lo` (reserved for Phase 3), spacing scale
  `--space-1..6`, `--radius-1/2`, `--chamfer`, `--dur-1/2/3`, `--ease-out`,
  `--font-mono`. All existing token values untouched; `--bg` hexes frozen.
- **Room background**: static vignette + faint magenta floor glow layered onto
  the existing gradients (`body`), both themes.
- **Cabinet panels** (`.panel` = selector + case-study): 10px chamfer cuts
  (top-right + bottom-left) via clip-path, cyan `--trim` top edge light +
  `--edge-lo` bottom bevel as inset shadows (scroll-safe). Deviation recorded
  in spec §4: the 1px border stroke is absent along the two cut diagonals
  (pseudo-element workaround incompatible with scroll containers; accepted).
- **Bezel ring**: `.game-root` gains `0 0 0 4px var(--bezel), 0 0 0 5px
var(--line)` spread-shadow rings — box-shadow only, client box and canvas
  geometry untouched (pixel signatures verified green).
- **Buttons/chrome**: bevel edge-light insets on Back, theme toggle, picker,
  desktop Restart (on-accent white/dark bevel), mobile quiet-Restart overrides
  (both mobile blocks); hover states gain one `--card-glow`; all shell
  transitions folded to `--dur-1/2` + `--ease-out` (0.15s → 180ms is the only
  perceptible-in-principle timing shift).
- **Scoreboard type**: `.card-high` + `.home-card-high` now `--font-mono`,
  700, tabular (textContent unchanged — `High`/`World` pins intact).
- **Desktop-only topbar hierarchy**: hairline under `.topbar` + a 72px neon
  rule under the h1 (`h1::after`, empty content — accessible name and heading
  count untouched). Scoped to `min-width: 900px` so mobile/landscape topbar
  height is byte-identical (landscape disjointness pins are tight).

**Validation results (all green):**

- `npx playwright test shell home smoke --project=desktop --project=mobile`
  → 47 passed / 15 skipped.
- `npx playwright test switching --project=desktop` → 1 passed (pixel
  signatures intact — bezel ring is box-neutral as designed).
- `npx playwright test leaderboard --project=desktop --project=mobile`
  → 37 passed / 1 skipped.
- Full `npm run validate` → build (tsc root + api + vite) OK, Vitest 154, lint
  (eslint + import-boundary + prettier) OK, Playwright **103 passed /
  33 skipped** — identical counts to the pre-pass baseline.

**Screenshots:** `output/ui-revamp/phase1/*.png` (desktop dark/light home +
game, mobile dark game). Compare with `output/ui-revamp/before/*.png`.

## Next task (Phase 2) — start cold here

Implement the **home screen revamp** per `UI_REVAMP_SPEC.md` §5 (home card),
§7 (home layout):

1. `src/style.css` home blocks: card anatomy/hierarchy polish on the Phase 1
   tokens, hover/focus/pressed states, header marquee treatment (tagline as
   tracked caps with trim rules), larger emblem presence (72px on ≥900px only
   if the 375×667 fit still passes).
2. Optional tiny DOM addition in `src/ui/HomeScreen.ts`: a muted mono footer
   line (`<p>`, never a heading, nothing focusable, appended inside the
   existing flex column).
3. Hard pins: `.home-card-high` single-line; `.hs-local`/`.hs-world` split;
   home tab order (header toggle is the FIRST tab stop — nothing focusable
   before it); heading-role "Pocket Arcade" count stays 1; `.home-card` count
   5 + `.home-logo` count 5; no canvas elements; home no-scroll at 375×667 and
   667×375 with World fragments present.
4. Verify: `npx playwright test home shell smoke --project=desktop
--project=mobile` → full `npm run validate` → screenshots to
   `output/ui-revamp/phase2/` → commit only if green → update this file.

## Known constraints carried forward

- Bezel/frame work must stay box-neutral for `.game-root` (re-run `switching`
  after any change near it); never touch thresholds.
- Chamfered elements: inset shadows only; expect no border stroke on cut
  diagonals (spec §4 note).
- Landscape 667×375 disjointness is tight: mobile topbar must stay
  height-neutral (Phase 1 kept all mobile topbar metrics identical).
- The optional `LeaderboardPanel.ts` helper-tone micro-tweak stays parked for
  Phase 4 (≤5-line budget).
