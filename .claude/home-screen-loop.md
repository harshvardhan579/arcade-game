# Pocket Arcade — Home Screen Loop (pass 1)

You are executing a focused pass on branch `home-screen-pass-1` (from `main` after the
theme pass merged in `a45097e`). Read `CLAUDE.md` first and obey every hard rule.
`CURRENT_APP_STATE.md` is the system map; `NEXT_RUN.md` carries this pass's state.

**Mission:** a polished home screen / game hub — first load shows all five games as
selectable cards with **procedural CSS logos**; choosing one enters game mode; a Back
button returns home. No backend, no leaderboards, no image/SVG/font assets (Nano-Banana
references may inspire the logo designs externally, but nothing generated lands in the
repo), no gameplay changes.

## Execution contract

- **One phase per invocation.** Orient (git status, `NEXT_RUN.md`), execute the next
  incomplete phase, verify, commit if green, update `NEXT_RUN.md`, stop with a summary.
  Phases run 0 → 5. Phase 0 stops the pass if the architecture looks risky.
- Per phase: inspect → smallest coherent change → targeted tests → affected Playwright
  suites (both projects for shell changes) → full `npm run validate` when `src/main.ts`,
  `src/ui/*`, `src/core/*`, `src/style.css`, `index.html`, or specs change → commit only
  if green → update `NEXT_RUN.md` → stop.

## Ground truth and traps (verified 2026-07-06)

1. **The boot-flow trap (the big one).** Today `main.ts` calls `startGame('neon-serpent')`
   at boot and **all 18 bridge waits across the six specs** assume a scene publishes
   `window.__ARCADE__` immediately after `goto('/')`. A home-first boot breaks every
   suite at `beforeEach`. Migration strategy (Phase 1, same slice as the mode change):
   - Add a **`?game=<id>` deep link** in `main.ts` (validated against the registry;
     invalid/absent → home). It composes with the existing `?seed=N` param.
   - Migrate the game-flow suites' `beforeEach`/`goto` calls to
     `/?game=neon-serpent` (bit-identical in-game behavior; tests that navigate to a
     specific game keep their own flow). New home tests use plain `/`.
   - Publish a **home bridge stub** at boot and on Back
     (`activeScene: 'home'`, `getState()` → minimal snapshot) so mode is assertable
     and no spec ever waits on a bridge that never comes.
2. **Phaser auto-start trap.** With `scene: [Neon, …]` in the config, Phaser auto-starts
   the first scene — a home-first boot must prevent that. Options (Phase 0 decides):
   register scenes inactive (`scene: []` in config + `game.scene.add(key, Class, false)`)
   or **construct the Phaser.Game lazily on first game selection** (preferred: home
   loads without Phaser running; also skips wasted canvas work). Trap inside the trap:
   `new Phaser.Game` reads `gameRoot.clientWidth` — a `display: none` stage measures 0,
   so construct only while the stage is visible (or defer until after mode flip).
3. **Game mode stays as-is.** `CLAUDE.md` pins the desktop three-column identity
   (selector / stage / case-study). Home is a **new alternate view** (`.home-screen`),
   shown/hidden via a mode attribute (e.g. `.arcade-shell[data-mode='home'|'game']`,
   mirroring the theme-attribute pattern); game mode keeps the sidebar selector,
   picker, Restart, toggle, touch controls — so the in-game test surface is untouched
   once suites deep-link in.
4. **Hook collisions:** `smoke.spec.ts` pins `.game-card` count = 5 and
   `highscore.spec.ts` pins `.game-card[data-game-id] .card-high` (sidebar). Home cards
   must use **distinct hooks** (`.home-card`, `.home-card [data-game-id]`,
   `.home-card-high`) with their own `arcade-high-score` subscription (reuse the
   `GameSelector` pattern/`formatHigh`). Never let hidden home cards double the counts.
5. **Tab-order pin:** desktop keyboard spec walks 6 tabs: cards ×5 → Restart. A Back
   button in game mode adds a tabbable control — either place it in DOM **after** the
   theme toggle, or (better UX: Back belongs before Restart visually) update the pinned
   order **deliberately in the same slice** with the commit message saying so. On the
   home screen define a fresh tab-order test (cards in registry order → toggle).
6. **Single-`h1` pin** (smoke, role query): hidden elements are excluded from the
   accessibility tree, so a home h1 + a game-mode h1 can coexist only if exactly one is
   rendered per mode — keep one `h1` in the DOM at a time or reuse the same element.
7. **Mobile topbar space:** the picker must survive in game mode (the mobile game-over
   spec drives it), and the portrait topbar is a `1fr auto` grid (picker spans, Restart
   - toggle row). Back joins that second row (three ≥44 px controls fit 375 px; verify
     with the same-row/no-overlap pins). The coarse-landscape overlay clearance is
     `minmax(104px, 1fr)` — re-verify the disjoint-from-topbar-controls assertion after
     adding Back (it may need more clearance; the landscape spec is the fail-first tool).
8. **Pixel signatures after home entry:** `switching.spec.ts` keeps its in-game sidebar
   cycle (game mode unchanged) **plus** gains at least one home → game entry asserting
   the entered game's signature (stacked-scene protection must cover the new path).
   Back must `game.scene.stop(currentSceneKey)` and null it — never stack; re-entering
   draws a fresh run seed (established Phase-1-of-gameplay-pass behavior).
9. **Do not touch browser history** (no pushState/popstate) in this pass — the Back
   button is an in-app control; the browser Back key keeps navigating pages. Document
   this as deliberate. `?game=` links are static-deploy-safe (no router, Vercel ✓).
