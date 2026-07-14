# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (Phase 0
deliverable — the design contract for Phases 1–5). System map:
`CURRENT_APP_STATE.md`. Prior pass (leaderboard, phases 0–6) is merged and
archived in git history.

## Phase status

| Phase | Scope                                            | Status              |
| ----- | ------------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation)       | **done** (this run) |
| 1     | Design tokens + base shell polish                | next                |
| 2     | Home screen revamp                               | pending             |
| 3     | Game mode shell revamp (topbar, controls, bezel) | pending             |
| 4     | Game-over + leaderboard panel revamp             | pending             |
| 5     | Motion and polish                                | pending             |
| 6     | Cross-viewport validation + docs                 | pending             |

## Phase 0 (this run) — audit + spec

**What changed:** documentation only — zero `src/` changes, zero test changes.

- `UI_REVAMP_SPEC.md` (new): full audit verdict (**PROCEED**), visual language,
  color-token plan (no existing token values change; new decorative/scale
  tokens), typography/spacing/chamfer systems, panel/card/button state specs,
  motion rules, per-viewport layout specs, leaderboard-panel state matrix,
  computed WCAG contrast table (all pairs ≥4.38:1, text ≥5.37:1), test impact
  map (**zero planned pin updates**), fragile-pin list beyond the loop traps,
  and the must-not-change consolidation.
- Before-screenshots captured (12): `output/ui-revamp/before/*.png` —
  desktop/mobile/landscape × dark/light × home/game/game-over-with-forced-panel
  (leaderboard forced via `__ARCADE_LB_FORCE__` + route mocks against the local
  dev server; no real API touched). Untracked evidence, referenced not
  committed. Screenshot script: session scratchpad (rebuildable from the spec).

**Key audit findings feeding Phases 1–5:** desktop home is a floating island;
light theme currently reads generic-SaaS (anti-goal); mobile topbar spends ~1/6
of the viewport; ACTION button is a raw magenta slab; leaderboard panel opens
with error-toned helper text before any typing and its placeholder clips
narrow; sidebar cards reserve dead space (`min-height: 2.6em`); case-study
copy is stale ("73 tests" → actual 154) and unpinned by tests (safe to fix in
Phase 3).

**Commands + results:**

- Dev server on :4199 + Playwright screenshot script → 12/12 captured.
- WCAG contrast computation for every current + proposed text pair → table in
  spec §11, all pass.
- `npx prettier --check` on new/changed docs → clean. No build/test run needed
  (no source changes; repo state identical to `main` + docs).

## Next task (Phase 1) — start cold here

Implement **design tokens + base shell polish** per `UI_REVAMP_SPEC.md` §2–§5,
§7 (base parts only):

1. In `src/style.css`: add the new token block (spacing/radius/chamfer/motion/
   mono-font/decorative tokens, dark + light) and fold existing literal glows/
   durations into them with **zero visual delta** first, then apply: page
   vignette, panel bevel + chamfer (`.panel`, NOT `.game-root`/cards), topbar
   button treatments, score lines → `--font-mono`.
2. Do not touch: `--bg` hexes, `touch-action` anywhere, focus-ring rule,
   `.game-root` client-box geometry, any selector/copy (spec §13/§14 lists).
3. Verify: `npx playwright test shell home smoke --project=desktop
--project=mobile`, then full `npm run validate`; screenshot after-states into
   `output/ui-revamp/phase1/` (both themes); commit only if green; update this
   file.

## Known constraints carried forward

- Zero planned test-pin updates all pass; if a bezel treatment shifts the
  canvas client box, revert to a box-neutral technique — never touch
  `switching.spec` thresholds.
- Chamfered elements carry glows as inset shadows or on a parent (clip-path
  clips outer shadows).
- Landscape 667×375 disjointness is tight: mobile topbar work must be
  height-neutral or smaller.
- The optional `LeaderboardPanel.ts` helper-tone micro-tweak (spec §10) is
  Phase 4, ≤5-line budget, skip if it grows.
