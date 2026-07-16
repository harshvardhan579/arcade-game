# Pocket Arcade — UI Revamp Loop (pass 1)

You are executing a focused visual revamp pass on branch `ui-revamp-pass-1` (from
`main` — orient with `git status` first). Read `CLAUDE.md` first and obey every hard
rule. `CURRENT_APP_STATE.md` is the system map; `NEXT_RUN.md` carries this pass's
state; Phase 0 produces the design spec (`UI_REVAMP_SPEC.md`) that later phases
implement — deviations from it must be recorded there with a reason.

**Mission:** a complete visual UI revamp — the shell should feel like a **premium
neon arcade cabinet** — while gameplay, scoring, seeds, the leaderboard, every test,
mobile playability, and the zero-runtime-asset constraint are all preserved exactly.

## Design direction

Aim for:

- dark cabinet shell as the identity; cyan / amber / magenta accents used sparingly
  and with hierarchy (cyan = interactive/player, amber = scores, magenta = action),
- chamfered/beveled panels (CSS `clip-path` / borders / gradients — no images),
- scoreboard typography: system **monospace** stacks (`ui-monospace`, Menlo, …),
  `font-variant-numeric: tabular-nums`, letter-spacing, uppercase micro-labels,
- a subtle CRT/scanline feel (the `.game-root::after` scanline overlay is the seed
  of this identity — extend the language, never make it noisy),
- polished game-selection cards (home + sidebar) with clear hover/focus/active/
  now-playing states and procedural emblems,
- a better game-over + leaderboard panel presentation,
- cleaner, more deliberate mobile controls,
- stronger visual hierarchy and recruiter-demo polish everywhere.

It must **not** become: a generic SaaS dashboard, a childish pixel-art toy, a
Cyberpunk 2077 UI clone, an asset-heavy template, or unreadable neon chaos
(contrast and calm beat glow — WCAG targets hold in both themes).

External references (conceptual only — never copy assets or add dependencies):
Game UI Database / Interface In Game for screen-flow and UI-state inspiration;
Phaser examples for canvas interaction/layout patterns only; RexUI as inspiration
for in-canvas composition (do **not** add it); cyberpunk-css / Uiverse cyberpunk
components as CSS panel/button visual inspiration only.

## Hard rules for this pass

- **No external runtime assets** — no image/font/audio files in `src/` or
  `public/`, no webfonts/`@font-face`, no remote URLs, and no data-URI images/SVG
  (they are assets in disguise). Everything is CSS + system fonts + existing
  procedural canvas rendering.
- No UI framework, no new runtime npm dependencies.
- No gameplay-mechanic changes, no score-rule changes, no `*Logic.ts` edits, no new
  `SeededRandom` draws.
- Never break the leaderboard: flag-off = zero `/api` + zero leaderboard DOM;
  flag-on behavior, copy contracts, and `textContent`-only rendering stay intact.
- Never expose secrets; `grep -ri supabase dist/` stays empty after build.
- Never weaken or delete tests — especially the pixel-signature suite
  (`tests/switching.spec.ts`). Pins may move only deliberately, with the old → new
  value and reason recorded in the commit and `NEXT_RUN.md`.
- Never break: mobile no-scroll fit (portrait + coarse landscape), the desktop
  three-column no-scroll layout, dark/light theme behavior (including first-paint
  resolution in `index.html`), or the static Vercel deploy.
- Local high scores (`pocket-arcade:<id>:high`) and the global leaderboard keep
  working end to end.

## Execution contract

- **One phase per invocation.** Orient (git status, `NEXT_RUN.md`,
  `UI_REVAMP_SPEC.md` once it exists), execute the next incomplete phase, verify,
  commit if green, update `NEXT_RUN.md`, stop with a summary. Phases run 0 → 6.
  **Phase 0 is audit/spec only — it must not change `src/` at all.**
- Per phase: inspect → smallest coherent change → targeted suites (both Playwright
  projects for any shell/CSS change) → full `npm run validate` when `src/style.css`,
  `index.html`, `src/main.ts`, `src/ui/*`, `src/core/*`, or specs change → commit
  only if green → update `NEXT_RUN.md` → stop.