10. **Preserved contracts:** theme tokens/toggle (home must be readable in both themes
    — build logos from theme tokens; `colorScheme: 'dark'` Playwright pin stays),
    deterministic seeds + `__ARCADE_FIXED_SEEDS__` forcing, no-scroll geometry pins
    (desktop ×4, portrait ×6, landscape ×3 — home must also fit without scroll),
    `touch-action` pins, focus-ring `2px solid`, reduced motion (any home-card
    animation gated), zero assets, import boundary (`window` word-ban in src tests).

## Phase 0 — Home screen design audit (analysis only)

- Re-verify every pin above against current specs (grep; they move).
- Decide and write into `NEXT_RUN.md`: mode-state owner (recommend: `main.ts` owns the
  mode + a small shell API, matching how it owns `startGame`); lazy vs inactive Phaser
  construction (measure the `display:none` sizing risk); Back placement + tab-order
  decision; home layout (responsive card grid; desktop ~2-3 columns, mobile 1-2;
  within the no-scroll budget at 375×667 — five cards + header must fit, so size
  cards accordingly or make the home view the one deliberately scrollable surface —
  **decide explicitly**; if scrollable, scope the no-scroll pins to game mode and
  document that home is exempt by design).
- Sketch each procedural logo (CSS-only recipe per game: gradients, borders,
  pseudo-elements, clip-path, text glyphs; theme-token colors with per-game accents).
- Define acceptance criteria (home-first boot, selection, Back, no stacking, highs on
  cards, both themes, both form factors, full validate green).
- **Stop after the audit**; stop the pass entirely if risk is unclear.

## Phase 1 — Home mode shell architecture

- App mode `home | game`: attribute-driven visibility; boot shows home (no scene runs,
  no Phaser work); `?game=<id>` deep-links straight to game mode; selection from home
  calls the existing `startGame`; **Back** stops the scene, nulls `currentSceneKey`,
  republishes the home bridge stub, and returns to home.
- Keep Restart/high-score events/theme toggle/mobile controls working in game mode
  (they're untouched if game mode's DOM stays as-is).
- **Same slice:** the spec migration (trap 1) — deep-link gotos in
  games/shell/smoke/switching/highscore/audio; keep every assertion identical.
- New tests: initial load is home (mode attribute + `activeScene: 'home'` + no canvas
  running); selecting a card enters the game (bridge publishes, scene ticks); Back
  returns home (scene stopped — assert via bridge/mode, and no `console.error`);
  re-selecting a different game works (fresh run, correct scene).
- Full validate.

## Phase 2 — Procedural logos and home cards

- `.home-card` per game: emblem (pure CSS per the Phase 0 recipes), title, subtitle,
  one-line hook, live local high (`.home-card-high`, `arcade-high-score` subscription,
  `High —` empty state). Mouse/keyboard/touch operable (real `<button>`s), focus ring
  group membership, `touch-action: manipulation`, hover/pressed states, both themes
  (token-driven), reduced-motion-gated any decoration.
- Desktop and mobile layouts per the Phase 0 decision; verify at 1440×900 + 375×667 +
  landscape by screenshot (both themes).
- Tests: five home cards with accessible names; highs render and live-update on the
  home screen; keyboard tab order on home; mobile fit per the scroll decision.

## Phase 3 — Game mode polish (Back button)

- Back in the topbar per the Phase 0 placement decision: accessible name ("Back to
  games" or similar), ≥44 px on touch layouts, quiet styling that doesn't compete with
  Restart, both themes. Restart and Back visually and semantically distinct.
- Mobile: verify the topbar row fits three controls at 375 px and the landscape
  overlay still clears the (possibly wider) actions row — the disjointness assertion
  is the guard; re-measure the clearance row if it trips.
- No history hijack (trap 9). No-scroll pins re-run.

## Phase 4 — Tests and regression sweep

- Re-run/extend: shell, smoke, switching (incl. the new home-entry signature check),
  highscore (sidebar cards + home cards), theme suite on home (toggle works from the
  home screen — add the assertion), games deep-link flows, audio (listener counts
  across home↔game cycling — extend the cycle to include Back).
- New coverage checklist from the pass spec: home initial state, home tab order, game
  selection, Back, home-card highs, theme-on-home, mobile home fit.
- Flake pass `--repeat-each=2` on shell + smoke + switching (mode state is new global
  state), both projects. Full validate.

## Phase 5 — Docs and close

- README (home screen + deep link + Back), CURRENT_APP_STATE.md (flow, architecture,
  coverage), CLAUDE.md architecture notes (mode invariant: boot is home-first, scenes
  never auto-start, Back stops scenes, `?game=` deep link, new protected hooks
  `.home-card`/`.home-card-high`/Back's accessible name).
- `NEXT_RUN.md`: final state, commit table, validation, manual phone QA (home fits and
  scrolls-or-not per decision, card taps, Back reachability, theme toggle on home,
  landscape Back/ACTION disjointness), merge recommendation.
- Fresh full `npm run validate`; commit only if green; stop with push/PR commands.

## NEXT_RUN.md protocol (every phase)

Overwrite, keep short: phase table, what changed, commands + results, deliberately
updated pins (old → new, why — expected this pass: the goto migration, possibly the
desktop tab order, possibly a scoped no-scroll pin), screenshot paths, next task
specific enough to start cold. Never leave the repo red without documenting the exact
failure; revert the slice instead.
