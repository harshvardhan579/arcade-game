# NEXT_RUN — Home Screen Pass (branch `home-screen-pass-1`)

Loop: `.claude/home-screen-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                   | Status              |
| ----- | --------------------------------------- | ------------------- |
| 0     | Design audit + decisions (analysis)     | done (`33e9dec`)    |
| 1     | Home mode architecture + spec migration | **done** (this run) |
| 2     | Procedural logos + home cards           | next                |
| 3     | Game-mode polish (Back)                 | pending             |
| 4     | Tests and regression sweep              | pending             |
| 5     | Docs and close                          | pending             |

## Phase 1 (this run) — what changed

- **Mode architecture:** `data-mode="home" | "game"` on `.arcade-shell`; `main.ts` owns
  it. Boot shows the home hub with **zero Phaser work and no canvas** — the engine is
  constructed lazily on first selection (`scene: []` + `scene.add(key, Class,
autoStart)`; mode flips to `game` first so `clientWidth` measures a visible stage).
  `?game=<id>` deep-links straight to game mode (validated; invalid → home; composes
  with `?seed=`). A home bridge stub (`activeScene: 'home'`) publishes at boot and on
  Back so mode is always assertable. Browser history untouched.
- **Back:** `‹ Games` (`.back-button`, accessible name "Back to games") in the topbar
  between picker and Restart; stops the scene, nulls the key (no stacking),
  republishes the stub, flips mode. Quiet accent styling; 44 px on touch layouts;
  mobile portrait topbar row 2 is now `auto 1fr auto` (Back, Restart, toggle — zero
  added height).
- **Home hub (`src/ui/HomeScreen.ts`):** header (own `h1` + tagline + a second
  theme-toggle instance) + five functional `.home-card` buttons dispatching
  `arcade-select-game`. Plain by design — emblems/hooks/highs are Phase 2.
- **Theme toggle resync:** `applyTheme` broadcasts `arcade-theme`; every toggle
  instance resyncs its accessible name (verified e2e: toggling on home relabels the
  game-mode instance).
- **Spec migration (all six suites):** nine `goto('/')` sites → `/?game=neon-serpent`
  (bit-identical in-game behavior; every seeded pin held unchanged).
  **Deliberate pin updates:** desktop tab order is now cards ×5 → **Back** (6) →
  Restart (7) — and the follow-up `Shift+Tab` in that test needed **two** hops so
  Enter re-activates the last card instead of triggering Back; theme-toggle locators
  scoped to `.topbar .theme-toggle` (two instances exist); smoke's `h1` assertion
  scoped to `h1:visible` (one heading renders per mode); the landscape chrome
  disjointness list gains `.back-button` (did **not** trip — three controls fit).
- **New `tests/home.spec.ts` (6 tests):** home-first boot (five cards, zero canvas,
  hidden Back, no errors); select → Back → re-select flow; deep links valid+invalid;
  theme toggle from home incl. cross-instance resync; mobile home no-scroll fit at
  375×667 + 667×375 with every card in-viewport.

### Phase 1 validation

- `tests/home.spec.ts`: 9 passed / 1 intentionally skipped, first run.
- Full Playwright: **53 passed / 31 intentionally skipped** (was 44/30; +9/+1 home).
- Full `npm run validate`: build + strict tsc, 73 Vitest, lint + boundary + Prettier,
  Playwright 53/31. Screenshots: home hub (dark desktop, light mobile), game mode
  with Back (scratchpad `home-*.png`).

## Phase 0 — design decisions (no code changed this phase)

**Risk gate: PROCEED.** The boot-flow migration is large but mechanical (18 bridge
waits move to a `?game=` deep link with bit-identical in-game behavior), and every
other pin has a concrete owner below.

### Architecture

- **Mode owner: `main.ts`** (it already owns `startGame`/`currentSceneKey`). Mode is a
  `data-mode="home" | "game"` attribute on `.arcade-shell` (theme-attribute pattern);
  a `setShellMode` helper lives in `ArcadeShell`. Home cards dispatch the existing
  `arcade-select-game` event; a new `arcade-go-home` event drives Back. Browser
  history untouched (deliberate — in-app Back only).
- **Phaser is constructed lazily on first game selection** with `scene: []` +
  `game.scene.add(key, Class, autoStart)` per game (auto-start only the requested
  scene; adds queue safely pre-boot). Home boots with **zero Phaser work and no
  canvas** (`#game-root canvas` count 0 is a home assertion). Mode flips to `game`
  **before** construction so `gameRoot.clientWidth` measures a visible stage
  (synchronous style recalc on read).
- **Back:** `game.scene.stop(currentSceneKey)`, null the key, republish the home
  bridge stub (`publishBridge('home', …minimal snapshot…)`), flip mode. Re-selecting
  any game starts fresh (run-seed behavior unchanged). No scene stacking — the
  switching spec gains a home-entry signature check in Phase 4.
- **Deep link:** `?game=<id>` validated against the registry (invalid/absent → home);
  composes with `?seed=N`. Static/Vercel-safe (query param, no router).