- Run `npx prettier --write` on every new/edited file (lint runs
  `prettier --check .`, which covers markdown too).
- Subagents when the task matches: `ux-polish-auditor` (Phase 0 audit),
  `phaser-renderer` (only if any in-canvas work is approved), `test-quality-guardian`
  (test additions/impact), `performance-guardian` (Phase 5/6 effect budgets).

## Ground truth and traps (verified 2026-07-14 against the live source)

1. **Protected DOM hooks — restyle, never rename or reparent.** Tests select:
   `.arcade-shell` (+ `data-mode='home'|'game'`), `.home-screen`,
   `.home-card[data-game-id]`, `.home-card-high` > `.hs-local` + `.hs-world`,
   `.home-logo` (+ `--<id>` variants), `.game-card[data-game-id]`, `.card-high`,
   `.selector`, `.controls-hint`, `.eyebrow`, `.topbar`, `.topbar-actions`,
   `.mobile-game-picker`, `.mobile-game-select` (+ `option[value=<id>]`),
   `.theme-toggle` (matched as `.topbar .theme-toggle` AND
   `.home-screen .theme-toggle` — it exists in both places),
   `.back-button` (accessible name **"Back to games"**), `.restart-button`
   (accessible name **"Restart"**), `#game-root` / `.game-root` +
   `#game-root canvas`, `.touch-controls`, `.touch-button`,
   `[data-arcade-input="UP|DOWN|LEFT|RIGHT|ACTION"]`, `.is-pressed`, `.is-active`,
   and the whole leaderboard family: `.leaderboard-panel` + `.is-open`, `.lb-name`,
   `.lb-submit`, `.lb-retry`, `.lb-edit`, `.lb-saved-name`, `.lb-message`
   (+ `data-tone`), `.lb-list-heading`, `.lb-list-rows`, `.lb-list-status`,
   `.lb-row`, `.lb-rank`, `.lb-row-name`, `.lb-row-score`. Flag-off DOM checks use
   `[class*="leaderboard" i]` — never add a static element whose class contains
   "leaderboard" to the always-on shell.
2. **Pinned copy — changing any of it means updating the spec in the same slice,
   deliberately.** The `h1` text `Pocket Arcade` (asserted `:visible` in both
   modes); the per-game `controls` / `controlsTouch` strings in `src/main.ts`
   (asserted verbatim, e.g. `← → change lanes · double-tap Space = boost`);
   `formatHigh` output (`High —` / `High 777`) on cards, picker options
   (`Neon Serpent · High 777`), and highscore specs; the World fragment format
   `· World 12,340` (`toLocaleString('en-US')`); leaderboard copy — `TOP 10`/`TOP 5`
   headings, `Ranked #N worldwide · Best N`, `Best for NAME is N`,
   `Too many submissions…`, `…reach the leaderboard`, `Use 2–16 characters`,
   `…isn't allowed`, `No scores yet — be the first`, `Global scores unavailable`.
   The in-canvas `GAME OVER` overlay and HUD line live in `BaseGameScene`, not CSS.
3. **Computed-style pins in `tests/shell.spec.ts`:** focus ring = `outline` `2px`
   `solid` on the focused element (keep `--focus-ring` and the 2px outline rule);
   `.arcade-shell` `min-height` resolves to **`0px`** on mobile (the iOS svh fix);
   `touch-action` contract — `manipulation` computed on `html`/`body`/`#app` and
   tappable shell controls, `none` on `.game-root` and `.touch-controls`;
   `theme-color` meta flips between `#071114` (dark) and `#e9f1f1` (light);
   no-scroll = `scrollHeight − innerHeight === 0` at four desktop and six portrait
   and three landscape viewports, home and game modes; bounding-box disjointness
   (touch buttons vs canvas vs Restart/picker/toggle) and ≥44 px touch targets.
   Theme CSS must never touch `touch-action`, focus-ring width/style, or layout
   properties (CLAUDE.md invariant).
