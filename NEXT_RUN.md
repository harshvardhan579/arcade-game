# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (design contract;
§4/§7 carry Phase 1/2 implementation notes). System map:
`CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                      | Status              |
| ----- | ------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation) | done (`bd0fbbc`)    |
| 1     | Design tokens + base shell polish          | done (`6665cc3`)    |
| 2     | Home screen revamp                         | done (`d2c844c`)    |
| 3     | Game mode shell revamp                     | **done** (this run) |
| 4     | Game-over + leaderboard panel revamp       | next                |
| 5     | Motion and polish                          | pending             |
| 6     | Cross-viewport validation + docs           | pending             |

## Phase 3 (this run) — game mode shell revamp

**Files changed:** `src/style.css`, `src/ui/GameSelector.ts` (card markup:
emblem + body wrapper), `src/ui/CaseStudyPanel.ts` (copy refresh), plus this
file. No logic/scene/API/leaderboard-behavior changes; no canvas drawing
touched; `.game-root` client-box geometry untouched.

**What changed:**

- **Sidebar cards** (`GameSelector.ts` + CSS): each card gains an
  `aria-hidden` mini-emblem reusing the home hub's procedural
  `.home-logo--<id>` art, scaled 64→40px via `transform: scale(0.625)` (the
  interiors are pixel-positioned; the box is transformed, not resized).
  Markup is now emblem rail + `.card-body` stack; the bare `span` styling
  rescoped to `.card-sub` (the old `.game-card span` rule would have hit the
  new nested spans); the dead `min-height: 2.6em` reservation is gone
  (audit §0.6). Accessible names, `data-game-id`, and `.card-high` hooks all
  unchanged.
- **`Now playing` chip**: the `.is-active::after` text became a bordered
  marquee chip (`--quiet-fill` + `--trim`), pinned to grid column 2 so
  auto-placement can't drop it under the emblem rail.
- **Topbar identity (desktop only)**: the eyebrow is now a cabinet-marquee
  tag (chip treatment over the wordmark). This adds ~10px to the desktop
  topbar → the canvas row shrinks ~1.3% — `switching.spec` pixel signatures
  re-verified green (Lane Rush road has 42% threshold headroom).
- **Mobile topbar compaction** (audit §0.3): `h1` 1.15rem + hint 0.72rem at
  ≤899px — the brand now fits one line, the hint two; the canvas row grows
  and every landscape disjointness margin gets safer, never tighter. Copy
  pins untouched (metrics only).
- **Touch controls**: d-pad keys get the machined bevel language (pressed
  state keeps bevels + single glow); ACTION swaps the raw magenta slab for a
  top-lit `--action-hi/lo` gradient + inner rim + dark rim border
  (audit §0.4) — same grid cell, size, hold-repeat/single-shot mechanics,
  and `.is-pressed` class contract; pressed drops the gradient for a flat
  brighter face.
- **Case-study copy**: real counts (154 tests, eight Playwright suites) and
  a typographic apostrophe — verified unpinned by any spec before editing.

**Validation results (all green):**

- `npx playwright test shell switching games smoke home leaderboard
--project=desktop --project=mobile` → **98 passed / 30 skipped** (pixel
  signatures included, post-topbar-change).
- Full `npm run validate` → build + api tsc + Vitest 154 + lint/boundary/
  prettier + Playwright **103 passed / 33 skipped** (baseline counts).
- `tsc --noEmit` clean after the GameSelector markup change.

**Screenshots:** `output/ui-revamp/phase3/*.png` (desktop dark+light game,
mobile portrait, 667×375 landscape).

**Manual QA checklist (e2e covers the behaviors; eyeball these on a real
device/browser when convenient):**

- [ ] Desktop: each game starts from the sidebar; Back/Restart/theme work;
      NOW PLAYING chip + emblem identity reads; no scroll (e2e-pinned).
- [ ] Mobile: d-pad/ACTION feel (bevels/gradient render on device); game-over
      ACTION restart; landscape fit; no double-tap zoom (computed-style pin
      is green; real-device gesture worth one check).
- [ ] Themes: dark premium, light readable — both screenshot-verified
      headless; a quick device look closes the loop.

## Next task (Phase 4) — start cold here

Implement the **game-over + leaderboard panel revamp** per
`UI_REVAMP_SPEC.md` §10 (state matrix):

1. `src/style.css` `.leaderboard-panel` + `.lb-*` blocks: chamfered
   `--panel-2` body (inset glows only — clip-path clips outer shadows),
   `--trim` rule under the `GLOBAL LEADERBOARD` heading, mono scores/ranks
   (`--font-mono`), a faint amber left-edge tick on the `#1` row, success
   message accent, name input that never clips its placeholder (`min-width`
   chain; visual font-size, never copy).
2. Optional ≤5-line tweak in `src/ui/LeaderboardPanel.ts`: initial helper
   "Use 2–16 characters" in muted tone until the first `input` event
   (currently error-toned on open). Tests assert text, never `data-tone` —
   verify that stays true before and skip if the diff grows.
3. Frozen: DOM structure/classes, copy (trap 2 list), state machine, submit
   semantics, `textContent` rendering, dismissal events, TOP 10/5 limits,
   z-index 3, no layout height, ≥44px targets, `aria-live`.
4. Verify with the flag forced + route mocks only (never real API):
   `npx playwright test leaderboard --project=desktop --project=mobile`,
   plus `shell` (no-scroll with panel open) and `smoke` (flag-off console
   clean) → full `npm run validate` → screenshots (force
   `__ARCADE_LB_FORCE__`, synthetic `arcade-game-over` on Neon Serpent,
   mocked TOP rows — see the phase-0 screenshot script pattern) to
   `output/ui-revamp/phase4/` → commit only if green → update this file.

## Known constraints carried forward

- Home 375×667 slack +4px; mobile home height frozen.
- `.game-root` box-neutral rule; never touch `switching.spec` thresholds.
- Chamfer = inset shadows only; unstroked cut diagonals accepted (spec §4).
- Desktop topbar is now 10px taller (eyebrow chip) — signatures re-measured
  green this phase; don't add more desktop topbar height without re-running
  `switching`.