### Home layout (no-scroll decision: home fits, no scroll anywhere)

- `.home-screen` is a shell-level sibling of selector/stage/case-study; mode CSS shows
  exactly one surface set. Desktop/landscape: responsive card grid
  (`auto-fit minmax(~240px, 1fr)` → 2–3 columns). Portrait phones: single-column
  compact rows (logo left ~56px, text right) — five cards + header ≈ 500 px fits
  375×667. Landscape phones: 2 columns × 3 rows. **Home honors the no-scroll contract
  at all pinned viewports** (tested); revisit deliberately in Phase 2 if emblems need
  more room.
- Home header: its own `h1` "Pocket Arcade" + tagline + a **second theme-toggle
  instance**. Single-`h1` pin holds because role queries exclude `display: none`
  elements (one heading rendered per mode). Two `.theme-toggle` instances require:
  (a) `applyTheme` broadcasts an `arcade-theme` event and every toggle instance
  resyncs its accessible name (otherwise the hidden one goes stale — real bug), and
  (b) the existing theme specs scope their locator to the visible instance —
  a deliberate, documented spec update in Phase 1.

### Back button (game mode only)

- First in `.topbar-actions` (before picker/Restart in DOM). Label `‹ Games`,
  accessible name **"Back to games"**, class `.back-button`, quiet styling
  (control tokens), ≥44 px on touch layouts, hidden on home via mode CSS.
- **Deliberate tab-order pin update (Phase 1, same slice):** desktop order becomes
  cards ×5 → **Back** (6) → Restart (7); the keyboard spec walks 7 tabs. Mobile
  portrait topbar row 2 becomes `auto 1fr auto` (Back, Restart, toggle — three ≥44 px
  controls fit 375 px; the same-row pin extends to Back). Landscape: the
  disjoint-from-topbar-controls assertion is the guard; bump the 104 px overlay
  clearance only if it trips.

### Spec migration (Phase 1, same slice — assertions unchanged unless noted)

- `goto('/')` → `goto('/?game=neon-serpent')` in the beforeEach of games/shell/smoke/
  switching/highscore/audio (18 bridge waits keep resolving; in-game behavior
  bit-identical). New home coverage lives in a new `tests/home.spec.ts` using `/`.
- Deliberate pin updates: keyboard tab order (+Back), theme-spec toggle locators
  scoped to the visible instance. Nothing else changes.
- Hook separation: home cards use `.home-card` / `.home-card-high` (never
  `.game-card` — smoke pins the sidebar count at 5).

### Procedural logo recipes (Phase 2; pure CSS, theme tokens + per-game accents)

| Game           | Emblem recipe (all CSS shapes/gradients/pseudo-elements)                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neon Serpent   | Cyan rounded-square "grid" tile; ::before = 3-segment snake (stepped linear-gradient stripe with rounded caps), ::after = magenta food dot with glow shadow                     |
| Bounce Circuit | Ground strip (border-bottom) + cyan rounded runner square mid-jump; ::before = amber orb (circle + glow), ::after = red spike (CSS triangle via clip-path/borders)              |
| Star Courier   | Cyan triangle ship (clip-path) bottom-center; ::before = white projectile bar above the nose; ::after = starfield dots (multi-position box-shadow)                              |
| Lane Rush      | Road trapezoid (clip-path polygon, `#0d252b`-token fill) with center dash (dashed border gradient); ::before = cyan car rounded-rect low, ::after = amber boost flame triangles |
| Circuit Stack  | Grid tile backdrop (repeating-linear-gradient strokes); ::before = magenta T/S tetromino (two stacked offset rects via box-shadow), ::after = ghost outline square below        |

All emblems sit in a fixed-ratio `.home-logo` box, colors via tokens (`--cyan`,
`--pink`, `--yellow`, `--red`, card surfaces) so both themes work; glows via
box-shadow only; no images/SVG/fonts; decorative motion (if any) reduced-motion-gated.

### Acceptance criteria

1. First load (`/`) shows home: five cards, header, working theme toggle, **no canvas,
   no Phaser boot**, `activeScene: 'home'`.
2. Selecting a card enters game mode: correct scene publishes and ticks; sidebar/
   picker/Restart/toggle/touch controls all work exactly as today.
3. Back returns home: scene stopped (no stacking), bridge stub restored; re-selecting
   the same or another game starts a fresh run.
4. `?game=<id>` deep-links to game mode (invalid → home); `?seed=` still composes.
5. Home readable in both themes, fits without scroll at all eleven pinned viewports,
   keyboard-operable with visible focus; high scores on cards live-update (Phase 2).
6. All suites green with the migration; pixel signatures prove home-entered games
   render; full `npm run validate` + flake pass green at close.

## Next task (Phase 1 — start cold from the loop file)

Implement the mode architecture + Back + deep link + home bridge stub + minimal
functional home cards (plain buttons; logos/highs are Phase 2), the `arcade-theme`
resync broadcast, mode CSS, and the full spec migration with the two deliberate pin
updates. New `tests/home.spec.ts`: home-first boot, select, Back, re-select. Full
validate.