4. **Tab order is pinned:** game mode desktop = five `.game-card`s → Back → Restart
   → theme toggle (DOM order in `ArcadeShell.ts` enforces it — the toggle is
   appended last on purpose). New focusable elements enter deliberately with the
   keyboard spec updated in the same slice, or not at all.
5. **`.game-root` geometry feeds the pixel-signature thresholds.** The Phaser
   canvas sizes from `.game-root`'s client box (RESIZE scale). Changing its
   border width, padding, aspect handling, or row sizing changes canvas pixel
   counts in `tests/switching.spec.ts` (Lane Rush road ≈ 114k px > 80k threshold on
   the desktop canvas). Keep the cabinet's inner box geometry stable; if a bezel
   redesign changes it, re-run `switching.spec.ts` (desktop) and re-measure
   deliberately — never loosen a threshold to "make it fit".
6. **The canvas stays out of scope.** The cabinet screen base (`.game-root`
   background, Phaser `backgroundColor`, and `renderState`'s clear color) is
   literally `#071114` in both themes and pinned by pixel signatures — do not
   change it or any in-canvas rendering color. Shell polish is DOM/CSS; the
   scanline/CRT feel lives in DOM overlays (`.game-root::after` z-index 2,
   `pointer-events: none`), never in scenes. The leaderboard panel is z-index 3
   inside `.game-root`; touch controls overlay at z-index 3 in landscape — keep
   the stacking contract if adding new overlay layers.
7. **Theme literals are duplicated on purpose** in `index.html`'s inline head
   script and `ThemeToggle.applyTheme` (`#071114` / `#e9f1f1`), plus the shell.spec
   meta assertions. If the page background hex ever changes, all of them move
   together in one slice — otherwise don't touch them. Storage key
   `pocket-arcade:theme` with values `light`/`dark` is a contract.
8. **Light theme survives the revamp.** Dark is the identity, but every new/changed
   token needs a `[data-theme='light']` counterpart with WCAG-checked contrast
   (current targets: body 13.2:1, muted 5.9:1, accent-text 5.4:1, focus 4.4:1).
   Never leave a hardcoded dark-only color on a themed shell surface — the
   theme-invariant literals are only the cabinet screen and the emblem tiles
   (documented as such in `style.css`).
9. **Home no-scroll geometry is law.** `.home-card-high` stays single-line
   (nowrap/ellipsis) so World fragments can never add card height; home must fit
   375×667 → 430×932 and desktop without scroll. Any card padding/emblem-size
   growth gets re-verified against `home.spec.ts` fit tests on both projects.
10. **Reduced motion is already global** — the `prefers-reduced-motion` block
    zeroes all animation/transition durations with `!important`. New motion must
    degrade to a sane static state at 0.001 ms (no infinite flashing keyframes, no
    motion that carries meaning without a static fallback). Decorative churn stays
    skippable; feedback (pressed states, focus) stays visible.
11. **Performance budget:** no `backdrop-filter` on large surfaces, no animated
    full-viewport gradients, no per-element multi-layer glow stacks on lists;
    prefer `transform`/`opacity` transitions (compositor-friendly). The app chunk
    is ≈13–19 kB gzip — CSS can grow, but keep it purposeful. `performance-guardian`
    reviews Phase 5.
12. **Leaderboard panel styling is flag-on-only work.** Drive it with
    `window.__ARCADE_LB_FORCE__` + `page.route` mocks (never a real API in CI);
    error-path specs deliberately skip console-cleanliness (Chromium logs failed
    HTTP). Functionality (single submit per run-end, Retry re-arm, dismissal on
    `arcade-run-start`/`arcade-go-home`, blur-on-submit, focused-input exemption in
    `InputManager`) is frozen — Phase 4 is presentation only.
13. **Shell controls blur after activation** (cards, select, Restart, Back, toggle,
    submit) so gameplay keys keep flowing — preserve every `.blur()` call when
    touching UI modules. `InputManager` ignores keys while
    `button/select/input/textarea/[contenteditable]` is focused; don't introduce
    focusable wrappers that break that.
14. **Playwright pins `colorScheme: 'dark'`** in `playwright.config.ts` — never
    remove it. Any shell/CSS change runs the affected suites on **both** projects
    (desktop + mobile).
15. **Repo quirks:** stray empty directories in the root (`added/`, `been/`, `by/`,
    `CLI/`, …) are leftovers — ignore them, don't "clean up" in this pass.
    `CaseStudyPanel` copy says "73 … tests" (stale, actual 154) and uses straight
    apostrophes — fixable in Phase 3 (no test pins case-study copy; verify first).

## Phase 0 — UI audit and design spec (no implementation)

- Inspect the current UI end to end: `src/style.css`, `index.html`, every
  `src/ui/*` module, `BaseGameScene` chrome (HUD/overlay — document, don't touch),
  and every `tests/*.spec.ts` for UI-coupled assertions. Screenshot the current
  state (desktop + mobile portrait + landscape, dark + light, home + game +
  game-over with the leaderboard panel forced) as the "before" record.
  Delegate the audit to `ux-polish-auditor` if useful.
- Write **`UI_REVAMP_SPEC.md`** (repo root, Prettier-formatted) with concrete,
  implementable sections:
  - visual language (the premium-neon-cabinet thesis, and the anti-goals),
  - color tokens (full dark + light table: current value → new value → contrast
    ratio → which selectors consume it),
  - typography scale (system stacks only; display/label/body/score roles),
  - spacing scale and radii/chamfer rules,
  - panel/card/button system (anatomy + all interaction states),
  - motion rules (durations, easings, what animates, reduced-motion fallbacks),
  - desktop layout, mobile portrait layout, mobile landscape layout (with the
    no-scroll and geometry constraints restated as acceptance criteria),
  - game-over + leaderboard panel layout (all states: entry/saved/submitting/
    success/failure/retry/list loading/empty/unavailable),
  - accessibility rules (contrast, focus, targets, aria, keyboard order),
  - reduced-motion rules,
  - **test impact map**: every pinned selector/copy/computed-style/geometry from
    the traps above → which phase touches it → expected test outcome (unchanged /
    deliberately updated with reason).
- Identify fragile tests/selectors beyond the traps list, and an explicit
  **must-not-change** list (canvas colors, `.game-root` inner geometry, tab order,
  copy contracts, touch-action map, theme meta hexes).
- Update `NEXT_RUN.md` with this pass's phase table and the Phase 0 verdict.
- **Stop after Phase 0. Do not implement.**

## Phase 1 — Design tokens and base shell polish

- Refactor/expand the CSS custom-property system in `src/style.css` per the spec:
  a complete token layer (color, spacing, radius, type, shadow/glow, motion) with
  dark defaults and light overrides — dark output should stay near-identical or
  deliberately improved, never accidentally shifted.
- Improve the global background (cabinet-room ambience), the `.game-root` bezel
  framing, the topbar hierarchy, and the base button/panel treatments
  (chamfer/bevel language starts here).
- Preserve every selector, copy pin, computed-style pin, and `.game-root` inner
  geometry (trap 5). No gameplay/canvas changes. No new focusables.
- Verify: `npx playwright test shell home smoke --project=desktop --project=mobile`,
  then full `npm run validate`. Screenshot after-states (both themes).

## Phase 2 — Home screen revamp

- Rework the home hub per spec: header/tagline hierarchy, card anatomy, richer
  procedural CSS emblems (still pure CSS, still theme-invariant dark tiles),
  high/World score line presentation, hover/focus/active/touch states.
- Preserve: no-scroll fit desktop + all portrait sizes (home.spec), single-line
  `.home-card-high`, `.hs-local`/`.hs-world` split and the exact World fragment
  text, `data-game-id` hooks, card → `arcade-select-game` + blur behavior,
  the home theme toggle.
- Add/adjust tests only as needed (e.g. an emblem-presence or state-class check);
  never weaken existing ones.
- Verify: `home` + `shell` + `smoke` suites both projects → full validate.

## Phase 3 — Game mode shell revamp

- Improve the game-mode chrome per spec: topbar hierarchy (title/eyebrow/hint),
  Back/Restart/theme-toggle treatment, the mobile picker, and the HUD-adjacent
  cabinet chrome **around** the canvas (bezel, scanline overlay refinement,
  ambient glow) — all DOM/CSS, zero in-canvas changes (trap 6).
- Improve mobile controls visually (button anatomy, pressed glow, d-pad/action
  distinction) without altering: grid geometry contracts (disjointness pins),
  ≥44 px targets, `touch-action`, `.is-pressed` mechanics, hold-to-repeat timing,
  or single-shot ACTION.
- Preserve `InputManager` focus behavior and the pinned tab order (trap 4).
  Case-study panel polish (typographic apostrophes, current test counts) is in
  scope — verify no spec pins that copy first.
- Verify: `shell` + `switching` + `games` + `smoke` suites (switching catches any
  accidental canvas-geometry drift) → full validate.

## Phase 4 — Game-over and leaderboard panel revamp

- Restyle `LeaderboardPanel` per spec: panel chrome, name entry, submit states,
  top list rows, empty/error/loading states, saved-name row — presentation only;
  the state machine, copy contracts (trap 2), `textContent` rendering, and event
  contracts are frozen. No API changes (unless a tiny compatibility fix is truly
  necessary — record it).
- Consider light-touch DOM chrome for the game-over moment (e.g. panel framing) —
  but the `GAME OVER` overlay itself is canvas text in `BaseGameScene`; leave it.
- Preserve accessibility (aria-live message, labels, focus rings, ≥44 px) and the
  mobile fit (panel stays inside `.game-root`, no page scroll, TOP 5 coarse).
- Verify: `leaderboard` suite both projects (flag forced + mocks), `shell`
  no-scroll, `smoke` flag-off console-clean → full validate.

## Phase 5 — Motion and polish

- Add small CSS-only transitions/keyframes per the spec's motion rules: hover/
  pressed/selected states, panel-open ease, subtle glow pulses — respecting the
  global reduced-motion kill switch (trap 10) and the performance budget
  (trap 11). No JS animation loops, no DOM animation of gameplay-critical
  feedback, no layout-thrashing properties (stick to transform/opacity/filter on
  small surfaces).
- Add tests if useful (e.g. reduced-motion computed-duration pin), never required
  churn for its own sake.
- Verify: full validate + a manual dev-server pass on low-motion settings; ask
  `performance-guardian` to review the effect budget.

## Phase 6 — Cross-viewport validation and docs

- Fresh full `npm run validate` (build + api tsc + Vitest + lint/boundary/prettier
  - Playwright both projects).
- Flake sweep: `npx playwright test home shell leaderboard smoke --repeat-each=2`
  (both projects) — must be clean.
- Confirm: `grep -ri supabase dist/` empty; no new files in `src/`/`public/` that
  are assets; bundle sizes recorded (app chunk before/after).
- Screenshot the after-state matrix (desktop/portrait/landscape × dark/light ×
  home/game/game-over+panel) and note paths in `NEXT_RUN.md`.
- Docs: `README.md` (visual identity blurb if warranted), `CURRENT_APP_STATE.md`
  (UI sections rewritten to match reality), `UI_REVAMP_SPEC.md` (marked
  implemented-with-deviations), `CLAUDE.md` only if an invariant genuinely moved,
  `NEXT_RUN.md` final summary.
- Stop with push/PR instructions (`git push -u origin ui-revamp-pass-1`, PR title,
  and a review checklist) — do not push or open the PR yourself.

## NEXT_RUN.md protocol (every phase)

Overwrite, keep short: phase table, what changed, commands + results, deliberately
updated pins (old → new, why), screenshot evidence paths, next task specific enough
to start cold. Never leave the repo red without documenting the exact failure;
revert the slice instead.
